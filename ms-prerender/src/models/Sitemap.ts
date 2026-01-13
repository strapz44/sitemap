import mongoose from 'mongoose';

const urlSchema = new mongoose.Schema({
  loc: { type: String, required: true },
  priority: { type: String },
  lastmod: { type: String },
  changefreq: { type: String }
});

const sitemapSchema = new mongoose.Schema({
  siteName: { type: String, required: true, unique: true },
  lastFetched: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'error', 'processing'], default: 'active' },
  urls: [urlSchema]
});

export default mongoose.model('Sitemap', sitemapSchema);
