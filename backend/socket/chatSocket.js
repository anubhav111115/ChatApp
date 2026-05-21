const Message = require("../models/Message");

let onlineUsers = {};   // socketId  → username
let userSockets = {};   // username  → socketId

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    // ─── USER ONLINE ──────────────────────────────────────────────────────────
    socket.on("user_online", ({ username }) => {
      // ── FIX: if this user was connected before, clean up the old socket ──
      const oldSocketId = userSockets[username];
      if (oldSocketId && oldSocketId !== socket.id) {
        delete onlineUsers[oldSocketId];
      }

      onlineUsers[socket.id] = username;
      userSockets[username]   = socket.id;

      io.emit("online_users", Object.values(onlineUsers));
    });

    // ─── JOIN ROOM + CHAT HISTORY ─────────────────────────────────────────────
    socket.on("join_room", async ({ room }) => {
      try {
        // Leave all previous private rooms (keep "general" if already in it).
        // This prevents a socket accumulating stale rooms across navigation.
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
          _localId,   // echo back so frontend can dedup the optimistic local copy
        };

        // ── FIX: for private rooms, ensure the OTHER user's socket is in the
        //    room before we broadcast, even if they haven't clicked on the chat.
        //    A private room ID is always "userA_userB" (sorted), so we can
        //    derive who the recipient is from the room name and the sender.
        const roomParts = room.split("_");
        if (roomParts.length === 2) {
          // It's a private DM room
          const recipientUsername = roomParts.find(u => u !== sender);
          if (recipientUsername) {
            const recipientSocketId = userSockets[recipientUsername];
            if (recipientSocketId) {
              const recipientSocket = io.sockets.sockets.get(recipientSocketId);
              if (recipientSocket && !recipientSocket.rooms.has(room)) {
                // Auto-join their socket so io.to(room) reaches them
                recipientSocket.join(room);
                console.log(`Auto-joined ${recipientUsername} to room ${room}`);
              }
            }
          }
        }

        // Now broadcast — reaches everyone in the room (sender + receiver)
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
      const targetSocket = userSockets[to];

      if (targetSocket) {
        io.to(targetSocket).emit("call_offer", { from, type, offer });
      } else {
        socket.emit("call_error", { message: `${to} is offline` });
      }
    });

    // ─── CALL ANSWER ──────────────────────────────────────────────────────────
    socket.on("call_answer", ({ to, answer }) => {
      const targetSocket = userSockets[to];
      if (targetSocket) {
        io.to(targetSocket).emit("call_answer", { answer });
      }
    });

    // ─── CALL ICE ─────────────────────────────────────────────────────────────
    socket.on("call_ice", ({ to, candidate }) => {
      const targetSocket = userSockets[to];
      if (targetSocket) {
        io.to(targetSocket).emit("call_ice", { candidate });
      }
    });

    // ─── CALL END ─────────────────────────────────────────────────────────────
    socket.on("call_end", ({ to }) => {
      const targetSocket = userSockets[to];
      if (targetSocket) {
        io.to(targetSocket).emit("call_end");
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
        // Only remove from userSockets if this socket is still the current one
        // (prevents a reconnect from wiping the new socket mapping)
        if (userSockets[username] === socket.id) {
          delete userSockets[username];
        }
      }

      delete onlineUsers[socket.id];

      io.emit("online_users", Object.values(onlineUsers));

      console.log("Disconnected:", socket.id, username);
    });
  });
};