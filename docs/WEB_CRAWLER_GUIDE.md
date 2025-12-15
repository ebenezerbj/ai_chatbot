# Web Crawler Feature

The AKCB AI Chatbot now includes a powerful web crawler that can automatically extract content from websites and update the knowledge base.

## Features

### 🌐 Full Website Crawling
- Crawl multiple URLs with configurable depth
- Follow links automatically
- Support for both static HTML and JavaScript-rendered pages
- Configurable page limits and exclude patterns

### 🤖 Automatic KB Updates
- Converts crawled content to knowledge base entries
- Auto-generates search patterns from titles and content
- Merges with existing KB without duplicates
- Preserves source URLs for reference

### ⚙️ Configuration Options
- **Max Depth**: Control how many levels deep to follow links (1-5)
- **Max Pages**: Limit total pages to crawl (1-500)
- **JavaScript Rendering**: Enable Puppeteer for dynamic sites
- **Include/Exclude Patterns**: Filter which URLs to crawl
- **Auto KB Update**: Automatically update knowledge base after crawl

## How to Use

### Via Admin Portal

1. **Login to Admin Portal**
   - Navigate to `/admin-portal.html`
   - Enter admin credentials

2. **Access Web Crawler**
   - Click "Web Crawler" in sidebar menu

3. **Configure Crawl**
   - Enter website URLs (one per line)
   - Set max depth (recommended: 2-3)
   - Set max pages (recommended: 50-100)
   - Enable JavaScript rendering if needed (slower)
   - Enable auto-update KB (recommended)

4. **Start Crawl**
   - Click "Start Crawl" button
   - Monitor status in real-time
   - View results when complete

### Via API

**Start Crawl:**
```bash
POST /api/admin/crawler/start
Authorization: Bearer <admin_token>

{
  "urls": ["https://example.com"],
  "maxDepth": 2,
  "maxPages": 50,
  "useJavaScript": false,
  "autoUpdateKB": true
}
```

**Check Status:**
```bash
GET /api/admin/crawler/status
Authorization: Bearer <admin_token>
```

**Get Configuration:**
```bash
GET /api/admin/crawler/config
Authorization: Bearer <admin_token>
```

## Configuration File

Edit `config/crawler.json` to set default crawl settings:

```json
{
  "enabled": true,
  "crawlConfigs": [
    {
      "name": "Bank Main Website",
      "startUrls": ["https://your-bank-website.com"],
      "maxDepth": 3,
      "maxPages": 50,
      "useJavaScript": false,
      "includePatterns": [],
      "excludePatterns": ["/admin", "/login", "\\.pdf$"],
      "selectors": {
        "title": "h1, .page-title, title",
        "content": "main, article, .content",
        "exclude": ["script", "style", "nav", "footer"]
      }
    }
  ],
  "autoUpdateKB": true
}
```

## How It Works

### 1. Crawling Process
1. Starts from provided URLs
2. Fetches page content (Axios or Puppeteer)
3. Parses HTML with Cheerio
4. Extracts title and main content
5. Finds all links on page
6. Queues links for crawling (up to max depth)
7. Continues until max pages reached

### 2. Content Extraction
- **Title**: From `<h1>`, `<title>`, or `.page-title`
- **Content**: From `<main>`, `<article>`, or custom selectors
- **Cleanup**: Removes scripts, styles, navigation, footers
- **Links**: Absolute URLs only (HTTP/HTTPS)

### 3. KB Entry Generation
- **ID**: Generated from URL (e.g., `web_example_com_about`)
- **Patterns**: Auto-generated from title and content
  - Exact title match
  - "tell me about [title]"
  - "what is [title]"
  - Key phrases from content
- **Answer**: First 800 chars of content + source URL
- **Product**: Tagged as `website_content`

### 4. KB Update
- Removes old `web_*` entries
- Adds new crawled entries
- Preserves manually created entries
- Reloads KB automatically

## Best Practices

