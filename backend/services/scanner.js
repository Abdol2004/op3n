// backend/services/scanner.js - FIXED CATEGORY MAPPING
const Scraper = require('./scraper');
const Classifier = require('./classifier');
const Gig = require('../models/Gig');
const User = require('../models/User');

class Scanner {
  constructor() {
    this.scraper = new Scraper();
    this.classifier = new Classifier();
    this.scanStats = {
      totalScans: 0,
      categoriesProcessed: [],
      lastScanTime: null
    };
    
    // MAP new categories to your existing Gig model categories
    this.categoryMapping = {
      'topTier': 'ambassador',        // Ambassador & KOL → ambassador
      'community': 'community',        // Community Management → community
      'socialMedia': 'content',        // Social Media → content
      'contentCreation': 'creator',    // Content Creation → creator
      'marketing': 'marketing',        // Marketing → marketing
      'writing': 'writing',            // Writing → writing
      'design': 'design',              // Design → design
      'internships': 'internship',     // Internships → internship
      'operations': 'other',           // Operations → other
      'general': 'other'               // General → other
    };
  }
  
  /**
   * MAIN METHOD: Scan all categories or specific category
   */
  async scan(options = {}) {
    const {
      specificCategory = null,
      tweetsPerKeyword = 15,
      minScore = 50
    } = options;
    
    try {
      console.log('\n🎯 Starting smart category-by-category scan...\n');
      const scanStartTime = Date.now();
      
      const results = {
        categoriesProcessed: 0,
        totalTweetsScraped: 0,
        totalGigsSaved: 0,
        premiumGigsSaved: 0,
        categoryBreakdown: []
      };
      
      // Scan categories
      const scanResult = await this.scraper.scanByCategory(specificCategory, tweetsPerKeyword);
      
      if (scanResult.totalTweets === 0) {
        console.log('⚠️ No tweets found in any category');
        return results;
      }
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 CLASSIFYING & SAVING JOBS`);
      console.log(`${'='.repeat(60)}\n`);
      
      // Process each category's results
      for (const categoryResult of scanResult.results) {
        console.log(`\n📁 Processing category: ${categoryResult.categoryName}`);
        console.log(`   Tweets to classify: ${categoryResult.count}`);
        
        const categoryStats = await this.processCategory(
          categoryResult,
          minScore
        );
        
        results.categoriesProcessed++;
        results.totalTweetsScraped += categoryResult.count;
        results.totalGigsSaved += categoryStats.saved;
        results.premiumGigsSaved += categoryStats.premium;
        
        results.categoryBreakdown.push({
          category: categoryResult.categoryName,
          scraped: categoryResult.count,
          saved: categoryStats.saved,
          premium: categoryStats.premium,
          rejected: categoryStats.rejected
        });
        
        console.log(`   ✅ Saved: ${categoryStats.saved} gigs (${categoryStats.premium} premium)`);
        console.log(`   🔄 Duplicates: ${categoryStats.duplicates}`);
        console.log(`   ❌ Rejected: ${categoryStats.rejected} low-quality`);
      }
      
      const scanDuration = ((Date.now() - scanStartTime) / 1000).toFixed(2);
      
      // Final summary
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ SCAN COMPLETE`);
      console.log(`${'='.repeat(60)}`);
      console.log(`⏱️  Duration: ${scanDuration}s`);
      console.log(`📁 Categories: ${results.categoriesProcessed}`);
      console.log(`📝 Tweets scraped: ${results.totalTweetsScraped}`);
      console.log(`💾 Gigs saved: ${results.totalGigsSaved}`);
      console.log(`⭐ Premium gigs: ${results.premiumGigsSaved}`);
      console.log(`${'='.repeat(60)}\n`);
      
      // Send premium alerts if any high-value gigs found
      if (results.premiumGigsSaved > 0) {
        await this.sendPremiumAlerts();
      }
      
      this.scanStats.totalScans++;
      this.scanStats.lastScanTime = new Date();
      
      return results;
      
    } catch (error) {
      console.error('❌ Scanner error:', error);
      return {
        categoriesProcessed: 0,
        totalTweetsScraped: 0,
        totalGigsSaved: 0,
        premiumGigsSaved: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Process a single category: classify and save
   */
  async processCategory(categoryResult, minScore) {
    const stats = {
      saved: 0,
      premium: 0,
      rejected: 0,
      duplicates: 0
    };
    
    const tweets = categoryResult.tweets;
    
    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];
      
      try {
        // Check if already exists in DB FIRST (prevent duplicates)
        const existing = await Gig.findOne({ tweetId: tweet.id });
        if (existing) {
          stats.duplicates++;
          continue; // Skip duplicates
        }
        
        // Classify the tweet
        const classification = this.classifier.classify(tweet);
        
        // Log rejection reason for debugging
        if (classification.score < minScore) {
          stats.rejected++;
          // Uncomment to debug rejections:
          // console.log(`   ❌ [${classification.score}] ${tweet.text.substring(0, 40)}... - ${classification.reasons[0]}`);
          continue;
        }
        
        // MAP the category to your Gig model's expected values
        const mappedCategory = this.categoryMapping[tweet.category] || 'other';
        
        // Prepare gig object
        const gig = {
          tweetId: tweet.id,
          text: tweet.text,
          author: tweet.author,
          url: tweet.url,
          engagement: tweet.engagement,
          links: tweet.links,
          score: classification.score,
          category: mappedCategory,  // Use mapped category
          isHotCake: classification.score >= 70,
          timestamp: new Date(tweet.timestamp),
          firstSeen: new Date()
        };
        
        // Save to database
        await Gig.create(gig);
        stats.saved++;
        
        // Track premium gigs
        if (gig.score >= 60) {
          stats.premium++;
        }
        
        // Log ALL saved gigs with score
        if (gig.score >= 70) {
          console.log(`   🔥 HOTCAKE [${gig.score}]: ${gig.text.substring(0, 50)}...`);
        } else {
          console.log(`   ✅ SAVED [${gig.score}]: ${gig.text.substring(0, 50)}...`);
        }
        
      } catch (err) {
        if (!err.message.includes('duplicate')) {
          console.error(`   ⚠️ Save error: ${err.message}`);
        }
      }
    }
    
    return stats;
  }
  
