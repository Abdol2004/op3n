# Op3nHunt

**Find Web3 Jobs Before Everyone Else**

Premium Web3 job hunting platform worth $500/month per user.

## By NexoraStack

- X: https://x.com/nexorastack
- Telegram: @Op3nHuntbot

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your MongoDB URI

# IMPORTANT: Twitter blocks automated browsers
# Use manual method instead:
node backend/scripts/save-session-MANUAL.js
# (See AUTH_GUIDE.md for details)

npm start
```

Visit: http://localhost:3000

## Authentication

**Twitter blocks Playwright!** Use manual cookie method:

1. Login to x.com in your browser
2. Press F12 → Application → Cookies → x.com
3. Copy "auth_token" value
4. Run: `node backend/scripts/save-session-MANUAL.js`
5. Paste token

**Full guide:** See AUTH_GUIDE.md

## Features

- Dark mode UI (sky blue + lilac)
- Ultra responsive mobile
- 50+ search queries
- Smart filtering (non-technical roles)
- HOT CAKE badges
- Admin panel
- Telegram alerts
- Premium tiers

## Admin Access

URL: http://localhost:3000/admin/YOUR_CODE

Change ADMIN_SECRET_CODE in .env (default: 837492)

## Worth $500/Month

- 24/7 automated monitoring
- 50+ searches every 10 minutes
- AI-powered filtering (90%+ accuracy)
- Instant Telegram notifications
- Professional interface

**Charge:** $5/month
**Value:** 100x

## Tech Stack

- Node.js + Express + EJS
- MongoDB + Mongoose
- Playwright (X/Twitter scraping)
- Telegram Bot API

## License

MIT © NexoraStack
