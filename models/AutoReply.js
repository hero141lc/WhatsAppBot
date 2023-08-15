const mongoose = require('mongoose');

const autoReplySchema = new mongoose.Schema({
  triggerWord: String,
  replyType: String,
  replyValue: String
});

const AutoReply = mongoose.model('AutoReply', autoReplySchema);

module.exports = AutoReply;
