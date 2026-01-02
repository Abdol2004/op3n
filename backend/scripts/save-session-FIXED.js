const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Op3nHunt - X/Twitter Authentication (FIXED METHOD)');
console.log('==================================================');
console.log('');
console.log('Twitter blocks automated browsers, so we use a different method:');
console.log('');
console.log('STEP 1: Install "Cookie-Editor" extension in your browser');
console.log('  - Chrome: https://chrome.google.com/webstore (search "Cookie-Editor")');
console.log('  - Firefox: https://addons.mozilla.org (search "Cookie-Editor")');
console.log('');
console.log('STEP 2: Login to X/Twitter in your browser normally');
console.log('  - Go to https://x.com/login');
console.log('  - Login with your account');
console.log('');
console.log('STEP 3: Export cookies');
console.log('  - Click Cookie-Editor extension icon');
console.log('  - Click "Export" button');
console.log('  - Copy all the JSON');
console.log('');
console.log('STEP 4: Save to file');
console.log('  - Create file: backend/data/cookies.json');
console.log('  - Paste the JSON you copied');
console.log('  - Save the file');
console.log('');
console.log('STEP 5: Run this script again');
console.log('  - node backend/scripts/save-session-FIXED.js');
console.log('');

// Check if cookies.json exists
const cookiesPath = path.join(__dirname, '../data/cookies.json');
const authPath = path.join(__dirname, '../data/auth.json');

if (!fs.existsSync(cookiesPath)) {
  console.log('⚠️  cookies.json not found!');
  console.log('');
  console.log('Follow the steps above, then run this script again.');
  console.log('');
  rl.close();
  process.exit(0);
}

console.log('✅ cookies.json found!');
console.log('Converting to auth.json format...');

try {
  const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
  
  // Convert to Playwright format
  const playwrightCookies = Array.isArray(cookies) ? cookies : [cookies];
  
  const authData = {
    cookies: playwrightCookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain || '.x.com',
      path: c.path || '/',
      expires: c.expirationDate || -1,
      httpOnly: c.httpOnly || false,
      secure: c.secure || true,
      sameSite: c.sameSite || 'None'
    })),
    origins: []
  };
  
  // Ensure data directory exists
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(authPath, JSON.stringify(authData, null, 2));
  
  console.log('✅ Authentication saved successfully!');
  console.log(`   Saved to: ${authPath}`);
  console.log('');
  console.log('You can now run: npm start');
  console.log('');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('');
  console.log('Make sure cookies.json contains valid JSON from Cookie-Editor');
}

rl.close();
