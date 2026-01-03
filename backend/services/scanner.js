// backend/services/scanner.js - FIXED: No Duplicates + Premium Only TG Alerts
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
    
    // Track recently sent alerts to avoid spam (within 1 hour)
    this.recentlyAlerted = new Set();
    
    this.categoryMapping = {
      'topTier': 'ambassador',
      'community': 'community',
      'socialMedia': 'content',
      'contentCreation': 'creator',
      'marketing': 'marketing',
      'writing': 'writing',
      'design': 'design',
      'internships': 'internship',
      'operations': 'other',
      'general': 'other'
    };
  }
  
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
        duplicatesSkipped: 0,
        categoryBreakdown: []
      };
      
      const scanResult = await this.scraper.scanByCategory(specificCategory, tweetsPerKeyword);
      
      if (scanResult.totalTweets === 0) {
        console.log('⚠️ No tweets found in any category');
        return results;
      }
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 CLASSIFYING & SAVING JOBS`);
      console.log(`${'='.repeat(60)}\n`);
      
      // Collect all premium gigs for batch alerting
      const premiumGigsForAlert = [];
      
      for (const categoryResult of scanResult.results) {
        console.log(`\n📁 Processing category: ${categoryResult.categoryName}`);
        console.log(`   Tweets to classify: ${categoryResult.count}`);
        
        const categoryStats = await this.processCategory(
          categoryResult,
          minScore,
          premiumGigsForAlert
        );
        
        results.categoriesProcessed++;
        results.totalTweetsScraped += categoryResult.count;
        results.totalGigsSaved += categoryStats.saved;
        results.premiumGigsSaved += categoryStats.premium;
        results.duplicatesSkipped += categoryStats.duplicates;
        
        results.categoryBreakdown.push({
          category: categoryResult.categoryName,
          scraped: categoryResult.count,
          saved: categoryStats.saved,
          premium: categoryStats.premium,
          duplicates: categoryStats.duplicates,
          rejected: categoryStats.rejected
        });
        
        console.log(`   ✅ Saved: ${categoryStats.saved} gigs (${categoryStats.premium} premium)`);
        console.log(`   🔄 Duplicates: ${categoryStats.duplicates}`);
        console.log(`   ❌ Rejected: ${categoryStats.rejected} low-quality`);
      }
      
      const scanDuration = ((Date.now() - scanStartTime) / 1000).toFixed(2);
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ SCAN COMPLETE`);
      console.log(`${'='.repeat(60)}`);
      console.log(`⏱️  Duration: ${scanDuration}s`);
      console.log(`📁 Categories: ${results.categoriesProcessed}`);
      console.log(`📝 Tweets scraped: ${results.totalTweetsScraped}`);
      console.log(`💾 Gigs saved: ${results.totalGigsSaved}`);
      console.log(`⭐ Premium gigs: ${results.premiumGigsSaved}`);
      console.log(`🔄 Duplicates skipped: ${results.duplicatesSkipped}`);
      console.log(`${'='.repeat(60)}\n`);
      
      // Send premium alerts ONLY for gigs with score >= 60
      if (premiumGigsForAlert.length > 0) {
        console.log(`\n📲 Sending ${premiumGigsForAlert.length} premium gig alerts...\n`);
        await this.sendPremiumAlerts(premiumGigsForAlert);
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
        duplicatesSkipped: 0,
        error: error.message
      };
    }
  }
  
  async processCategory(categoryResult, minScore, premiumGigsForAlert) {
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
        // CRITICAL: Check duplicate BEFORE classification
        const existing = await Gig.findOne({ tweetId: tweet.id });
        if (existing) {
          stats.duplicates++;
          continue;
        }
        
        // Classify the tweet
        const classification = this.classifier.classify(tweet);
        
        // Reject low-quality
        if (classification.score < minScore) {
          stats.rejected++;
          continue;
        }
        
        // Map category
        const mappedCategory = this.categoryMapping[tweet.category] || 'other';
        
        // Prepare gig object
        const gigData = {
          tweetId: tweet.id,
          text: tweet.text,
          author: tweet.author,
          url: tweet.url,
          engagement: tweet.engagement,
          links: tweet.links,
          score: classification.score,
          category: mappedCategory,
          isHotCake: classification.score >= 70,
          timestamp: new Date(tweet.timestamp),
          firstSeen: new Date()
        };
        
        // Save to database with duplicate handling
        try {
          const savedGig = await Gig.create(gigData);
          stats.saved++;
          
          // Track premium (score >= 60)
          if (savedGig.score >= 60) {
            stats.premium++;
            premiumGigsForAlert.push(savedGig);
          }
          
          // Log saved gig
          if (savedGig.score >= 70) {
            console.log(`   🔥 HOTCAKE [${savedGig.score}]: ${savedGig.text.substring(0, 50)}...`);
          } else if (savedGig.score >= 60) {
            console.log(`   ⭐ PREMIUM [${savedGig.score}]: ${savedGig.text.substring(0, 50)}...`);
          } else {
            console.log(`   ✅ SAVED [${savedGig.score}]: ${savedGig.text.substring(0, 50)}...`);
          }
          
        } catch (saveError) {
          // Handle MongoDB duplicate key error
          if (saveError.code === 11000 || saveError.message.includes('duplicate')) {
            stats.duplicates++;
          } else {
            throw saveError;
          }
        }
        
      } catch (err) {
        console.error(`   ⚠️ Process error: ${err.message}`);
      }
    }
    
    return stats;
  }
  
  /**
   * FIXED: Send alerts ONLY for premium gigs (score >= 60)
   */
  async sendPremiumAlerts(premiumGigs) {
    try {
      // Get premium users with Telegram
      const premiumUsers = await User.find({
        isPremium: true,
        telegramChatId: { $exists: true, $ne: null }
      });
      
      if (premiumUsers.length === 0) {
        console.log('   ⚠️ No premium users with Telegram found');
        return;
      }
      
      // Filter only gigs with score >= 60
      const trulyPremiumGigs = premiumGigs.filter(gig => gig.score >= 60);
      
      if (trulyPremiumGigs.length === 0) {
        console.log('   ⚠️ No premium gigs (score >= 60) to alert');
        return;
      }
      
      console.log(`   📲 Sending alerts to ${premiumUsers.length} premium users...`);
      console.log(`   📊 Premium gigs to send: ${trulyPremiumGigs.length}`);
      
      const telegramBot = global.telegramBot;
      if (!telegramBot || !telegramBot.bot) {
        console.log('   ⚠️ Telegram bot not initialized');
        return;
      }
      
      let totalAlertsSent = 0;
      
      for (const user of premiumUsers) {
        try {
          // Check if user premium is still active
          if (!user.isActivePremium()) {
            continue;
          }
          
          // Filter by user's threshold (default 60)
          const userThreshold = user.alertThreshold || 60;
          const userGigs = trulyPremiumGigs.filter(gig => gig.score >= userThreshold);
          
          if (userGigs.length === 0) continue;
          
          // Sort by score (highest first)
          userGigs.sort((a, b) => b.score - a.score);
          
          // Send top 5 to avoid spam
          const gigsToSend = userGigs.slice(0, 5);
          let userAlertsSent = 0;
          
          for (const gig of gigsToSend) {
            // Check if we already alerted this gig to avoid duplicates
            const alertKey = `${user.telegramChatId}-${gig.tweetId}`;
            if (this.recentlyAlerted.has(alertKey)) {
              continue;
            }
            
            const success = await telegramBot.sendGigAlert(user.telegramChatId, gig);
            
            if (success) {
              userAlertsSent++;
              totalAlertsSent++;
              this.recentlyAlerted.add(alertKey);
            }
            
            await this.sleep(500); // Rate limit
          }
          
          if (userAlertsSent > 0) {
            console.log(`   ✅ ${user.username}: ${userAlertsSent} alerts sent`);
          }
          
        } catch (error) {
          console.error(`   ❌ Alert failed for ${user.username}:`, error.message);
        }
      }
      
      console.log(`   📊 Total alerts sent: ${totalAlertsSent}\n`);
      
      // Clean up old alert keys (older than 1 hour)
      setTimeout(() => {
        this.recentlyAlerted.clear();
      }, 60 * 60 * 1000);
      
    } catch (error) {
      console.error('❌ Premium alerts error:', error);
    }
  }
  
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
  
  async fullScan() {
    console.log('🔍 Running full scan (all categories)...');
    
    return await this.scan({
      specificCategory: null,
      tweetsPerKeyword: 15,
      minScore: 50
    });
  }
  
  getStats() {
    return {
      ...this.scanStats,
      scraperCategories: Object.keys(this.scraper.categories).length,
      recentAlertsTracked: this.recentlyAlerted.size
    };
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = Scanner;