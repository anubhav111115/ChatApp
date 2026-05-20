const Message = require("../models/Message");

let onlineUsers = {};
let userSockets = {};

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("user_online", ({ username }) => {
      onlineUsers[socket.id] = username;
      userSockets[username] = socket.id;
      io.emit("online_users", Object.values(onlineUsers));
    });

    socket.on("join_room", async ({ room }) => {
      socket.join(room);
      const messages = await Message.find({ room })
        .sort({ createdAt: 1 })
        .limit(50);
      socket.emit("chat_history", messages);
    });

    socket.on("send_message", async (data) => {
      try {
        const { sender, message, room, fileData } = data;
        const saved = await Message.create({
          sender,
          message: message || "",
          room,
          fileData: fileData || undefined,
        });
        io.to(room).emit("receive_message", saved);
      } catch (err) {
        console.error("Send Message Error:", err);
      }
    });

    socket.on("call_offer", ({ to, from, type, offer }) => {
      const targetSocket = userSockets[to];
      if (targetSocket) {
        io.to(targetSocket).emit("call_offer", { from, type, offer });
      } else {
        socket.emit("call_error", { message: `User ${to} is not online` });
      }
    });

    socket.on("call_answer", ({ to, answer }) => {
      const targetSocket = userSockets[to];
      if (targetSocket) io.to(targetSocket).emit("call_answer", { answer });
    });

    socket.on("call_ice", ({ to, candidate }) => {
      const targetSocket = userSockets[to];
      if (targetSocket) io.to(targetSocket).emit("call_ice", { candidate });
    });

    socket.on("call_end", ({ to }) => {
      const targetSocket = userSockets[to];
      if (targetSocket) io.to(targetSocket).emit("call_end");
    });

    socket.on("typing", ({ username, room }) => {
      socket.to(room).emit("user_typing", { username });
    });

    socket.on("disconnect", () => {
      const username = onlineUsers[socket.id];
      delete userSockets[username];
      delete onlineUsers[socket.id];
      io.emit("online_users", Object.values(onlineUsers));
      console.log("Disconnected:", socket.id, username);
    });
  });
};