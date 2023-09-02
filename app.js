const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const User = require('./models/User'); // 自行创建 User 模型
const WhatsAppAccount = require('./models/WhatsAppAccount'); // 自行创建 WhatsAppAccount 模型
const AutoReply = require('./models/AutoReply');
const multer = require('multer');
const app = express();
const fs = require('fs/promises');
const { fork } = require('child_process');

//const upload = multer({ dest: 'uploads/' }); // 指定文件上传目录
app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());
app.use('/static', express.static('static'));
app.use(cookieParser());

mongoose.connect('mongodb://localhost/WhatsApp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.set('view engine', 'ejs');

// 用户登录页
app.get('/', (req, res) => {
    res.render('user-login', { error: '' }); // 创建 user-login.ejs 模板文件
});
app.get('/logout', (req, res) => {
    res.clearCookie('userId');
    res.render('user-login', { error: '' }); // 创建 user-login.ejs 模板文件
});
app.post('/dashboard', async(req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username, password });

        if (user) {
            res.cookie('userId', user.id);
            res.redirect('/dashboard'); // Replace 'dashboard' with the appropriate route
        } else {
            res.render('user-login', { error: '用户名或密码不正确' }); // Replace 'user-login' with the name of your EJS file
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('服务器错误');
    }
})

// 用户工作面板
app.get('/dashboard', async(req, res) => {
    const userId = req.cookies.userId;
    if (!userId) {
        res.redirect('/');
        return;
    }

    try {
        const accounts = await WhatsAppAccount.find({ userId }).exec();
        const user = await User.findById(userId).exec(); // 获取当前用户信息
        if (!accounts) {
            throw new Error('No WhatsApp accounts found');
        }

        res.render('dashboard', { userId, accounts, user, error: '' }); // 创建 dashboard.ejs 模板文件
    } catch (error) {
        console.error('Error retrieving dashboard data:', error);
        res.redirect('/');
    }
});

// 管理员登录页
app.get('/admin', (req, res) => {
    res.render('admin-login', { error: '' }); // 创建 admin-login.ejs 模板文件

});
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;

    // Assuming you have a hardcoded admin username and password
    const adminUsername = 'admin';
    const adminPassword = 'password';

    if (username === adminUsername && password === adminPassword) {
        // Set a cookie to remember that the user is logged in
        res.cookie('adminLoggedIn', true);

        // Redirect to the admin dashboard
        res.redirect('/admin/dashboard');
    } else {
        // If the username or password is incorrect, show an error message

        res.render('admin-login', { error: '用户名或密码错误' });
    }
});
// 管理后台
app.get('/admin/dashboard', async(req, res) => {
    console.log('sss', req.cookies.adminLoggedIn)
        // 获取所有用户信息和 WhatsApp 账号列表
    const adminLoggedIn = req.cookies.adminLoggedIn === 'true';
    if (adminLoggedIn) {
        const users = await User.find().sort({ _id: 1 })
        console.log(users)
        if (!users || users.length === 0) {
            users: [{
                name: '没有用户'
            }];
        }
        console.log(users)
        console.log(typeof users)

        const autoReplies = await AutoReply.find().sort({ _id: 1 }); // 获取所有自动回复数据
        console.log(autoReplies)
        const aiConfigT = await fs.readFile('ai.config', 'utf-8');
        console.log(JSON.parse(aiConfigT))
        return res.render('admin-dashboard', { users, autoReplies, aiConfig: JSON.parse(aiConfigT) });
        //res.status(200).json({ message: "Data found", users });



        //var_dump(iterator_to_array(users));

    } else {
        res.render('admin-login', { error: '没有权限访问' });
    }
});
// Add User route
app.post('/add_user', async(req, res) => {
    const { username, password } = req.body;
    console.log(req.body)
    try {
        const user = new User({
            username: username,
            password: password
        });
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            res.status(500).json({ message: 'Failed to add user' });
            return 1
        }
        await user.save();

        res.status(201).json({ message: 'User added successfully' });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({ message: 'Failed to add user' });
    }
});
// 删除用户接口
app.delete('/delete_user', async(req, res) => {
    const userId = req.query.id;

    try {
        const result = await User.findByIdAndDelete(userId);
        if (result) {
            res.json({ message: '用户删除成功' });
        } else {
            res.status(404).json({ message: '找不到用户' });
        }
    } catch (error) {
        res.status(500).json({ message: '删除用户时出错' });
    }
});

