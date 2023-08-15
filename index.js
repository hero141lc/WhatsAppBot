const { Client } = require('whatsapp-web.js');
const client = new Client({
	puppeteer: {
		args: ['--proxy-server=127.0.0.1:9910','--no-sandbox'],
	}
});
var qrImg=""
client.on('qr', (qr) => {
	qrImg=qr
    console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.initialize();

const express = require('express');
const qr = require('qrcode');

const app = express();
const port = 3000;

// 生成二维码并返回图像数据
app.get('/qrcode', async (req, res) => {
  try {
    const qrCodeData = qrImg; // 要生成二维码的数据
    const qrCodeImage = await qr.toDataURL(qrCodeData); // 生成二维码图像数据

    res.send(`<img src="${qrCodeImage}" alt="QR Code"/>`);
  } catch (error) {
    res.status(500).send('Error generating QR Code');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
