// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  whatsappAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppAccount' }]
});

module.exports = mongoose.model('User', userSchema);
