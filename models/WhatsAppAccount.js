// models/WhatsAppAccount.js
const mongoose = require('mongoose');

const whatsappAccountSchema = new mongoose.Schema({
  userId: String,
  phone: String,
  nickName: String,
  customReply: Array,
  autoReply: Boolean,
  aiReply: Boolean,
  alive: Boolean,
  lastLogin: Date
});

module.exports = mongoose.model('WhatsAppAccount', whatsappAccountSchema);
