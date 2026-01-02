// backend/services/scraper.js - OPTIMIZED CATEGORY-BY-CATEGORY JOB HUNTER
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

class Scraper {
  constructor() {
    this.authPath = path.join(__dirname, '../data/auth.json');
    
    // ORGANIZED BY PRIORITY CATEGORIES
    this.categories = {
      // Category 1: SUPER HIGH PRIORITY (Check First & Most Often)
      topTier: {
        name: 'Ambassador & KOL Programs',
        keywords: [
          'ambassador program', 'brand ambassador', 'crypto ambassador',
          'KOL program', 'KOL wanted', 'seeking KOLs',
          'influencer program', 'crypto influencer',
          '#Ambassador', '#AmbassadorProgram', '#KOL'
        ],
        priority: 1,
        scanFrequency: 'every-30min'
      },
      
      // Category 2: HIGH PRIORITY
      community: {
        name: 'Community Management',
        keywords: [
          'community manager', 'community lead', 'community moderator',
          'discord moderator', 'discord manager', 'telegram moderator',
          'mod wanted', 'hiring moderator',
          '#CommunityManager'
        ],
        priority: 2,
        scanFrequency: 'hourly'
      },
      
      // Category 3: HIGH PRIORITY
      socialMedia: {
        name: 'Social Media Management',
        keywords: [
          'social media manager', 'SMM', 'social media specialist',
          'twitter manager', 'instagram manager',
          'social media marketing', '#SocialMediaManager', '#SMM'
        ],
        priority: 2,
        scanFrequency: 'hourly'
      },
      
      // Category 4: MEDIUM-HIGH PRIORITY
      contentCreation: {
        name: 'Content Creation',
        keywords: [
          'content creator', 'video creator', 'youtube creator',
          'tiktok creator', 'UGC creator',
          'video editor', 'motion designer',
          '#ContentCreator', '#VideoEditor'
        ],
        priority: 3,
        scanFrequency: '2-hours'
      },
      
      // Category 5: MEDIUM PRIORITY
      marketing: {
        name: 'Marketing & Growth',
        keywords: [
          'marketing manager', 'growth manager', 'digital marketer',
          'crypto marketing', 'web3 marketing',
          'growth hacker', 'performance marketer',
          '#Marketing', '#GrowthHacking'
        ],
        priority: 3,
        scanFrequency: '2-hours'
      },
      
      // Category 6: MEDIUM PRIORITY
      writing: {
        name: 'Content Writing',
        keywords: [
          'content writer', 'copywriter', 'technical writer',
          'crypto writer', 'web3 writer', 'blog writer',
          'newsletter writer', 'thread writer'
        ],
        priority: 3,
        scanFrequency: '2-hours'
      },
      
      // Category 7: REGULAR PRIORITY
      design: {
        name: 'Design & Creative',
        keywords: [
          'graphic designer', 'UI designer', 'UX designer',
          'brand designer', 'NFT designer',
          'illustrator', '3D artist', '#GraphicDesigner'
        ],
        priority: 4,
        scanFrequency: '3-hours'
      },
      
      // Category 8: REGULAR PRIORITY
      internships: {
        name: 'Internships',
        keywords: [
          'internship', 'intern wanted', 'hiring intern',
          'paid internship', 'remote internship',
          'marketing intern', 'community intern',
          '#Internship', '#InternshipOpportunity'
        ],
        priority: 4,
        scanFrequency: '3-hours'
      },
      
      // Category 9: LOWER PRIORITY
      operations: {
        name: 'Operations & Support',
        keywords: [
          'project manager', 'operations manager',
          'customer support', 'virtual assistant',
          'program manager', 'product coordinator'
        ],
        priority: 5,
        scanFrequency: '4-hours'
      },
      
      // Category 10: CATCH-ALL (General Hiring)
      general: {
        name: 'General Hiring Posts',
        keywords: [
          "we're hiring", "we are hiring", "now hiring",
          'hiring now', 'join our team', 'positions open',
          'career opportunity', '#Web3Jobs', '#CryptoJobs',
          '#RemoteJobs', '#NowHiring', '#WeAreHiring'
        ],
        priority: 1,
        scanFrequency: 'every-30min'
      }
    };
    
    console.log(`💎 Loaded ${Object.keys(this.categories).length} job categories`);
  }

