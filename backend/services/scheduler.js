// backend/services/scheduler.js - AUTOMATED CATEGORY SCANNING
const Scanner = require('./scanner');
const cron = require('node-cron');

class ScannerScheduler {
  constructor() {
    this.scanner = new Scanner();
    this.isRunning = false;
    this.jobs = [];
    this.stats = {
      totalRuns: 0,
      totalGigsSaved: 0,
      lastRun: null,
      nextRun: null
    };
  }
  
  /**
   * Start the automated scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Scheduler already running');
      return;
    }
    
    console.log('🚀 Starting automated job scanner...\n');
    
    // ===== JOB 1: QUICK SCAN - Every 30 minutes =====
    // Only scans priority 1 categories (ambassador, KOL, general hiring)
    const quickScanJob = cron.schedule('*/30 * * * *', async () => {
      console.log('\n⚡ QUICK SCAN TRIGGERED (Priority 1 categories)');
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
      
      try {
        const result = await this.scanner.quickScan();
        this.stats.totalRuns++;
        this.stats.totalGigsSaved += result.totalGigs || 0;
        this.stats.lastRun = new Date();
        
        console.log(`\n⚡ Quick scan complete: ${result.totalGigs} gigs saved\n`);
      } catch (error) {
        console.error('❌ Quick scan failed:', error.message);
      }
    });
    
    this.jobs.push({ name: 'Quick Scan', schedule: '*/30 * * * *', job: quickScanJob });
    
    // ===== JOB 2: FULL SCAN - Every 2 hours =====
    // Scans all categories systematically
    const fullScanJob = cron.schedule('0 */2 * * *', async () => {
      console.log('\n🔍 FULL SCAN TRIGGERED (All categories)');
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
      
      try {
        const result = await this.scanner.fullScan();
        this.stats.totalRuns++;
        this.stats.totalGigsSaved += result.totalGigsSaved || 0;
        this.stats.lastRun = new Date();
        
        console.log(`\n🔍 Full scan complete: ${result.totalGigsSaved} gigs saved\n`);
      } catch (error) {
        console.error('❌ Full scan failed:', error.message);
      }
    });
    
    this.jobs.push({ name: 'Full Scan', schedule: '0 */2 * * *', job: fullScanJob });
    
    // ===== JOB 3: DEEP SCAN - Every 6 hours =====
    // Comprehensive scan with more tweets per keyword
    const deepScanJob = cron.schedule('0 */6 * * *', async () => {
      console.log('\n🎯 DEEP SCAN TRIGGERED (Comprehensive)');
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
      
      try {
        const result = await this.scanner.scan({
          specificCategory: null,
          tweetsPerKeyword: 25,
          minScore: 45
        });
        
        this.stats.totalRuns++;
        this.stats.totalGigsSaved += result.totalGigsSaved || 0;
        this.stats.lastRun = new Date();
        
        console.log(`\n🎯 Deep scan complete: ${result.totalGigsSaved} gigs saved\n`);
      } catch (error) {
        console.error('❌ Deep scan failed:', error.message);
      }
    });
    
    this.jobs.push({ name: 'Deep Scan', schedule: '0 */6 * * *', job: deepScanJob });
    
    // ===== JOB 4: CATEGORY ROTATION - Every hour =====
    // Rotates through individual high-priority categories
    let categoryIndex = 0;
    const categories = ['topTier', 'community', 'socialMedia', 'contentCreation'];
    
    const categoryRotationJob = cron.schedule('0 * * * *', async () => {
      const category = categories[categoryIndex];
      categoryIndex = (categoryIndex + 1) % categories.length;
      
      console.log(`\n🔄 CATEGORY ROTATION: ${category}`);
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
      
      try {
        const result = await this.scanner.scan({
          specificCategory: category,
          tweetsPerKeyword: 20,
          minScore: 50
        });
        
        this.stats.totalRuns++;
        this.stats.totalGigsSaved += result.totalGigsSaved || 0;
        this.stats.lastRun = new Date();
        
        console.log(`\n🔄 Category scan complete: ${result.totalGigsSaved} gigs saved\n`);
      } catch (error) {
        console.error('❌ Category rotation failed:', error.message);
      }
    });
    
    this.jobs.push({ name: 'Category Rotation', schedule: '0 * * * *', job: categoryRotationJob });
    
    this.isRunning = true;
    
    console.log('✅ Scheduler started successfully!');
    console.log('\n📅 SCHEDULE:');
    console.log('   ⚡ Quick Scan:       Every 30 minutes');
    console.log('   🔍 Full Scan:        Every 2 hours');
    console.log('   🎯 Deep Scan:        Every 6 hours');
    console.log('   🔄 Category Rotation: Every hour\n');
    
    // Run initial quick scan
    setTimeout(() => {
      console.log('\n🚀 Running initial scan...\n');
      this.scanner.quickScan();
    }, 5000);
  }
  
  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Scheduler not running');
      return;
    }
    
    console.log('🛑 Stopping scheduler...');
    
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`   ✓ Stopped: ${name}`);
    });
    
    this.jobs = [];
    this.isRunning = false;
    
    console.log('✅ Scheduler stopped');
  }
  
  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.isRunning,
      stats: this.stats,
      jobs: this.jobs.map(({ name, schedule }) => ({ name, schedule })),
      scannerStats: this.scanner.getStats()
    };
  }
  
  /**
   * Manual trigger for testing
   */
  async manualScan(type = 'quick') {
    console.log(`\n🎯 Manual ${type} scan triggered...\n`);
    
    try {
      let result;
      
      switch (type) {
        case 'quick':
          result = await this.scanner.quickScan();
          break;
        case 'full':
          result = await this.scanner.fullScan();
          break;
        case 'deep':
          result = await this.scanner.scan({
            specificCategory: null,
            tweetsPerKeyword: 25,
            minScore: 45
          });
          break;
        default:
          throw new Error('Invalid scan type');
      }
      
      console.log(`\n✅ Manual ${type} scan complete\n`);
      return result;
      
    } catch (error) {
      console.error(`❌ Manual ${type} scan failed:`, error.message);
      throw error;
    }
  }
  
  /**
   * Scan specific category
   */
  async scanCategory(categoryName) {
    console.log(`\n🔍 Scanning category: ${categoryName}\n`);
    
    try {
      const result = await this.scanner.scan({
        specificCategory: categoryName,
        tweetsPerKeyword: 20,
        minScore: 50
      });
      
      console.log(`\n✅ Category scan complete: ${result.totalGigsSaved} gigs saved\n`);
      return result;
      
    } catch (error) {
      console.error(`❌ Category scan failed:`, error.message);
      throw error;
    }
  }
}

// Export singleton
module.exports = new ScannerScheduler();