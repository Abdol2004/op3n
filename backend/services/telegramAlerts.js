const TelegramBot = require('node-telegram-bot-api');
const User = require('../models/User');

class Op3nHuntBot {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.paymentAddress = process.env.PAYMENT_ADDRESS || '0xAbc1234567890deABCdef1234567890aBCDef';
    this.adminChatId = process.env.ADMIN_TELEGRAM_ID;
    
    if (!this.botToken) {
      console.log('⚠️ Telegram bot token not found');
      return;
    }
    
    this.bot = new TelegramBot(this.botToken, { polling: true });
    this.pendingPayments = new Map();
    this.setupHandlers();
    console.log('✅ Telegram Bot initialized');
  }
  
  setupHandlers() {
    // Handle polling errors
    this.bot.on('polling_error', (error) => {
      console.error('❌ Telegram polling error:', error.message);
    });

    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      
      const welcomeMessage = `
🎯 <b>Welcome to Op3nHunt Premium!</b>

Get unlimited access to Web3 opportunities:
✅ Unlimited gig views daily
✅ Early access to hot cake gigs
✅ Real-time Telegram alerts
✅ Priority support

💰 <b>Subscription Price:</b> $5/monthly
💳 <b>Payment Address:</b>
<code>${this.paymentAddress}</code>

📋 <b>How to Subscribe:</b>
1. Send payment to the address above
2. Use /subscribe command
3. Provide your transaction ID
4. Provide your Op3nHunt username
5. Wait for confirmation (usually within 1-2 hours)

Type /subscribe when ready to upgrade!
      `;
      
      try {
        await this.bot.sendMessage(chatId, welcomeMessage, { 
          parse_mode: 'HTML',
          reply_markup: {
            keyboard: [['/subscribe'], ['/help'], ['/status']],
            resize_keyboard: true
          }
        });
      } catch (error) {
        console.error(`Failed to send welcome message to ${chatId}:`, error.message);
      }
    });
    
    // Subscribe command
    this.bot.onText(/\/subscribe/, async (msg) => {
      const chatId = msg.chat.id;
      
      this.pendingPayments.set(chatId, { step: 'waiting_txid' });
      
      try {
        await this.bot.sendMessage(chatId, `
💳 <b>Payment Address:</b>
<code>${this.paymentAddress}</code>

After making payment, please send your <b>Transaction ID</b>
        `, { 
          parse_mode: 'HTML',
          reply_markup: { remove_keyboard: true }
        });
      } catch (error) {
        console.error(`Failed to send subscribe message to ${chatId}:`, error.message);
      }
    });
    
    // Status command
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.from.username;
      
      try {
        const user = await User.findOne({ 
          $or: [
            { telegramChatId: chatId.toString() },
            { telegramUsername: username }
          ]
        });
        
        if (!user) {
          await this.bot.sendMessage(chatId, `
❌ No account found linked to this Telegram.

Please complete the subscription process using /subscribe
          `);
          return;
        }
        
        const isPremium = user.isActivePremium();
        const statusMessage = isPremium
          ? `✅ <b>Premium Active</b>\n\n👤 Username: ${user.username}\n🎯 Status: Premium Member\n⏰ Valid Until: ${user.premiumUntil ? new Date(user.premiumUntil).toLocaleDateString() : 'Lifetime'}`
          : `⚠️ <b>Free Account</b>\n\n👤 Username: ${user.username}\n🎯 Status: Free Tier\n📊 Daily Limit: 20 views\n\nUpgrade now with /subscribe`;
        
        await this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'HTML' });
        
      } catch (error) {
        console.error('Status check error:', error);
        if (error.message.includes('blocked')) {
          // User blocked the bot - silently fail
          console.log(`User ${chatId} has blocked the bot`);
        } else {
          await this.bot.sendMessage(chatId, '❌ Error checking status. Please try again.');
        }
      }
    });
    
    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        await this.bot.sendMessage(chatId, `
📚 <b>Op3nHunt Bot Commands</b>

/start - Start and see welcome message
/subscribe - Subscribe to Premium
/status - Check your subscription status
/help - Show this help message

💬 <b>Need Support?</b>
Contact: @Zayy_nab
        `, { parse_mode: 'HTML' });
      } catch (error) {
        console.error(`Failed to send help message to ${chatId}:`, error.message);
      }
    });
    
    // Handle text messages (for payment flow)
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;
      
      if (text?.startsWith('/')) return;
      
      const pending = this.pendingPayments.get(chatId);
      if (!pending) return;
      
      try {
        // Step 1: Waiting for Transaction ID
        if (pending.step === 'waiting_txid') {
          this.pendingPayments.set(chatId, { 
            step: 'waiting_username',
            txid: text
          });
          
          await this.bot.sendMessage(chatId, `
✅ Transaction ID received: <code>${text}</code>

Now, please send your <b>Op3nHunt username</b>
          `, { parse_mode: 'HTML' });
          return;
        }
        
        // Step 2: Waiting for Username
        if (pending.step === 'waiting_username') {
          const txid = pending.txid;
          const username = text;
          
          const user = await User.findOne({ username });
          
          if (!user) {
            await this.bot.sendMessage(chatId, `
❌ Username "${username}" not found in our system.

Please make sure you've registered at Op3nHunt first, then try again with /subscribe
            `);
            this.pendingPayments.delete(chatId);
            return;
          }
          
          user.telegramChatId = chatId.toString();
          user.telegramUsername = msg.from.username;
          await user.save();
          
          await this.bot.sendMessage(chatId, `
✅ <b>Payment Submission Received!</b>

📋 <b>Details:</b>
- Transaction ID: <code>${txid}</code>
- Username: ${username}
- Telegram: @${msg.from.username || 'N/A'}

⏳ Your payment is being verified by our admin.
You'll receive a confirmation within 1-2 hours.

Thank you for upgrading to Op3nHunt Premium! 🚀
          `, { parse_mode: 'HTML' });
          
          if (this.adminChatId) {
            await this.bot.sendMessage(this.adminChatId, `
🔔 <b>NEW PREMIUM SUBSCRIPTION REQUEST</b>

👤 <b>User:</b> ${username}
📱 <b>Telegram:</b> @${msg.from.username || 'N/A'}
💳 <b>Transaction ID:</b> <code>${txid}</code>
🆔 <b>Chat ID:</b> <code>${chatId}</code>

<b>To approve, use admin panel or command:</b>
<code>/approve ${username}</code>
            `, { parse_mode: 'HTML' });
          }
          
          this.pendingPayments.delete(chatId);
        }
      } catch (error) {
        console.error('Payment flow error:', error);
        if (!error.message.includes('blocked')) {
          await this.bot.sendMessage(chatId, '❌ An error occurred. Please try again with /subscribe');
        }
      }
    });
    
    // Admin approve command
    this.bot.onText(/\/approve (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      
      if (chatId.toString() !== this.adminChatId) {
        await this.bot.sendMessage(chatId, '❌ Unauthorized');
        return;
      }
      
      const username = match[1];
      
      try {
        const user = await User.findOne({ username });
        
        if (!user) {
          await this.bot.sendMessage(chatId, `❌ User "${username}" not found`);
          return;
        }
        
        user.isPremium = true;
        user.premiumUntil = null;
        await user.save();
        
        await this.bot.sendMessage(chatId, `
✅ <b>${username}</b> upgraded to Premium!

The user will be notified automatically.
        `, { parse_mode: 'HTML' });
        
        if (user.telegramChatId) {
          try {
            await this.bot.sendMessage(user.telegramChatId, `
🎉 <b>PAYMENT CONFIRMED!</b>

Welcome to Op3nHunt Premium! 🚀

✅ Your account has been upgraded
✅ Unlimited gig views activated
✅ Real-time alerts enabled
✅ Priority support unlocked

Start exploring: http://localhost:3000/dashboard

Thank you for your support! 💪
            `, { parse_mode: 'HTML' });
          } catch (error) {
            if (error.message.includes('blocked')) {
              console.log(`User ${username} has blocked the bot - cannot send confirmation`);
            } else {
              console.error('Error notifying user:', error.message);
            }
          }
        }
        
      } catch (error) {
        console.error('Approve error:', error);
        await this.bot.sendMessage(chatId, '❌ Error approving user');
      }
    });
  }
  
  async sendGigAlert(chatId, gig) {
    if (!this.bot) return false;
    
    try {
      const scoreIcon = gig.score >= 80 ? '🔥' : gig.score >= 60 ? '⭐' : '💼';
      const hotCake = gig.isHotCake ? ' [HOT CAKE]' : '';
      const verified = gig.author?.verified ? '✓' : '';
      
      let message = `
${scoreIcon} <b>New Gig Alert [${gig.score}/100]${hotCake}</b>

<b>@${gig.author?.username || 'Unknown'}</b> ${verified}

${gig.text.substring(0, 300)}${gig.text.length > 300 ? '...' : ''}

📊 ${gig.engagement?.likes || 0} likes • ${gig.engagement?.retweets || 0} RTs • ${gig.engagement?.replies || 0} replies
`;
      
      if (gig.links && gig.links.length > 0) {
        message += `\n🔗 ${gig.links[0]}`;
      }
      
      message += `\n\n<a href="${gig.url}">View on X →</a>`;
      
      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'HTML',
        disable_web_page_preview: false
      });
      
      return true;
    } catch (error) {
      if (error.message.includes('blocked')) {
        console.log(`User ${chatId} has blocked the bot - skipping alert`);
        // Optionally: Remove their telegram chat ID from database
        await User.updateOne(
          { telegramChatId: chatId.toString() },
          { $unset: { telegramChatId: '' } }
        );
      } else {
        console.error('Error sending alert:', error.message);
      }
      return false;
    }
  }
}

module.exports = Op3nHuntBot;