import { Controller } from "@/controllers/Controller";

/**
 * Controller for Sitemap API
 */
export class SitemapController extends Controller {

  static async get() {
    return this.requestBuilder("GET", `/sitemaps`);
  }

  static async post(url) {
    const encoded = encodeURIComponent(url);
    return this.requestBuilder("POST", `/sitemaps?url=${encoded}`);
  }

  static async delete(url) {
    const encoded = encodeURIComponent(url);
    return this.requestBuilder("DELETE", `/sitemaps/${encoded}`);
  }

}
