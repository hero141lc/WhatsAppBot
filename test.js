const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const QRCode = require('qrcode');
const { Client } = require('whatsapp-web.js');
const mongoose = require('mongoose');

const app = express();

// 设置 Express 中间件
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// 连接 MongoDB
mongoose.connect('mongodb://localhost/WhatsApp', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

// 定义用户模型
const User = mongoose.model('User', {
  username: String,
  password: String,
  whatsappAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppAccount' }],
});
const Admin = mongoose.model('Admin', {
    username: String,
    password: String,
    
});
  

// 定义 WhatsApp 账户模型
const WhatsAppAccount = mongoose.model('WhatsAppAccount', {
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  session: Object,
  // 添加其他属性，如备注、个性化回复等
  
});

// 配置 Passport 本地策略
passport.use(new LocalStrategy((username, password, done) => {
  User.findOne({ username, password }, (err, user) => {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'Incorrect username or password' });
    return done(null, user);
  });
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

// 配置 WhatsApp 客户端
const clients = {}; // 用于存储 WhatsApp 客户端实例

app.get('/', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  const user = req.user;

  if (user.isAdmin) {
    // 管理员首页
    // 显示所有用户信息、设置全局回复等
    // ...
  } else {
    // 普通用户首页
    // 显示用户的 WhatsApp 账户、功能等
    // ...
  }
});

app.get('/login', (req, res) => {
  res.render('login'); // 渲染登录页面
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true,
}));

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/login');
});

// 在这里添加其他路由和功能

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
