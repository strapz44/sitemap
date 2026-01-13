import axios from 'axios';
import { parseStringPromise } from 'xml2js';

interface SitemapUrl {
    loc: string[];
    lastmod?: string[];
    changefreq?: string[];
    priority?: string[];
}

interface ParsedSitemap {
    urlset: {
        url: SitemapUrl[];
    };
}

export default class SitemapService {
    public static async getSitemapFromUrl(url: string): Promise<ParsedSitemap> {
        // Helper: Fetch raw XML
        const fetchXml = async (fullUrl: string): Promise<string> => {
            const res = await axios.get(fullUrl, {
                timeout: 8000,
                headers: { 'User-Agent': 'Prerender-Bot/1.0' },
                validateStatus: () => true,
            });
            if (res.status >= 200 && res.status < 300) return res.data as string;
            const err: any = new Error(`HTTP ${res.status}`);
            err.response = { status: res.status };
            throw err;
        };

        // Helper: Parse XML to object
        const parseXml = async (xml: string): Promise<any> => parseStringPromise(xml);

        // Helper: Normalize and extract host
        const toHost = (input: string): string => {
            try {
                const u = /^https?:\/\//i.test(input) ? new URL(input) : new URL(`https://${input}`);
                return u.host;
            } catch { return input.replace(/^https?:\/\//i, '').split('/')[0]; }
        };

        // Helper: Build candidate sitemap URLs
        const buildCandidates = (input: string): string[] => {
            // If the input already looks like a direct sitemap URL
            if (/sitemap[^\s]*\.xml(\?.*)?$/i.test(input)) {
                const direct = /^https?:\/\//i.test(input) ? input : `https://${input}`;
                return [direct];
            }
            const host = toHost(input);
            const https = [
                `https://${host}/sitemap.xml`,
                `https://${host}/sitemap_index.xml`,
                `https://${host}/sitemap-index.xml`,
            ];
            const http = [
                `http://${host}/sitemap.xml`,
                `http://${host}/sitemap_index.xml`,
                `http://${host}/sitemap-index.xml`,
            ];
            return [...https, ...http];
        };

        // Helper: Try robots.txt to discover sitemaps
        const fromRobots = async (input: string): Promise<string[] | null> => {
            const host = toHost(input);
            const robotsUrls = [
                `https://${host}/robots.txt`,
                `http://${host}/robots.txt`,
            ];
            for (const r of robotsUrls) {
                try {
                    const text = await fetchXml(r);
                    const lines = String(text).split(/\r?\n/);
                    const found: string[] = [];
                    for (const line of lines) {
                        const m = line.match(/^\s*Sitemap:\s*(\S+)/i);
                        if (m && m[1]) found.push(m[1]);
                    }
                    if (found.length) return found;
                } catch { /* ignore and try next */ }
            }
            return null;
        };

        // Helper: Given XML string, resolve to urlset by following sitemap index if necessary
        const resolveToUrlset = async (xml: string): Promise<ParsedSitemap | null> => {
            const parsed = await parseXml(xml);
            if (parsed?.urlset?.url && Array.isArray(parsed.urlset.url)) {
                return parsed as ParsedSitemap;
            }
            // If it's a sitemap index, try its child sitemaps
            const sIdx = (parsed as any)?.sitemapindex?.sitemap;
            if (Array.isArray(sIdx)) {
                const locs = sIdx
                    .map((s: any) => Array.isArray(s.loc) ? s.loc[0] : s.loc)
                    .filter((v: any) => typeof v === 'string');
                // Try a few entries to avoid long loops
                for (const loc of locs.slice(0, 5)) {
                    try {
                        const childXml = await fetchXml(loc);
                        const childParsed = await parseXml(childXml);
                        if (childParsed?.urlset?.url && Array.isArray(childParsed.urlset.url)) {
                            return childParsed as ParsedSitemap;
                        }
                    } catch { /* continue */ }
                }
            }
            return null;
        };

        // 1) Try robots.txt sitemaps first
        const robots = await fromRobots(url);
        if (robots && robots.length) {
            for (const sm of robots) {
                try {
                    const xml = await fetchXml(sm);
                    const resolved = await resolveToUrlset(xml);
                    if (resolved) return resolved;
                } catch (e: any) {
                    // try next
                }
            }
        }

        // 2) Try common candidates
        const candidates = buildCandidates(url);
        for (const c of candidates) {
            try {
                const xml = await fetchXml(c);
                const resolved = await resolveToUrlset(xml);
                if (resolved) return resolved;
            } catch (e: any) {
                // If 404, continue, otherwise if timeout/network error, continue as well
                continue;
            }
        }

        // Nothing worked
        const err: any = new Error('Sitemap not found');
        throw err;
    }

    public static async convertSitemapToJson(sitemap: any): Promise<any> {
        // Accept either raw XML string or an already parsed sitemap object
        if (typeof sitemap === 'string') {
            return parseStringPromise(sitemap, { explicitArray: false });
        }
        return sitemap;
    }
}



