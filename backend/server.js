const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Socket.io CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Express Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));

// Test Route
app.get("/", (req, res) => {
  res.send("Chat Server is Running!");
});

// TEMP ROUTE - CLEAR ALL CHAT MESSAGES
app.get("/clear-messages", async (req, res) => {
  try {
    const result = await Message.deleteMany({});

    res.json({
      success: true,
      message: "All chat messages deleted",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Clear Messages Error:", err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Socket
require("./socket/chatSocket")(io);

// MongoDB + Start Server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB Error:", err);
  });