  /**
   * MAIN METHOD: Scan category by category
   * @param {string|null} specificCategory - If provided, only scan this category
   * @param {number} tweetsPerKeyword - How many tweets to get per keyword (default: 15)
   */
  async scanByCategory(specificCategory = null, tweetsPerKeyword = 15) {
    if (!this.checkAuth()) {
      console.error('❌ No auth.json found. Run: node backend/scripts/save-session.js');
      return { results: [], totalTweets: 0 };
    }

    const allResults = [];
    let browser = null;
    
    try {
      console.log('🚀 Starting category-by-category job hunt...\n');
      
      browser = await chromium.launch({ 
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });
      
      const context = await browser.newContext({
        storageState: this.authPath,
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      const page = await context.newPage();
      
      // Determine which categories to scan
      const categoriesToScan = specificCategory 
        ? { [specificCategory]: this.categories[specificCategory] }
        : this.categories;
      
      // Sort by priority
      const sortedCategories = Object.entries(categoriesToScan)
        .sort((a, b) => a[1].priority - b[1].priority);
      
      // Scan each category
      for (const [categoryKey, category] of sortedCategories) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📁 CATEGORY: ${category.name.toUpperCase()}`);
        console.log(`   Priority: ${category.priority} | Keywords: ${category.keywords.length}`);
        console.log(`${'='.repeat(60)}\n`);
        
        const categoryResults = await this.scanCategory(
          page, 
          category, 
          categoryKey,
          tweetsPerKeyword
        );
        
        console.log(`\n✅ Category "${category.name}" complete: ${categoryResults.length} tweets found\n`);
        
        allResults.push({
          category: categoryKey,
          categoryName: category.name,
          priority: category.priority,
          tweets: categoryResults,
          count: categoryResults.length
        });
        
        // Cool down between categories (avoid rate limits)
        if (sortedCategories.indexOf([categoryKey, category]) < sortedCategories.length - 1) {
          console.log('💤 Cooling down before next category (5s)...\n');
          await this.sleep(5000);
        }
      }
      
      await browser.close();
      
      // Summary
      const totalTweets = allResults.reduce((sum, cat) => sum + cat.count, 0);
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎯 SCAN COMPLETE`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📊 Categories scanned: ${allResults.length}`);
      console.log(`📝 Total tweets found: ${totalTweets}`);
      console.log(`${'='.repeat(60)}\n`);
      
      return {
        results: allResults,
        totalTweets: totalTweets,
        timestamp: new Date()
      };
      
    } catch (error) {
      if (browser) await browser.close();
      console.error(`❌ Fatal error: ${error.message}`);
      return { results: [], totalTweets: 0 };
    }
  }

  /**
   * Scan a single category
   */
  async scanCategory(page, category, categoryKey, tweetsPerKeyword) {
    const categoryTweets = [];
    const keywords = category.keywords;
    
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      
      try {
        console.log(`   [${i + 1}/${keywords.length}] Searching: "${keyword}"`);
        
        const tweets = await this.searchSingleQuery(page, keyword, tweetsPerKeyword);
        
        // Tag tweets with category
        tweets.forEach(tweet => {
          tweet.category = categoryKey;
          tweet.categoryName = category.name;
          tweet.searchKeyword = keyword;
        });
        
        categoryTweets.push(...tweets);
        console.log(`      ✓ Found ${tweets.length} tweets`);
        
        // Smart delay between keywords (faster within category)
        await this.sleep(1200);
        
      } catch (error) {
        console.error(`      ✗ Failed: ${error.message}`);
      }
    }
    
    // Deduplicate within category
    return this.deduplicateTweets(categoryTweets);
  }

  /**
   * Search a single query on Twitter
   */
  async searchSingleQuery(page, query, maxResults = 15) {
    try {
      // AGGRESSIVE ANTI-SPAM FILTERS
      const filters = [
        '-RT',                          // No retweets
        'lang:en',                      // English only
        '-filter:replies',              // No replies
        'min_faves:1',                  // At least 1 like
        '-"rt to enter"',               // Block RT farming
        '-"retweet and follow"',        // Block follow farming
        '-"tag 3 friends"',             // Block tag farming
        '-"like and retweet"',          // Block engagement farming
        '-airdrop',                     // Block airdrops (usually spam)
        '-giveaway'                     // Block giveaways
      ];
      
      const fullQuery = `${query} ${filters.join(' ')}`;
      const encodedQuery = encodeURIComponent(fullQuery);
      const url = `https://x.com/search?q=${encodedQuery}&src=typed_query&f=live`;
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      
      // Scroll to load tweets (optimized - less scrolling)
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollBy(0, 1200));
        await page.waitForTimeout(600);
      }
      
      // Extract tweets
      const tweets = await page.evaluate((searchQuery) => {
        const results = [];
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        
        articles.forEach((article) => {
          try {
            const textEl = article.querySelector('[data-testid="tweetText"]');
            if (!textEl) return;
            
            const text = textEl.innerText;
            if (!text || text.length < 30) return; // Minimum length
            
            // CRITICAL: Block engagement farming in extraction
            const lowerText = text.toLowerCase();
            const farmingPhrases = [
              'rt to enter', 'retweet to win', 'retweet and follow',
              'tag 3', 'tag your friends', 'like and rt',
              'like and retweet', 'follow and rt'
            ];
            
            if (farmingPhrases.some(phrase => lowerText.includes(phrase))) {
              return; // Skip this tweet
            }
            
            const linkEl = article.querySelector('a[href*="/status/"]');
            if (!linkEl) return;
            
            const href = linkEl.getAttribute('href');
            const match = href.match(/\/([^\/]+)\/status\/(\d+)/);
            if (!match) return;
            
            const username = match[1];
            const tweetId = match[2];
            const url = `https://x.com${href}`;
            
            const nameEl = article.querySelector('[data-testid="User-Name"]');
            const userText = nameEl ? nameEl.innerText : '';
            const lines = userText.split('\n');
            const displayName = lines[0] || username;
            
            const verified = !!article.querySelector('[aria-label*="Verified"]') || 
                           !!article.querySelector('[data-testid="icon-verified"]');
            
            const timeEl = article.querySelector('time');
            const timestamp = timeEl ? timeEl.getAttribute('datetime') : new Date().toISOString();
            
            const getCount = (selector) => {
              const el = article.querySelector(selector);
              if (!el) return 0;
              const aria = el.getAttribute('aria-label') || '';
              const numMatch = aria.match(/(\d+(?:,\d+)*)/);
              if (!numMatch) return 0;
              return parseInt(numMatch[1].replace(/,/g, ''));
            };
            
            const likes = getCount('[data-testid="like"]');
            const retweets = getCount('[data-testid="retweet"]');
            const replies = getCount('[data-testid="reply"]');
            
            // Extract external links
            const allLinks = article.querySelectorAll('a[href]');
            const externalLinks = [];
            allLinks.forEach(a => {
              const href = a.getAttribute('href');
              if (href && href.startsWith('http') && 
                  !href.includes('x.com') && 
                  !href.includes('twitter.com') && 
                  !href.includes('t.co')) {
                externalLinks.push(href);
              }
            });
            
            const hasImage = !!article.querySelector('[data-testid="tweetPhoto"]');
            const hasVideo = !!article.querySelector('[data-testid="videoPlayer"]');
            
            results.push({
              id: tweetId,
              text: text,
              timestamp: timestamp,
              author: {
                username: username,
                displayName: displayName,
                verified: verified
              },
              engagement: {
                likes: likes,
                retweets: retweets,
                replies: replies
              },
              links: [...new Set(externalLinks)],
              url: url,
              searchQuery: searchQuery,
              hasMedia: hasImage || hasVideo,
              hasLinks: externalLinks.length > 0
            });
            
          } catch (err) {
            // Silent fail for individual tweets
          }
        });
        
        return results;
      }, query);
      
      return tweets;
      
    } catch (error) {
      console.error(`Query error: ${error.message}`);
      return [];
    }
  }

  /**
   * Deduplicate tweets by ID
   */
  deduplicateTweets(tweets) {
    const seen = new Set();
    const unique = [];
    
    for (const tweet of tweets) {
      if (!seen.has(tweet.id)) {
        seen.add(tweet.id);
        unique.push(tweet);
      }
    }
    
    return unique;
  }

  /**
   * Check if authenticated
   */
  checkAuth() {
    try {
      if (!fs.existsSync(this.authPath)) {
        return false;
      }
      
      const data = JSON.parse(fs.readFileSync(this.authPath, 'utf8'));
      return data.cookies && data.cookies.some(c => c.name === 'auth_token');
    } catch (e) {
      return false;
    }
  }

  /**
   * Sleep utility
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get priority categories (for frequent scanning)
   */
  getPriorityCategories(priority = 1) {
    return Object.entries(this.categories)
      .filter(([_, cat]) => cat.priority === priority)
      .map(([key, _]) => key);
  }
}

module.exports = Scraper;