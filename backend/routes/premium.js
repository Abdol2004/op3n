const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/premium', requireAuth, (req, res) => {
  res.render('pages/premium', {
    title: 'Premium',
    price: process.env.PREMIUM_PRICE || 5
  });
});

module.exports = router;
