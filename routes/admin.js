// routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 管理员登录页
router.get('/', (req, res) => {
  res.render('admin/login');
});

// 管理员登录逻辑
router.post('/login', (req, res) => {
  // 根据管理员账号密码进行验证
  const adminUsername = 'admin'; // 根据实际情况修改
  const adminPassword = 'admin'; // 根据实际情况修改
  if (req.body.username === adminUsername && req.body.password === adminPassword) {
    req.session.isAdmin = true;
    res.redirect('/admin/dashboard');
  } else {
    res.redirect('/admin');
  }
});

// 管理员工作面板
router.get('/dashboard', async (req, res) => {
  if (req.session.isAdmin) {
    // 获取所有用户信息
    const users = await User.find({});
    res.render('admin/dashboard', { users });
  } else {
    res.redirect('/admin');
  }
});

// 更多路由和逻辑代码...

module.exports = router;
