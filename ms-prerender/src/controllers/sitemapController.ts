import { Router } from 'express';
import axios from 'axios';
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
sitemapController.get('/:url/html/snapshots', async (req, res) => { await Ctrl.htmlSnapshots(req, res); });
sitemapController.get('/:url/html', async (req, res) => { await Ctrl.html(req, res); });
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

  public static async html(req: any, res: any): Promise<void> {
    const siteName = decodeURIComponent(req.params.url);
    try {
      const doc = await SitemapDao.getByUrl(siteName);
      if (!doc) { res.status(404).json({ error: 'Sitemap not found' }); return; }
      const raw: any[] = Array.isArray(doc?.urls) ? doc.urls : (doc?.sitemap?.urlset?.url || []);
      const urls: string[] = raw.map((u: any) => Array.isArray(u?.loc) ? u.loc[0] : u?.loc).filter((u: any) => typeof u === 'string' && !!u);
      const limit = Math.max(1, Math.min(+(req.query.limit || 25), urls.length));
      const conc = Math.max(1, Math.min(+(req.query.concurrency || 4), 16));
      const targets = urls.slice(0, limit);
      let i = 0;
      const results: any[] = new Array(targets.length);
      async function worker() {
        for (;;) {
          const idx = i++;
          if (idx >= targets.length) break;
          const u = targets[idx];
          try {
            const r = await axios.get(u, { responseType: 'text', timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            results[idx] = { url: u, status: r.status, html: r.data };
          } catch (e: any) {
            const status = e?.response?.status || null;
            const msg = e?.message || 'error';
            results[idx] = { url: u, status, html: null, error: String(msg) };
          }
        }
      }
      const workers = Array.from({ length: Math.min(conc, targets.length) }, () => worker());
      await Promise.all(workers);
      const snapshot = { siteName, createdAt: new Date().toISOString(), count: targets.length, pages: results };
      const saveFlag = String(req.query.save || '').toLowerCase();
      const shouldSave = saveFlag === 'true' || saveFlag === '1' || saveFlag === 'yes';
      if (shouldSave) {
        await SitemapDao.createHtmlSnapshot(snapshot);
      }
      res.json({ siteName, count: targets.length, pages: results, saved: shouldSave, savedAt: shouldSave ? snapshot.createdAt : null });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }


  public static async add(req: any, res: any): Promise<void> {
    try {
      const { url } = req.body;
      if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      // Génère des variantes avec et sans www pour améliorer la découverte
      const ensureUrl = (input: string) => {
        try { return /^https?:\/\//i.test(input) ? new URL(input) : new URL(`https://${input}`); }
        catch { return new URL(`https://${input}`); }
      };
      const base = ensureUrl(String(url).trim());
      const host = base.host;
      const withWww = host.startsWith('www.') ? host : `www.${host}`;
      const withoutWww = host.replace(/^www\./, '');
      const proto = base.protocol;
      const variants = Array.from(new Set<string>([
        `${proto}//${host}`,
        `${proto}//${withWww}`,
        `${proto}//${withoutWww}`,
      ]));

      // Tente chaque variante jusqu'au succès
      let sitemap: any | null = null;
      let used: string | null = null;
      for (const v of variants) {
        try {
          sitemap = await SitemapService.getSitemapFromUrl(v);
          used = v;
          break;
        } catch (e) {
          /* try next */
        }
      }

      if (!sitemap) {
        throw new Error('Sitemap not found');
      }

      // Sauvegarder dans la base de données
      await SitemapDao.create({
        siteName: url,
        fetchedAt: new Date().toISOString(),
        urls: sitemap.urlset.url.map((u: any) => ({
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
      const doc = await SitemapDao.getByUrl(siteName);
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
      const doc = await SitemapDao.getByUrl(siteName);
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

      const total = norm.length || 0;
      const withLastmod = norm.filter(n => !!n.lastmod).length;
      const completeness = total ? Math.max(0, Math.min(100, Math.round((withLastmod / total) * 100))) : 0;
      const goodFreqs = new Set(['always','hourly','daily','weekly','monthly']);
      const withFreq = norm.filter(n => !!n.changefreq).length;
      const goodFreqCount = norm.filter(n => n.changefreq && goodFreqs.has(String(n.changefreq).toLowerCase())).length;
      const freqQuality = withFreq ? Math.max(0, Math.min(100, Math.round((goodFreqCount / withFreq) * 100))) : 0;
      let recency = 0;
      if (lastmodLatest) {
        const days = (Date.now() - new Date(lastmodLatest).getTime()) / (1000*60*60*24);
        if (days <= 7) recency = 100;
        else if (days <= 30) recency = 85;
        else if (days <= 90) recency = 67;
        else if (days <= 180) recency = 50;
        else if (days <= 365) recency = 35;
        else recency = 20;
      } else {
        recency = 0;
      }
      const score = Math.max(0, Math.min(100, Math.round(0.5 * recency + 0.3 * completeness + 0.2 * freqQuality)));

      const payload = {
        siteName,
        totalUrls: norm.length,
        changefreqCounts,
        lastmodLatest,
        lastCrawl: doc?.fetchedAt || null,
        urlsSubmitted: norm.length,
        urlsIndexed: 0,
        score
      };

      res.json(payload);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  public static async htmlSnapshots(req: any, res: any): Promise<void> {
    const siteName = decodeURIComponent(req.params.url);
    try {
      const snaps = await SitemapDao.getHtmlSnapshots(siteName);
      res.json({ siteName, snapshots: snaps });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}

export default sitemapController;
