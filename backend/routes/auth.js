const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/register', (req, res) => {
  res.render('pages/register', { title: 'Register', error: null });
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.render('pages/register', { 
        title: 'Register', 
        error: 'Username or email already exists' 
      });
    }
    
    const user = await User.create({ username, email, password });
    
    // Store only the user ID in session
    req.session.userId = user._id;
    
    res.redirect('/dashboard');
  } catch (error) {
    res.render('pages/register', { 
      title: 'Register', 
      error: 'Registration failed' 
    });
  }
});

router.get('/login', (req, res) => {
  res.render('pages/login', { title: 'Login', error: null });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.render('pages/login', { 
        title: 'Login', 
        error: 'Invalid email or password' 
      });
    }
    
    // Store only the user ID in session
    req.session.userId = user._id;
    
    res.redirect('/dashboard');
  } catch (error) {
    res.render('pages/login', { 
      title: 'Login', 
      error: 'Login failed' 
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;