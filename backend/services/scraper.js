// backend/services/scraper.js - FIXED: Better Deduplication
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

class Scraper {
  constructor() {
    this.authPath = path.join(__dirname, '../data/auth.json');
    
    // Track all seen tweet IDs across entire scan session
    this.globalSeenTweets = new Set();
    
    this.categories = {
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

  async scanByCategory(specificCategory = null, tweetsPerKeyword = 15) {
    if (!this.checkAuth()) {
      console.error('❌ No auth.json found. Run: node backend/scripts/save-session.js');
      return { results: [], totalTweets: 0 };
    }

    // Reset global seen tweets at start of scan
    this.globalSeenTweets.clear();
    
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
      
      const categoriesToScan = specificCategory 
        ? { [specificCategory]: this.categories[specificCategory] }
        : this.categories;
      
      const sortedCategories = Object.entries(categoriesToScan)
        .sort((a, b) => a[1].priority - b[1].priority);
      
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
        
        console.log(`\n✅ Category "${category.name}" complete: ${categoryResults.length} unique tweets\n`);
        
        allResults.push({
          category: categoryKey,
          categoryName: category.name,
          priority: category.priority,
          tweets: categoryResults,
          count: categoryResults.length
        });
        
        if (sortedCategories.indexOf([categoryKey, category]) < sortedCategories.length - 1) {
          console.log('💤 Cooling down before next category (5s)...\n');
          await this.sleep(5000);
        }
      }
      
      await browser.close();
      
      const totalTweets = allResults.reduce((sum, cat) => sum + cat.count, 0);
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎯 SCAN COMPLETE`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📊 Categories scanned: ${allResults.length}`);
      console.log(`📝 Total unique tweets: ${totalTweets}`);
      console.log(`🔄 Duplicates filtered: ${this.globalSeenTweets.size - totalTweets}`);
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

  async scanCategory(page, category, categoryKey, tweetsPerKeyword) {
    const categoryTweets = [];
    const keywords = category.keywords;
    
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      
      try {
        console.log(`   [${i + 1}/${keywords.length}] Searching: "${keyword}"`);
        
        const tweets = await this.searchSingleQuery(page, keyword, tweetsPerKeyword);
        
        // Filter out globally seen tweets BEFORE adding
        const newTweets = tweets.filter(tweet => !this.globalSeenTweets.has(tweet.id));
        
        // Tag tweets with category
        newTweets.forEach(tweet => {
          tweet.category = categoryKey;
          tweet.categoryName = category.name;
          tweet.searchKeyword = keyword;
          this.globalSeenTweets.add(tweet.id); // Track globally
        });
        
        categoryTweets.push(...newTweets);
        
        const duplicatesFiltered = tweets.length - newTweets.length;
        console.log(`      ✓ Found ${newTweets.length} unique tweets (${duplicatesFiltered} duplicates filtered)`);
        
        await this.sleep(1200);
        
      } catch (error) {
        console.error(`      ✗ Failed: ${error.message}`);
      }
    }
    
    return categoryTweets;
  }

  async searchSingleQuery(page, query, maxResults = 15) {
    try {
      const filters = [
        '-RT',
        'lang:en',
        '-filter:replies',
        'min_faves:1',
        '-"rt to enter"',
        '-"retweet and follow"',
        '-"tag 3 friends"',
        '-"like and retweet"',
        '-airdrop',
        '-giveaway'
      ];
      
      const fullQuery = `${query} ${filters.join(' ')}`;
      const encodedQuery = encodeURIComponent(fullQuery);
      const url = `https://x.com/search?q=${encodedQuery}&src=typed_query&f=live`;
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollBy(0, 1200));
        await page.waitForTimeout(600);
      }
      
      const tweets = await page.evaluate((searchQuery) => {
        const results = [];
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        
        articles.forEach((article) => {
          try {
            const textEl = article.querySelector('[data-testid="tweetText"]');
            if (!textEl) return;
            
            const text = textEl.innerText;
            if (!text || text.length < 30) return;
            
            const lowerText = text.toLowerCase();
            const farmingPhrases = [
              'rt to enter', 'retweet to win', 'retweet and follow',
              'tag 3', 'tag your friends', 'like and rt',
              'like and retweet', 'follow and rt'
            ];
            
            if (farmingPhrases.some(phrase => lowerText.includes(phrase))) {
              return;
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
            // Silent fail
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

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getPriorityCategories(priority = 1) {
    return Object.entries(this.categories)
      .filter(([_, cat]) => cat.priority === priority)
      .map(([key, _]) => key);
  }
}

module.exports = Scraper;