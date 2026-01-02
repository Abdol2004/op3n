const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Op3nHunt - Manual Cookie Method');
console.log('================================');
console.log('');
console.log('EASY METHOD - Just copy/paste cookies:');
console.log('');
console.log('1. Login to https://x.com in your browser');
console.log('2. Press F12 (open DevTools)');
console.log('3. Go to "Application" or "Storage" tab');
console.log('4. Click "Cookies" → "https://x.com"');
console.log('5. Find cookie named "auth_token"');
console.log('6. Copy its VALUE');
console.log('');

rl.question('Paste your auth_token value here: ', (authToken) => {
  
  rl.question('Paste your ct0 token value (optional, press Enter to skip): ', (ct0) => {
    
    if (!authToken || authToken.trim() === '') {
      console.log('');
      console.log('❌ auth_token is required!');
      rl.close();
      return;
    }
    
    const cookies = [
      {
        name: 'auth_token',
        value: authToken.trim(),
        domain: '.x.com',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: 'None'
      }
    ];
    
    if (ct0 && ct0.trim() !== '') {
      cookies.push({
        name: 'ct0',
        value: ct0.trim(),
        domain: '.x.com',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: true,
        sameSite: 'Lax'
      });
    }
    
    const authData = {
      cookies: cookies,
      origins: []
    };
    
    const authPath = path.join(__dirname, '../data/auth.json');
    const dataDir = path.join(__dirname, '../data');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(authPath, JSON.stringify(authData, null, 2));
    
    console.log('');
    console.log('✅ Authentication saved successfully!');
    console.log(`   Saved to: ${authPath}`);
    console.log('');
    console.log('You can now run: npm start');
    console.log('');
    
    rl.close();
  });
});
