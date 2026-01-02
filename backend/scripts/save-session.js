const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

console.log('⚠️  IMPORTANT: Twitter/X blocks automated browsers!');
console.log('');
console.log('If you get "This browser or app may not be secure" error,');
console.log('use one of these alternative methods instead:');
console.log('');
console.log('METHOD 1 (Easiest):');
console.log('  node backend/scripts/save-session-MANUAL.js');
console.log('');
console.log('METHOD 2 (Cookie-Editor):');
console.log('  node backend/scripts/save-session-FIXED.js');
console.log('');
console.log('Press CTRL+C to cancel, or press Enter to try anyway...');
console.log('');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Press Enter to continue: ', async () => {
  rl.close();
  
  console.log('Opening browser...');
  
  try {
    const browser = await chromium.launch({ 
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Try to hide automation
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    await page.goto('https://x.com/login');
    
    console.log('');
    console.log('Please login manually in the browser window');
    console.log('Press Enter here after you have logged in successfully');
    
    const rl2 = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise(resolve => {
      rl2.question('', () => {
        rl2.close();
        resolve();
      });
    });
    
    const authPath = path.join(__dirname, '../data/auth.json');
    const dataDir = path.join(__dirname, '../data');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    await context.storageState({ path: authPath });
    
    console.log('');
    console.log('✅ Authentication saved successfully!');
    console.log(`   Saved to: ${authPath}`);
    
    await browser.close();
    
    console.log('');
    console.log('You can now run: npm start');
    
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('This method failed. Please use the alternative methods:');
    console.error('  node backend/scripts/save-session-MANUAL.js');
    console.error('  OR');
    console.error('  node backend/scripts/save-session-FIXED.js');
  }
});
