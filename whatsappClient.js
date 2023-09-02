const { Client } = require('whatsapp-web.js');

// 从命令行参数获取 phoneNumber 和 sessionName
const [phoneNumber, sessionName] = process.argv.slice(2);

const client = new Client({
    puppeteer: {
        args: [
            '--proxy-server=socks5://127.0.0.1:1080',
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ],
    }
});

let qrCodeData = '';
let autoReplyEnabled = true;

// 监听进程消息
// 监听进程消息
process.on('message', async(message) => {
    if (message === 'stopAutoReply') {
        autoReplyEnabled = false;
    }
    if (message === 'getQrCodeData') {
        if (qrCodeData) {
            process.send({ type: 'qrCodeData', data: qrCodeData }); // 发送登录二维码数据给主进程
        }
    }
    if (message.type === 'updateAutoReply') {
        const { accountId, newStatus } = message;

        // Update autoReply status for the account with accountId
        // For example, if you're using an array to store account data
        const accountToUpdate = accounts.find(account => account.id === accountId);

        if (accountToUpdate) {
            accountToUpdate.autoReply = newStatus;

            // Update the database or perform any other relevant logic here
            // For example, you can update a database entry
            // UpdateAutoReplyStatusInDatabase(accountId, newStatus);
        }
    }

    if (message.type === 'updateAiReply') {
        const { accountId, newStatus } = message;

        // Update aiReply status for the account with accountId
        // For example, if you're using an array to store account data
        const accountToUpdate = accounts.find(account => account.id === accountId);

        if (accountToUpdate) {
            accountToUpdate.aiReply = newStatus;

            // Update the database or perform any other relevant logic here
            // For example, you can update a database entry
            // UpdateAiReplyStatusInDatabase(accountId, newStatus);
        }
    }

});
client.initialize();
client.on('error', (error) => {
    console.error('Error in client:', error);
    // 处理错误逻辑
    // ...
});
client.on('authenticated', () => {
    console.log('authenticated');
    process.send({ type: 'authenticated' });
});

client.on('ready', () => {
    console.log('ready');
    process.send({ type: 'ready' });
});
client.on('qr', (qr) => {
    qrCodeData = qr; // 存储登录二维码数据
    //console.log(qr);
    process.send({ type: "qr", data: qr });
});

client.on('message', async(msg) => {
    if (autoReplyEnabled) {
        const { from, body } = msg;

        // Check if the triggerWord is contained within the message body
        const autoReply = await AutoReply.findOne({ triggerWord: { $in: body } }).exec();

        if (autoReply) {
            // 自动回复触发词
            const reply = autoReply.reply;
            clients[phoneNumber].sendMessage(from, reply);
            const message = new Message({ user: from, text: body, reply });
            await message.save();
        } else {
            // 请求 AI 接口
            const aiResponse = await axios.post('http://127.0.0.1:8000', {
                prompt: body,
                history: [ /* array of previous messages */ ],
            });

            const aiReply = aiResponse.data; // 获取 AI 回复
            clients[phoneNumber].sendMessage(from, aiReply);
            const message = new Message({ user: from, text: body, reply: aiReply });
            await message.save();
        }
    }
});