const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      default: "",
    },

    room: {
      type: String,
      required: true,
      default: "general",
    },

    fileData: {
      name: String,
      size: Number,
      type: String,
      dataUrl: String,
      isImage: Boolean,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);