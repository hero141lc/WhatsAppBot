// routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const WhatsAppAccount = require('../models/WhatsAppAccount');

// 用户登录页
router.get('/', (req, res) => {
  res.render('user/login');
});

// 用户登录逻辑
router.post('/login', async (req, res) => {
  // 根据用户名和密码查询用户
  const user = await User.findOne({ username: req.body.username, password: req.body.password });
  if (user) {
    // 用户登录成功，设置 session 并重定向到用户工作面板
    req.session.user = user;
    res.redirect('/user/dashboard');
  } else {
    res.redirect('/');
  }
});

// 用户工作面板
router.get('/dashboard', async (req, res) => {
  // 根据当前用户的 whatsappAccounts 查询账户信息
  const user = await User.findById(req.session.user._id).populate('whatsappAccounts');
  res.render('user/dashboard', { user });
});

// 更多路由和逻辑代码...

module.exports = router;
