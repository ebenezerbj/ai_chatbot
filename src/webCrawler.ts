import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';

export interface CrawlConfig {
  startUrls: string[];
  maxDepth: number;
  maxPages: number;
  includePatterns?: RegExp[];
  excludePatterns?: RegExp[];
  useJavaScript?: boolean;
  selectors?: {
    title?: string;
    content?: string;
    exclude?: string[];
  };
}

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  links: string[];
  timestamp: Date;
  depth: number;
}

export interface CrawlResult {
  pages: CrawledPage[];
  totalPages: number;
  startTime: Date;
  endTime: Date;
  errors: Array<{ url: string; error: string }>;
}

export class WebCrawler {
  private visited = new Set<string>();
  private queue: Array<{ url: string; depth: number }> = [];
  private results: CrawledPage[] = [];
  private errors: Array<{ url: string; error: string }> = [];
  private browser: Browser | null = null;
  private config: CrawlConfig;

  constructor(config: CrawlConfig) {
    this.config = config;
  }

  /**
   * Start crawling from configured URLs
   */
  async crawl(): Promise<CrawlResult> {
    const startTime = new Date();
    console.log(`[Crawler] Starting crawl with ${this.config.startUrls.length} URLs`);

    // Initialize browser if JavaScript rendering needed
    if (this.config.useJavaScript) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    // Add start URLs to queue
    for (const url of this.config.startUrls) {
      this.queue.push({ url, depth: 0 });
    }

    // Process queue
    while (this.queue.length > 0 && this.results.length < this.config.maxPages) {
      const { url, depth } = this.queue.shift()!;

      if (this.visited.has(url) || depth > this.config.maxDepth) {
        continue;
      }

      await this.crawlPage(url, depth);
    }

    // Cleanup
    if (this.browser) {
      await this.browser.close();
    }

    const endTime = new Date();
    console.log(`[Crawler] Completed: ${this.results.length} pages, ${this.errors.length} errors`);

    return {
      pages: this.results,
      totalPages: this.results.length,
      startTime,
      endTime,
      errors: this.errors
    };
  }

  /**
   * Crawl a single page
   */
  private async crawlPage(url: string, depth: number): Promise<void> {
    try {
      console.log(`[Crawler] Crawling: ${url} (depth: ${depth})`);
      this.visited.add(url);

      let html: string;
      
      if (this.config.useJavaScript && this.browser) {
        html = await this.fetchWithPuppeteer(url);
      } else {
        html = await this.fetchWithAxios(url);
      }

      const page = this.parsePage(url, html, depth);
      this.results.push(page);

      // Add discovered links to queue
      if (depth < this.config.maxDepth) {
        for (const link of page.links) {
          if (!this.visited.has(link) && this.shouldCrawl(link)) {
            this.queue.push({ url: link, depth: depth + 1 });
          }
        }
      }

    } catch (error: any) {
      console.error(`[Crawler] Error crawling ${url}:`, error.message);
      this.errors.push({ url, error: error.message });
    }
  }

