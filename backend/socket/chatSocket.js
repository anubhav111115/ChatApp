const Message = require("../models/Message");

let onlineUsers = {};   // socketId  → username
let userSockets = {};   // username  → socketId  (most recent socket wins)

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    // ─── USER ONLINE ──────────────────────────────────────────────────────────
    socket.on("user_online", ({ username }) => {
      const oldSocketId = userSockets[username];

      // Clean up the old socket entry if it's a different socket
      if (oldSocketId && oldSocketId !== socket.id) {
        delete onlineUsers[oldSocketId];

        // FIX: also tell the old socket to stop — it may be a stale tab.
        // This prevents call signals going to a dead socket.
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          oldSocket.disconnect(true);
        }
      }

      onlineUsers[socket.id] = username;
      userSockets[username]   = socket.id;

      io.emit("online_users", Object.values(onlineUsers));
    });

    // ─── JOIN ROOM + CHAT HISTORY ─────────────────────────────────────────────
    socket.on("join_room", async ({ room }) => {
      try {
        const currentRooms = Array.from(socket.rooms);
        for (const r of currentRooms) {
          if (r !== socket.id && r !== "general" && r !== room) {
            socket.leave(r);
          }
        }

        socket.join(room);

        const messages = await Message.find({ room })
          .sort({ createdAt: 1 })
          .limit(100);

        socket.emit("chat_history", messages);
      } catch (err) {
        console.error("Join Room Error:", err);
      }
    });

    // ─── SEND MESSAGE ─────────────────────────────────────────────────────────
    socket.on("send_message", async (data) => {
      try {
        const { sender, message, room, fileData, _localId } = data;

        const savedMessage = await Message.create({
          sender,
          room,
          message:  message  || "",
          fileData: fileData || null,
        });

        const payload = {
          ...savedMessage.toObject(),
          createdAt: savedMessage.createdAt,
          _localId,
        };

        // Auto-join recipient's socket to private room if needed
        const roomParts = room.split("_");
        if (roomParts.length === 2) {
          const recipientUsername = roomParts.find(u => u !== sender);
          if (recipientUsername) {
            const recipientSocketId = userSockets[recipientUsername];
            if (recipientSocketId) {
              const recipientSocket = io.sockets.sockets.get(recipientSocketId);
              if (recipientSocket && !recipientSocket.rooms.has(room)) {
                recipientSocket.join(room);
                console.log(`Auto-joined ${recipientUsername} to room ${room}`);
              }
            }
          }
        }

        io.to(room).emit("receive_message", payload);

      } catch (err) {
        console.error("Send Message Error:", err);
      }
    });

    // ─── EDIT MESSAGE ─────────────────────────────────────────────────────────
    socket.on("edit_message", async ({ messageId, newMessage, room }) => {
      try {
        const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          { message: newMessage, edited: true },
          { new: true }
        );
        if (!updatedMessage) return;
        io.to(room).emit("message_edited", updatedMessage);
      } catch (err) {
        console.error("Edit Message Error:", err);
      }
    });

    // ─── DELETE MESSAGE ───────────────────────────────────────────────────────
    socket.on("delete_message", async ({ messageId, room }) => {
      try {
        const deletedMessage = await Message.findByIdAndUpdate(
          messageId,
          { deleted: true, message: "", fileData: null },
          { new: true }
        );
        if (!deletedMessage) return;
        io.to(room).emit("message_deleted", { messageId });
      } catch (err) {
        console.error("Delete Message Error:", err);
      }
    });

    // ─── CALL OFFER ───────────────────────────────────────────────────────────
    socket.on("call_offer", ({ to, from, type, offer }) => {
      const targetSocketId = userSockets[to];
      console.log(`call_offer: ${from} → ${to} (socket: ${targetSocketId})`);

      if (targetSocketId) {
        io.to(targetSocketId).emit("call_offer", { from, type, offer });
      } else {
        socket.emit("call_error", { message: `${to} is offline` });
      }
    });

    // ─── CALL ANSWER ──────────────────────────────────────────────────────────
    socket.on("call_answer", ({ to, answer }) => {
      const targetSocketId = userSockets[to];
      console.log(`call_answer: → ${to} (socket: ${targetSocketId})`);

      if (targetSocketId) {
        io.to(targetSocketId).emit("call_answer", { answer });
      }
    });

    // ─── CALL ICE ─────────────────────────────────────────────────────────────
    // FIX: log ICE routing so you can verify in server logs that candidates
    // are actually reaching the target. If targetSocketId is undefined here,
    // the user went offline between offer and ICE gathering.
    socket.on("call_ice", ({ to, candidate }) => {
      const targetSocketId = userSockets[to];
      if (targetSocketId) {
        io.to(targetSocketId).emit("call_ice", { candidate });
      } else {
        console.warn(`call_ice: target ${to} not found in userSockets`);
      }
    });

    // ─── CALL END ─────────────────────────────────────────────────────────────
    socket.on("call_end", ({ to }) => {
      const targetSocketId = userSockets[to];
      if (targetSocketId) {
        io.to(targetSocketId).emit("call_end");
      }
    });

    // ─── TYPING ───────────────────────────────────────────────────────────────
    socket.on("typing", ({ username, room }) => {
      socket.to(room).emit("user_typing", { username });
    });

    // ─── DISCONNECT ───────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const username = onlineUsers[socket.id];

      if (username) {
        // Only remove from userSockets if this is still the active socket
        // (a reconnect may have already registered a new socket for this user)
        if (userSockets[username] === socket.id) {
          delete userSockets[username];
        }
      }

      delete onlineUsers[socket.id];
      io.emit("online_users", Object.values(onlineUsers));

      console.log("Disconnected:", socket.id, username ?? "(unknown)");
    });
  });
};