  /**
   * Send alerts to premium users for new high-value gigs
   */
  async sendPremiumAlerts() {
    try {
      // Get premium users with Telegram
      const premiumUsers = await User.find({
        isPremium: true,
        telegramChatId: { $exists: true, $ne: null }
      });
      
      if (premiumUsers.length === 0) {
        return;
      }
      
      // Get recent premium gigs (last 10 minutes)
      const recentGigs = await Gig.find({
        score: { $gte: 60 },
        firstSeen: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
      })
      .sort({ score: -1 })
      .limit(20);
      
      if (recentGigs.length === 0) {
        return;
      }
      
      console.log(`\n📲 Sending alerts to ${premiumUsers.length} premium users...`);
      
      const telegramBot = global.telegramBot;
      if (!telegramBot || !telegramBot.bot) {
        console.log('⚠️ Telegram bot not initialized');
        return;
      }
      
      for (const user of premiumUsers) {
        try {
          if (!user.isActivePremium()) {
            continue;
          }
          
          // Filter by user's threshold
          const userGigs = recentGigs.filter(gig => 
            gig.score >= (user.alertThreshold || 60)
          );
          
          if (userGigs.length === 0) continue;
          
          // Send top 5 to avoid spam
          const topGigs = userGigs.slice(0, 5);
          
          for (const gig of topGigs) {
            await telegramBot.sendGigAlert(user.telegramChatId, gig);
            await this.sleep(500);
          }
          
          console.log(`   ✅ ${user.username}: ${topGigs.length} alerts sent`);
          
        } catch (error) {
          console.error(`   ❌ Alert failed for ${user.username}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Premium alerts error:', error);
    }
  }
  
  /**
   * Quick scan - only priority 1 categories
   */
  async quickScan() {
    console.log('⚡ Running quick scan (priority 1 only)...');
    
    const priorityCategories = this.scraper.getPriorityCategories(1);
    let totalGigs = 0;
    
    for (const category of priorityCategories) {
      const result = await this.scan({
        specificCategory: category,
        tweetsPerKeyword: 10,
        minScore: 50
      });
      
      totalGigs += result.totalGigsSaved;
    }
    
    console.log(`⚡ Quick scan complete: ${totalGigs} gigs saved`);
    return { totalGigs };
  }
  
  /**
   * Full scan - all categories
   */
  async fullScan() {
    console.log('🔍 Running full scan (all categories)...');
    
    return await this.scan({
      specificCategory: null,
      tweetsPerKeyword: 15,
      minScore: 50
    });
  }
  
  /**
   * Get scan statistics
   */
  getStats() {
    return {
      ...this.scanStats,
      scraperCategories: Object.keys(this.scraper.categories).length
    };
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = Scanner;