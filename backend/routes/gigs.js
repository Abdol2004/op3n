const express = require('express');
const router = express.Router();
const Gig = require('../models/Gig');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    
    // Get ALL gigs (or a reasonable limit like 100)
    const allGigs = await Gig.find()
      .sort({ isHotCake: -1, score: -1, firstSeen: -1 })
      .limit(100);
    
    res.render('pages/dashboard', {
      title: 'Dashboard',
      gigs: allGigs,
      totalGigs: allGigs.length,
      isPremium: user.isActivePremium(),
      dailyViews: user.dailyGigsViewed,
      dailyLimit: 20
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Track when user actually views a gig (clicks to X)
router.post('/view-gig/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user has reached daily limit (only for non-premium)
    if (!user.isActivePremium() && !user.checkDailyLimit()) {
      return res.status(403).json({ 
        error: 'Daily limit reached',
        limitReached: true 
      });
    }
    
    // Increment view count for non-premium users
    if (!user.isActivePremium()) {
      user.dailyGigsViewed += 1;
      await user.save();
    }
    
    res.json({ 
      success: true,
      remaining: user.isActivePremium() ? 'unlimited' : (20 - user.dailyGigsViewed)
    });
  } catch (error) {
    console.error('View gig error:', error);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

router.get('/saved', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const savedGigIds = user.savedGigs.map(g => g.gigId);
    const gigs = await Gig.find({ _id: { $in: savedGigIds } });
    
    res.render('pages/saved', {
      title: 'Saved Gigs',
      gigs
    });
  } catch (error) {
    console.error('Saved gigs error:', error);
    res.status(500).send('Error loading saved gigs');
  }
});

router.post('/save-gig/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    
    // Check daily limit for non-premium users
    if (!user.isActivePremium() && !user.checkDailyLimit()) {
      return res.status(403).json({ 
        error: 'Daily limit reached. Upgrade to Premium for unlimited access!',
        limitReached: true 
      });
    }
    
    if (!user.savedGigs.find(g => g.gigId === req.params.id)) {
      user.savedGigs.push({
        gigId: req.params.id,
        status: 'saved',
        savedAt: new Date()
      });
      
      // Count as interaction for non-premium users
      if (!user.isActivePremium()) {
        user.dailyGigsViewed += 1;
      }
      
      await user.save();
    }
    
    res.json({ 
      success: true,
      remaining: user.isActivePremium() ? 'unlimited' : (20 - user.dailyGigsViewed)
    });
  } catch (error) {
    console.error('Save gig error:', error);
    res.status(500).json({ error: 'Failed to save gig' });
  }
});

router.post('/apply-gig/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    
    // Check daily limit for non-premium users
    if (!user.isActivePremium() && !user.checkDailyLimit()) {
      return res.status(403).json({ 
        error: 'Daily limit reached. Upgrade to Premium for unlimited access!',
        limitReached: true 
      });
    }
    
    const savedGig = user.savedGigs.find(g => g.gigId === req.params.id);
    
    if (savedGig) {
      savedGig.status = 'applied';
    } else {
      user.savedGigs.push({
        gigId: req.params.id,
        status: 'applied',
        savedAt: new Date()
      });
    }
    
    // Count as interaction for non-premium users
    if (!user.isActivePremium()) {
      user.dailyGigsViewed += 1;
    }
    
    await user.save();
    
    res.json({ 
      success: true,
      remaining: user.isActivePremium() ? 'unlimited' : (20 - user.dailyGigsViewed)
    });
  } catch (error) {
    console.error('Apply gig error:', error);
    res.status(500).json({ error: 'Failed to mark as applied' });
  }
});

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    res.render('pages/profile', {
      title: 'Profile',
      user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).send('Error loading profile');
  }
});

module.exports = router;