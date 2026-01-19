
import express from 'express';
import cors from 'cors';
import sitemapController from './controllers/sitemapController';
import SitemapDao from './dao/sitemapDao';
import 'dotenv/config';
import type { Request, Response } from 'express';

const app = express();
const port = Number(process.env.PORT) || 3000;

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const allowAll = corsOrigins.length === 0;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowAll) return callback(null, true);
    const o = String(origin).toLowerCase();
    if (o.startsWith('http://localhost:') || o.startsWith('http://127.0.0.1:')) return callback(null, true);
    if (corsOrigins.includes(o)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));
app.use(express.json());

// API base path
app.use('/api/sitemaps', sitemapController);

// Healthcheck
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/sitemap/:website', async (req, res) => {
  const siteName = decodeURIComponent(req.params.website);
  try {
    const doc: any = await SitemapDao.getByUrl(siteName);
    if (!doc) {
      res.status(404).json({ error: 'Sitemap not found' });
      return;
    }
    const raw: any[] = Array.isArray(doc?.urls) ? doc.urls : (doc?.sitemap?.urlset?.url || []);
    const urls = raw.map((u: any) => ({
      loc: Array.isArray(u?.loc) ? u.loc[0] : u?.loc,
      priority: Array.isArray(u?.priority) ? u.priority[0] : u?.priority,
      lastmod: Array.isArray(u?.lastmod) ? u.lastmod[0] : u?.lastmod,
      changefreq: Array.isArray(u?.changefreq) ? u.changefreq[0] : u?.changefreq,
    })).filter((x: any) => !!x?.loc);
    res.json({ siteName: doc.siteName || siteName, fetchedAt: doc?.fetchedAt || null, urls });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/sitemap/:website', async (req, res) => {
  const siteName = decodeURIComponent(req.params.website);
  try {
    const doc: any = await SitemapDao.getByUrl(siteName);
    if (!doc) {
      res.status(404).json({ error: 'Sitemap not found' });
      return;
    }
    const raw: any[] = Array.isArray(doc?.urls) ? doc.urls : (doc?.sitemap?.urlset?.url || []);
    const urls = raw.map((u: any) => ({
      loc: Array.isArray(u?.loc) ? u.loc[0] : u?.loc,
      priority: Array.isArray(u?.priority) ? u.priority[0] : u?.priority,
      lastmod: Array.isArray(u?.lastmod) ? u.lastmod[0] : u?.lastmod,
      changefreq: Array.isArray(u?.changefreq) ? u.changefreq[0] : u?.changefreq,
    })).filter((x: any) => !!x?.loc);
    res.json({ siteName: doc.siteName || siteName, fetchedAt: doc?.fetchedAt || null, urls });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${port}`);



});