### Performance
- Start with **low max depth (2-3)** to avoid long crawls
- Limit **max pages (50-100)** for initial tests
- Use **static HTML mode** when possible (faster)
- Enable **JavaScript rendering** only for dynamic sites

### URL Selection
- Crawl specific sections, not entire site
- Use **include patterns** to focus on relevant content
- Add **exclude patterns** for admin, login, media files
- Test with 1-2 URLs before full crawl

### Content Quality
- Review crawl results before enabling auto-update
- Check KB entries for relevance
- Adjust selectors if content quality is poor
- Remove or edit generated entries as needed

## Troubleshooting

### Crawl Fails
- Check URLs are accessible (try in browser)
- Verify no authentication required
- Check firewall/CORS restrictions
- Enable JavaScript rendering if page is dynamic

### Poor Content Quality
- Adjust content selectors in config
- Add more exclude patterns
- Increase exclude selectors (ads, sidebars)
- Manually edit KB entries after crawl

### Slow Performance
- Reduce max depth
- Reduce max pages
- Disable JavaScript rendering
- Add exclude patterns for large files

### Memory Issues (Production)
- Limit max pages to 100-200
- Avoid JavaScript rendering on large crawls
- Use scheduled crawls during low-traffic times
- Consider crawling specific pages only

## Examples

### Example 1: Crawl Bank Website FAQs
```json
{
  "urls": ["https://yourbank.com/faq"],
  "maxDepth": 1,
  "maxPages": 20,
  "useJavaScript": false,
  "autoUpdateKB": true
}
```

### Example 2: Crawl Product Pages
```json
{
  "urls": [
    "https://yourbank.com/loans",
    "https://yourbank.com/accounts",
    "https://yourbank.com/cards"
  ],
  "maxDepth": 2,
  "maxPages": 50,
  "useJavaScript": false,
  "excludePatterns": ["/apply", "/calculator"],
  "autoUpdateKB": true
}
```

### Example 3: Dynamic React Site
```json
{
  "urls": ["https://yourbank.com"],
  "maxDepth": 2,
  "maxPages": 30,
  "useJavaScript": true,
  "autoUpdateKB": false
}
```

## Architecture

### Files Created
- `src/webCrawler.ts` - Main crawler service
- `config/crawler.json` - Default configuration
- `public/admin-portal.html` - Web Crawler UI section
- `src/index.ts` - Crawler API endpoints

### Dependencies Added
- `cheerio` - Fast HTML parsing
- `puppeteer` - Headless browser for JS rendering
- `axios` - HTTP client (already installed)

### API Endpoints
- `POST /api/admin/crawler/start` - Start crawl
- `GET /api/admin/crawler/status` - Get crawl status
- `GET /api/admin/crawler/config` - Get crawler config
- `POST /api/admin/crawler/config` - Update crawler config

## Security Considerations

### Authentication Required
- All crawler endpoints require admin authentication
- Bearer token must be valid
- Session expiration handled automatically

### Rate Limiting
- Crawler respects website robots.txt (implement if needed)
- Adds delays between requests (can be configured)
- User-Agent: `Mozilla/5.0 (compatible; BankChatBot/1.0)`

### Data Validation
- URLs validated before crawling
- Content sanitized before KB insertion
- File size limits enforced
- Timeout protection (10s per request)

## Future Enhancements

- [ ] Scheduled automatic crawls (cron jobs)
- [ ] Robots.txt compliance
- [ ] Sitemap.xml parsing
- [ ] Incremental updates (only changed pages)
- [ ] Content diffing and version control
- [ ] Email notifications on crawl completion
- [ ] More granular selector configuration
- [ ] Content quality scoring
- [ ] Duplicate detection improvements
- [ ] Export crawl results to CSV/JSON

## Support

For issues or questions:
1. Check server logs in Render dashboard
2. Review crawl results in admin portal
3. Test URLs manually in browser
4. Contact development team

---

**Built for**: Amantin and Kasei Community Bank Ltd.
**Version**: 1.0.0
**Last Updated**: December 15, 2025