// 编辑用户信息接口
app.get('/edit_user', async(req, res) => {
    try {
        const userId = req.query.id; // 获取传递的用户 ID
        const user = await User.findById(userId); // 通过 ID 查询用户
        console.log(user)
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: '无法获取用户信息' });
    }
});

app.post('/edit_user', async(req, res) => {
    try {
        const userId = req.body.id;
        const newUsername = req.body.username;
        const newPassword = req.body.password;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        user.username = newUsername;
        user.password = newPassword;
        await user.save();

        res.redirect('/admin/dashboard'); // 或其他你想要跳转的页面
    } catch (error) {
        res.status(500).json({ error: '无法修改用户信息' });
    }
});

//处理自动回复
// app.get('/admin/dashboard', async (req, res) => {
//   try {
//     const autoReplies = await AutoReply.find(); // 获取所有自动回复数据
//     console.log(autoReplies)
//     res.render('admin-dashboard', { autoReplies }); // 渲染模板并传递自动回复数据
//   } catch (error) {
//     // 处理错误
//     res.status(500).send('服务器错误');
//   }
// });
// 处理新增/修改自动回复请求
// 设置存储上传文件的位置和文件名
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // 存储在 uploads/ 目录下
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname); // 使用唯一的文件名
    }
});

const upload = multer({ storage });

// 处理文件上传的路由
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '未选择文件' });
    }
    const filePath = req.file.path;
    res.status(200).json({ filePath });
});

// POST 请求用于新增自动回复
app.post('/add_auto_reply', async(req, res) => {
    const { triggerWord, replyType, replyValue } = req.body;

    try {
        const autoReply = new AutoReply({
            triggerWord,
            replyType,
            replyValue,
        });

        await autoReply.save();

        res.status(201).json({ message: '自动回复已保存' });
    } catch (error) {
        res.status(500).json({ error: '内部服务器错误' });
    }
});

// PUT 请求用于修改自动回复
app.put('/edit_auto_reply', async(req, res) => {
    console.log(req.body)
    const { id, triggerWord, replyType, replyValue } = req.body;

    try {
        const autoReply = await AutoReply.findByIdAndUpdate(id, {
            triggerWord,
            replyType,
            replyValue,
        });

        if (autoReply) {
            res.status(200).json({ message: '自动回复已修改' });
        } else {
            res.status(404).json({ message: '未找到自动回复' });
        }
    } catch (error) {
        res.status(500).json({ error: '内部服务器错误' });
    }
});
app.delete('/delete_auto_reply/:replyId', async(req, res) => {
    const replyId = req.params.replyId;

    try {
        // 在这里执行删除操作，根据 replyId 删除数据库中的自动回复
        // 例如，使用 Mongoose 删除自动回复：
        await AutoReply.findByIdAndDelete(replyId);

        res.status(200).json({ message: '自动回复已成功删除' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '删除自动回复时出错' });
    }
});



app.post('/save_ai_config', async(req, res) => {
    try {
        const { prompt } = req.body;
        const aiConfig = { prompt };
        await fs.writeFile('ai.config', JSON.stringify(aiConfig, null, 2), 'utf-8');
        res.status(200).send('配置已保存');
    } catch (error) {
        res.status(500).send('保存 AI 配置失败');
    }
});

