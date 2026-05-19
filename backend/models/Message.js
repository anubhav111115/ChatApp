const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  message: { type: String, required: true },
  room: { type: String, required: true, default: "general" }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);