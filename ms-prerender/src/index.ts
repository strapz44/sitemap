
import express from 'express';
import cors from 'cors';
import sitemapController from './controllers/sitemapController';
import 'dotenv/config';
import type { Request, Response } from 'express';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// API base path
app.use('/api/sitemaps', sitemapController);

// Healthcheck
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${port}`);



});
