import { Controller } from "@/controllers/Controller";

/**
 * Controller for Sitemap API
 */
export class SitemapController extends Controller {

  static async get() {
    return this.requestBuilder("GET", `/sitemap`);
  }

  static async post(url) {
    const encoded = encodeURIComponent(url);
    return this.requestBuilder("POST", `/sitemap/${encoded}`);
  }

  static async delete(url) {
    const encoded = encodeURIComponent(url);
    return this.requestBuilder("DELETE", `/sitemap/${encoded}`);
  }

}
