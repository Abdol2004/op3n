const User = require('../models/User');

async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.redirect('/login');
    }
    req.user = user; // Attach user to request
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.redirect('/login');
  }
}

async function requirePremium(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  try {
    const user = await User.findById(req.session.userId);
    if (!user || !user.isActivePremium()) {
      return res.redirect('/premium');
    }
    req.user = user; // Attach user to request
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.redirect('/login');
  }
}

module.exports = { requireAuth, requirePremium };