app.post('/add_whatsapp_account', async(req, res) => {
    const { phone, nickName, customReply, autoReply, aiReply, alive, userId } = req.body;
    console.log(req.body)
    try {
        const newAccount = new WhatsAppAccount({
            phone,
            nickName,
            customReply,
            autoReply,
            aiReply,
            alive,
            userId
        });

        await newAccount.save();
        res.status(201).json({ message: '新账号已添加' });
    } catch (error) {
        console.error('Error adding new account', error);
        res.status(500).json({ error: '添加新账号时出错' });
    }
});
// 修改账号信息
app.post('/edit_whatsapp_account', async(req, res) => {
    const { accountId, phone, nickName, customReply, autoReply, aiReply } = req.body;
    console.log(req.body)
    try {
        // 根据 accountId 更新 WhatsApp 账号信息
        const updatedAccount = await WhatsAppAccount.findByIdAndUpdate(accountId, {
            phone,
            nickName,
            customReply,
            autoReply,
            aiReply,
        });

        if (updatedAccount) {
            // 更新成功
            res.status(200).json({ message: 'Account updated successfully' });
        } else {
            res.status(404).json({ message: 'Account not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 删除账号
app.get('/delete_account', async(req, res) => {
    const accountId = req.query.id;

    try {
        // 从 User 表中移除账号引用
        const userId = req.cookies.userId;
        await User.updateOne({ _id: userId }, { $pull: { whatsappAccounts: accountId } });

        // 删除 WhatsAppAccount 表中对应的账号
        await WhatsAppAccount.deleteOne({ _id: accountId });

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error deleting account', error);
        res.status(500).json({ error: '删除账号时出错' });
    }
});
// 存储客户端进程的对象
const clientProcesses = {};

// 启动 WhatsApp 客户端进程
const startClientProcess = (phoneNumber, sessionName, account) => {
    const childProcess = fork('./whatsappClient.js', [phoneNumber, sessionName, account]);
    console.log("assasda", account)
    childProcess.on('message', (message) => {
        console.log("sdajksdhjk", message)
        if (message.type === 'ready') {
            console.log(`WhatsApp client for ${phoneNumber} is ready.`);
        }
        if (message.type === 'qr') {
            console.log(`qr:::`, message.data);
            clientProcesses[phoneNumber].qr = message.data
        }
    });
    clientProcesses[phoneNumber] = childProcess;
};

// Express 路由处理登录请求
app.post('/login', (req, res) => {
    const { phoneNumber, sessionName, account } = req.body;
    startClientProcess(phoneNumber, sessionName, account);
    res.status(200).json({ message: 'Authenticated' });
});
// Express 路由处理停止自动回复请求
app.post('/stopAutoReply', (req, res) => {
    const { phoneNumber } = req.body;
    if (clientProcesses[phoneNumber]) {
        // 向子进程发送停止自动回复的消息
        clientProcesses[phoneNumber].send('stopAutoReply');
        res.status(200).json({ message: 'Auto reply stopped' });
    } else {
        res.status(404).json({ message: 'Client not found' });
    }
});
// Express route to handle reply status updates
app.post('/update_reply_status', (req, res) => {
    const { accountId, phoneNumber, replyType, newStatus } = req.body;

    if (clientProcesses[phoneNumber]) {
        const clientProcess = clientProcesses[phoneNumber];

        // Update the appropriate reply status based on replyType
        if (replyType === 'autoReply') {
            clientProcess.send({ type: 'updateAutoReply', accountId, newStatus });
        } else if (replyType === 'aiReply') {
            clientProcess.send({ type: 'updateAiReply', accountId, newStatus });
        }

        // Update the status in the database (assuming you have a MongoDB model for WhatsAppAccount)
        WhatsAppAccount.findByIdAndUpdate(accountId, {
            [replyType]: newStatus
        }, (err, updatedAccount) => {
            if (err) {
                res.status(500).json({ message: 'Error updating reply status in the database' });
            } else {
                res.status(200).json({ message: 'Reply status updated successfully' });
            }
        });
    } else {
        // Update the status in the database (assuming you have a MongoDB model for WhatsAppAccount)
        WhatsAppAccount.findByIdAndUpdate(accountId, {
            [replyType]: newStatus }, (err, updatedAccount) => {
            if (err) {
                res.status(500).json({ message: 'Error updating reply status in the database' });
            } else {
                res.status(200).json({ message: 'Reply status updated successfully' });
            }
        });
        res.status(200).json({ message: 'Client not found' });
    }
});

// 获取登录二维码路由
app.get('/get_qr_code', async(req, res) => {
    const { phoneNumber } = req.query;

    if (clientProcesses[phoneNumber]) {
        //clientProcesses[phoneNumber].send('getQrCodeData');
        qrCodeData = clientProcesses[phoneNumber].qr

        // clientProcesses[phoneNumber].on('message', (qrCodeData) => {
        if (qrCodeData) {
            res.status(200).json({ qrCodeData });
        } else {
            res.status(200).json({ message: 'QR code data not found' });
        }
        //});
    } else {
        res.status(404).json({ message: 'Client not found' });
    }
});

// 其他路由处理...

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});