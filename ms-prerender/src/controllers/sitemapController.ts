import { Router } from 'express';
import SitemapService from '../services/SitemapService';
import SitemapDao from '../dao/sitemapDao';

const sitemapController: Router = Router();

// Routes
sitemapController.get('/', async (req, res) => { await Ctrl.getAll(req, res); });
// Create from body { url }
sitemapController.post('/', async (req, res) => { await Ctrl.add(req, res); });
// Refresh a given siteName
sitemapController.post('/:url/refresh', async (req, res) => { await Ctrl.post(req, res); });
// Delete by siteName in path
sitemapController.delete('/:url', async (req, res) => { await Ctrl.delete(req, res); }); // ✅ Attention au encodage côté client
// Summary for a given site
sitemapController.get('/:url/summary', async (req, res) => { await Ctrl.summary(req, res); });
// Get single sitemap doc
sitemapController.get('/:url', async (req, res) => { await Ctrl.getOne(req, res); });

// Contrôleur
class Ctrl {
  public static async getAll(req: any, res: any): Promise<void> {
    try {
      const data = await SitemapDao.get();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public static async add(req: any, res: any): Promise<void> {
    try {
      const { url } = req.body;
      if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      // Récupérer et parser le sitemap
      const sitemap = await SitemapService.getSitemapFromUrl(url);
      
      // Sauvegarder dans la base de données
      await SitemapDao.create({
        siteName: url,
        urls: sitemap.urlset.url.map(u => ({
          loc: u.loc[0],
          priority: u.priority?.[0],
          lastmod: u.lastmod?.[0],
          changefreq: u.changefreq?.[0]
        }))
      });

      res.status(201).json({ message: 'Sitemap added successfully' });
    } catch (error: any) {
      if (error.message === 'Sitemap not found') {
        res.status(404).json({ error: 'Sitemap not found' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  public static async delete(req: any, res: any): Promise<void> {
    const url = decodeURIComponent(req.params.url); // ✅ Ajouté ici pour corriger l'encodage
    console.log(">>> Suppression demandée pour :", url);

    await SitemapDao.deleteByUrl(url);
    return res.json({ message: `Sitemap pour '${url}' supprimé.` });
  }

  public static async post(req: any, res: any): Promise<void> {
    const url = decodeURIComponent(req.params.url); // ✅ aussi ici pour éviter les bugs
    const sitemapXml = await SitemapService.getSitemapFromUrl(url);
    const sitemapJson = await SitemapService.convertSitemapToJson(sitemapXml);

    await SitemapDao.deleteByUrl(url); // Supprime l’ancien, s’il existe

    const response = {
      siteName: url,
      fetchedAt: new Date().toISOString(),
      sitemap: sitemapJson
    };
    await SitemapDao.create(response);
    return res.json(response);
  }

  public static async getOne(req: any, res: any): Promise<void> {
    const siteName = decodeURIComponent(req.params.url);
    try {
      const all = await SitemapDao.get();
      const doc = all.find((d: any) => d.siteName === siteName);
      if (!doc) {
        res.status(404).json({ error: 'Sitemap not found' });
        return;
      }
      // Return the raw stored document for details view
      return res.json(doc);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  public static async summary(req: any, res: any): Promise<void> {
    const siteName = decodeURIComponent(req.params.url);
    try {
      const all = await SitemapDao.get();
      const doc = all.find((d: any) => d.siteName === siteName);
      if (!doc) {
        res.status(404).json({ error: 'Sitemap not found' });
        return;
      }

      // Normalize the list of URLs regardless of storage shape
      const rawUrls: any[] = Array.isArray(doc?.urls)
        ? doc.urls
        : (doc?.sitemap?.urlset?.url || []);

      const norm = rawUrls.map((u: any) => {
        const lastmod = Array.isArray(u?.lastmod) ? u.lastmod[0] : u?.lastmod;
        const changefreq = Array.isArray(u?.changefreq) ? u.changefreq[0] : u?.changefreq;
        return {
          lastmod: typeof lastmod === 'string' ? lastmod : undefined,
          changefreq: typeof changefreq === 'string' ? changefreq : undefined,
        };
      });

      // Compute latest lastmod
      let lastmodLatest: string | null = null;
      for (const n of norm) {
        if (!n.lastmod) continue;
        const t = new Date(n.lastmod).getTime();
        if (!isNaN(t)) {
          if (!lastmodLatest || t > new Date(lastmodLatest).getTime()) {
            lastmodLatest = new Date(t).toISOString();
          }
        }
      }

      // Compute changefreq counts
      const changefreqCounts: Record<string, number> = {};
      for (const n of norm) {
        if (!n.changefreq) continue;
        const k = String(n.changefreq).toLowerCase();
        changefreqCounts[k] = (changefreqCounts[k] || 0) + 1;
      }

      const payload = {
        siteName,
        totalUrls: norm.length,
        changefreqCounts,
        lastmodLatest,
        lastCrawl: doc?.fetchedAt || null,
      };

      res.json(payload);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}

export default sitemapController;