  /**
   * Fetch page using Axios (for static HTML)
   */
  private async fetchWithAxios(url: string): Promise<string> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BankChatBot/1.0)'
      },
      timeout: 10000
    });
    return response.data;
  }

  /**
   * Fetch page using Puppeteer (for JavaScript-rendered pages)
   */
  private async fetchWithPuppeteer(url: string): Promise<string> {
    const page = await this.browser!.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();
    await page.close();
    return html;
  }

  /**
   * Parse HTML and extract content
   */
  private parsePage(url: string, html: string, depth: number): CrawledPage {
    const $ = cheerio.load(html);

    // Remove unwanted elements
    const excludeSelectors = this.config.selectors?.exclude || [
      'script', 'style', 'nav', 'footer', 'header', 'iframe', 'noscript'
    ];
    excludeSelectors.forEach(selector => $(selector).remove());

    // Extract title
    const title = this.config.selectors?.title
      ? $(this.config.selectors.title).first().text().trim()
      : $('title').text().trim() || $('h1').first().text().trim();

    // Extract content
    let content = '';
    if (this.config.selectors?.content) {
      content = $(this.config.selectors.content).text().trim();
    } else {
      // Default: extract from main, article, or body
      content = $('main').text() || $('article').text() || $('body').text();
    }

    // Clean up content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    // Extract links
    const links: string[] = [];
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        const absoluteUrl = this.resolveUrl(url, href);
        if (absoluteUrl) {
          links.push(absoluteUrl);
        }
      }
    });

    return {
      url,
      title,
      content,
      links: [...new Set(links)], // Remove duplicates
      timestamp: new Date(),
      depth
    };
  }

  /**
   * Resolve relative URLs to absolute
   */
  private resolveUrl(baseUrl: string, href: string): string | null {
    try {
      // Skip anchors, mailto, tel, javascript
      if (href.startsWith('#') || href.startsWith('mailto:') || 
          href.startsWith('tel:') || href.startsWith('javascript:')) {
        return null;
      }

      const base = new URL(baseUrl);
      const resolved = new URL(href, base);
      
      // Only return HTTP(S) URLs
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        return resolved.href;
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if URL should be crawled
   */
  private shouldCrawl(url: string): boolean {
    // Check exclude patterns
    if (this.config.excludePatterns) {
      for (const pattern of this.config.excludePatterns) {
        if (pattern.test(url)) {
          return false;
        }
      }
    }

    // Check include patterns (if specified)
    if (this.config.includePatterns && this.config.includePatterns.length > 0) {
      let matches = false;
      for (const pattern of this.config.includePatterns) {
        if (pattern.test(url)) {
          matches = true;
          break;
        }
      }
      if (!matches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Save crawl results to JSON file
   */
  async saveCrawlResults(result: CrawlResult, outputPath: string): Promise<void> {
    await writeFile(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`[Crawler] Results saved to ${outputPath}`);
  }

  /**
   * Load previous crawl results
   */
  static async loadCrawlResults(inputPath: string): Promise<CrawlResult> {
    const data = await readFile(inputPath, 'utf-8');
    return JSON.parse(data);
  }
}

/**
 * Extract KB-ready entries from crawled content
 */
export function convertToKBEntries(pages: CrawledPage[]): Array<{
  id: string;
  product: string;
  patterns: string[];
  answer: string;
}> {
  const entries: Array<any> = [];

  for (const page of pages) {
    if (!page.content || page.content.length < 50) {
      continue; // Skip pages with minimal content
    }

    // Generate ID from URL
    const id = page.url
      .replace(/https?:\/\//, '')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .substring(0, 50);

    // Generate patterns from title and URL
    const patterns: string[] = [];
    
    // Add title variations
    if (page.title) {
      patterns.push(page.title.toLowerCase());
      patterns.push(`tell me about ${page.title.toLowerCase()}`);
      patterns.push(`what is ${page.title.toLowerCase()}`);
    }

    // Extract key phrases from content (first 200 chars)
    const contentStart = page.content.substring(0, 200).toLowerCase();
    const words = contentStart.split(/\s+/).filter(w => w.length > 4);
    if (words.length > 0) {
      patterns.push(words.slice(0, 3).join(' '));
    }

    // Truncate content if too long (max 500 chars for KB)
    let answer = page.content.substring(0, 800);
    if (page.content.length > 800) {
      answer += `...\n\nFor more information, visit: ${page.url}`;
    } else {
      answer += `\n\nSource: ${page.url}`;
    }

    entries.push({
      id: `web_${id}`,
      product: 'website_content',
      patterns: [...new Set(patterns)], // Remove duplicates
      answer
    });
  }

  return entries;
}

/**
 * Merge crawled KB entries with existing KB
 */
export async function updateKnowledgeBase(
  newEntries: any[],
  kbPath: string = path.join(__dirname, '../data/kb.json')
): Promise<void> {
  try {
    // Read existing KB
    const kbData = await readFile(kbPath, 'utf-8');
    const kb = JSON.parse(kbData);

    // Remove old web-crawled entries
    const filteredKb = kb.filter((entry: any) => !entry.id.startsWith('web_'));

    // Add new entries
    const updatedKb = [...filteredKb, ...newEntries];

    // Save updated KB
    await writeFile(kbPath, JSON.stringify(updatedKb, null, 2), 'utf-8');
    
    console.log(`[Crawler] Knowledge base updated: ${newEntries.length} entries added`);
  } catch (error: any) {
    console.error('[Crawler] Error updating KB:', error.message);
    throw error;
  }
}
