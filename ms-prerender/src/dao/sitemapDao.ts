import { MongoClient, ServerApiVersion } from 'mongodb';

const URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'prerender';
const USE_MEMORY = String(process.env.USE_MEMORY_DB || '').toLowerCase() === 'true';

let client: MongoClient | null = null;
let memoryStore: any[] = [];

async function getClient(): Promise<MongoClient> {
  if (client && (client as any).topology?.isConnected?.()) return client;
  if (!client) {
    client = new MongoClient(URI, {
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
    });
  }
  // Ensure connected
  // Modern driver connects lazily on first operation; explicit connect adds robustness
  await client.connect();
  return client;
}

export default class SitemapDao {
  public static async create(sitemap: any): Promise<void> {
    if (USE_MEMORY || !URI) {
      // Replace if exists
      memoryStore = memoryStore.filter(d => d.siteName !== sitemap.siteName);
      memoryStore.push(sitemap);
      console.log('🧠 (memory) Sitemap inséré');
      return;
    }
    const cli = await getClient();
    const collection = cli.db(DB_NAME).collection('sitemaps');
    await collection.insertOne(sitemap);
    console.log('✅ Sitemap inséré');
  }

  public static async get(): Promise<any[]> {
    if (USE_MEMORY || !URI) {
      return [...memoryStore];
    }
    const cli = await getClient();
    const collection = cli.db(DB_NAME).collection('sitemaps');
    const sitemaps = await collection.find({}).toArray();
    return sitemaps;
  }

  // ✅ Supprimer un sitemap par son nom de domaine
  public static async deleteByUrl(siteName: string): Promise<void> {
    if (USE_MEMORY || !URI) {
      const before = memoryStore.length;
      memoryStore = memoryStore.filter(d => d.siteName !== siteName);
      const deleted = before - memoryStore.length;
      console.log(`🗑 (memory) ${deleted} document supprimé pour ${siteName}`);
      return;
    }
    const cli = await getClient();
    const collection = cli.db(DB_NAME).collection('sitemaps');
    const result = await collection.deleteOne({ siteName });
    console.log(`🗑 ${result.deletedCount} document supprimé pour ${siteName}`);
  }
}

