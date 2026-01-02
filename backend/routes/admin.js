const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Gig = require('../models/Gig');

const ADMIN_CODE = process.env.ADMIN_SECRET_CODE || '837492';

router.get(`/admin/${ADMIN_CODE}`, async (req, res) => {
  try {
    const stats = {
      totalUsers: await User.countDocuments(),
      premiumUsers: await User.countDocuments({ isPremium: true }),
      totalGigs: await Gig.countDocuments(),
      todayGigs: await Gig.countDocuments({
        firstSeen: { $gte: new Date(new Date().setHours(0,0,0,0)) }
      }),
      hotCakeGigs: await Gig.countDocuments({ isHotCake: true })
    };
    
    const premiumUsers = await User.find({ isPremium: true }).sort({ createdAt: -1 });
    const recentGigs = await Gig.find().sort({ firstSeen: -1 }).limit(50);
    
    res.render('pages/admin', { 
      title: 'Admin Panel',
      stats, 
      premiumUsers, 
      recentGigs, 
      adminCode: ADMIN_CODE 
    });
  } catch (error) {
    console.error('Admin error:', error);
    res.status(500).send('Admin error');
  }
});

router.post(`/admin/${ADMIN_CODE}/make-premium`, express.json(), async (req, res) => {
  try {
    const { username, telegramUsername, telegramChatId } = req.body;
    
    const updateData = {
      isPremium: true,
      premiumUntil: null
    };
    
    // Only update telegram fields if provided
    if (telegramUsername) updateData.telegramUsername = telegramUsername;
    if (telegramChatId) updateData.telegramChatId = telegramChatId;
    
    const user = await User.findOneAndUpdate(
      { username },
      updateData,
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Make premium error:', error);
    res.status(500).json({ error: 'Failed to make user premium' });
  }
});

router.post(`/admin/${ADMIN_CODE}/delete-gig/:id`, async (req, res) => {
  try {
    await Gig.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete gig error:', error);
    res.status(500).json({ error: 'Failed to delete gig' });
  }
});

module.exports = router;