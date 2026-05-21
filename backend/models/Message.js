const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender:  { type: String, required: true },
    message: { type: String, default: "" },
    room:    { type: String, required: true, default: "general" },
    fileData: {
      name:    { type: String },
      size:    { type: Number },
      type:    { type: String },
      data:    { type: String },
      isImage: { type: Boolean },
    },
    edited:  { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);