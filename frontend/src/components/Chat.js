import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import "./Chat.css";

const socket = io("https://chatapp-16sp.onrender.com");
const COLORS = ["#6c63ff","#f78166","#3fb950","#d2a8ff","#ffa657","#79c0ff","#ff7b72","#43e8d8"];

function getColor(name) {
  let h = 0;
  for (let c of name) h = c.charCodeAt(0) + h;
  return COLORS[h % COLORS.length];
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getRoomId(a, b) {
  return [a, b].sort().join("_");
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function FileCard({ name, size, dataUrl, isDark }) {
  const color = isDark ? "#8b5cf6" : "#6d28d9";

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    return kb < 1024
      ? `${kb.toFixed(1)} KB`
      : `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.08)",
        marginTop: "8px",
      }}
    >
      <div>
        <div style={{ fontWeight: "600" }}>
          📄 {name}
        </div>
        <div style={{ fontSize: "12px", opacity: 0.7 }}>
          {formatSize(size)}
        </div>
      </div>

      <button
        onClick={handleDownload}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color,
          fontSize: "20px",
        }}
        title="Download file"
      >
        ⬇️
      </button>
    </div>
  );
}

// ── WebRTC Call UI ──────────────────────────────────────────────────────────
function CallOverlay({ call, user, onEnd, isDark }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const streamRef = useRef(null);

  useEffect(() => {
    if (call.stream && localVideoRef.current) {
      localVideoRef.current.srcObject = call.stream;
    }
  }, [call.stream]);

  useEffect(() => {
    if (call.remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = call.remoteStream;
    }
  }, [call.remoteStream]);

  useEffect(() => {
    if (call.status !== "active") return;
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, [call.status]);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const toggleMute = () => {
    if (call.stream) {
      call.stream.getAudioTracks().forEach(t => t.enabled = muted);
      setMuted(!muted);
    }
  };

  const toggleCam = () => {
    if (call.stream) {
      call.stream.getVideoTracks().forEach(t => t.enabled = camOff);
      setCamOff(!camOff);
    }
  };

  const isVideo = call.type === "video";
  const isIncoming = call.direction === "incoming";
  const isPending = call.status === "pending";

  return (
    <div className="call-overlay">
      <div className={`call-panel ${isDark ? "dark" : "light"}`}>
        {isVideo && call.status === "active" ? (
          <div className="call-video-wrap">
            <video ref={remoteVideoRef} autoPlay playsInline className="call-remote-video" />
            <video ref={localVideoRef} autoPlay playsInline muted className="call-local-video" />
          </div>
        ) : (
          <div className="call-avatar-wrap">
            <div className="call-avatar" style={{ background: getColor(call.peer) }}>
              {call.peer[0].toUpperCase()}
            </div>
            <div className="call-pulse" />
          </div>
        )}

        <div className="call-peer-name">{call.peer}</div>

        {isPending && isIncoming && (
          <div className="call-status-text">Incoming {isVideo ? "video" : "voice"} call…</div>
        )}
        {isPending && !isIncoming && (
          <div className="call-status-text">Calling…</div>
        )}
        {call.status === "active" && (
          <div className="call-status-text call-timer">{fmt(duration)}</div>
        )}

        <div className="call-controls">
          {call.status === "active" && (
            <>
              <button className={`call-ctrl-btn ${muted ? "off" : ""}`} onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
                {muted ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                )}
              </button>
              {isVideo && (
                <button className={`call-ctrl-btn ${camOff ? "off" : ""}`} onClick={toggleCam} title={camOff ? "Camera on" : "Camera off"}>
                  {camOff ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"/><path d="M15 13a3 3 0 1 1-4.24-4.24"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  )}
                </button>
              )}
            </>
          )}

          {isPending && isIncoming && (
            <button className="call-ctrl-btn accept" onClick={() => onEnd("accept")} title="Accept">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.88a16 16 0 0 0 6.21 6.21l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
          )}

          <button className="call-ctrl-btn end" onClick={() => onEnd("end")} title="End call">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.01 2.02l1.87-1.87a1 1 0 0 1 1-.25 11 11 0 0 0 3.44.87 1 1 0 0 1 .88 1v3.46a1 1 0 0 1-.91 1 17 17 0 0 1-16.05-16.05A1 1 0 0 1 4.83 3h3.45a1 1 0 0 1 1 .88 11 11 0 0 0 .87 3.44 1 1 0 0 1-.25 1L8.03 10.2a16 16 0 0 0 2.65 3.11z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Settings Panel ──────────────────────────────────────────────────────────
function SettingsPanel({ user, onLogout, onClose, isDark }) {
  const [newUsername, setNewUsername] = useState(user.username);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleSave = async () => {
    if (!currentPass) return showMsg("error", "Enter your current password to save changes");
    if (newPass && newPass !== confirmPass) return showMsg("error", "New passwords do not match");
    if (newPass && newPass.length < 4) return showMsg("error", "New password must be at least 4 characters");
    setLoading(true);
    try {
      await axios.post("https://chatapp-16sp.onrender.com/api/auth/update", {
        username: user.username,
        currentPassword: currentPass,
        newUsername: newUsername !== user.username ? newUsername : undefined,
        newPassword: newPass || undefined,
      });
      showMsg("success", "Changes saved! Please login again.");
      setTimeout(() => onLogout(), 1500);
    } catch (err) {
      showMsg("error", err.response?.data?.error || "Failed to save changes");
    }
    setLoading(false);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className={`settings-panel ${isDark ? "dark" : "light"}`} onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">Settings</div>
          <button className="settings-close" onClick={onClose}>&#x2715;</button>
        </div>
        <div className="settings-avatar-row">
          <div className="settings-avatar" style={{ background: getColor(user.username) }}>
            {user.username[0].toUpperCase()}
          </div>
          <div className="settings-avatar-info">
            <div className="settings-uname">{user.username}</div>
            <div className="settings-ustatus">Online</div>
          </div>
        </div>
        <div className="settings-divider" />
        <div className="settings-section-label">Account</div>
        <div className="settings-field">
          <label className="settings-label">Username</label>
          <input className="settings-input" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="New username" />
        </div>
        <div className="settings-section-label" style={{ marginTop: 8 }}>Change Password</div>
        <div className="settings-field">
          <label className="settings-label">Current Password</label>
          <div className="settings-input-wrap">
            <input className="settings-input" type={showCurrent ? "text" : "password"} value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="Required to save changes" />
            <button className="settings-eye" onClick={() => setShowCurrent(!showCurrent)}>{showCurrent ? "Hide" : "Show"}</button>
          </div>
        </div>
        <div className="settings-field">
          <label className="settings-label">New Password</label>
          <div className="settings-input-wrap">
            <input className="settings-input" type={showNew ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Leave blank to keep current" />
            <button className="settings-eye" onClick={() => setShowNew(!showNew)}>{showNew ? "Hide" : "Show"}</button>
          </div>
        </div>
        <div className="settings-field">
          <label className="settings-label">Confirm New Password</label>
          <div className="settings-input-wrap">
            <input className="settings-input" type={showConfirm ? "text" : "password"} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repeat new password" />
            <button className="settings-eye" onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? "Hide" : "Show"}</button>
          </div>
        </div>
        {msg && <div className={`settings-msg ${msg.type}`}>{msg.text}</div>}
        <button className="settings-save-btn" onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
        <div className="settings-divider" />
        <button className="settings-logout-btn" onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
}

// ── Main Chat ───────────────────────────────────────────────────────────────
function Chat({ user, onLogout, theme, toggleTheme }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeRoom, setActiveRoom] = useState("general");
  const [activeRoomName, setActiveRoomName] = useState("General Chat");
  const [search, setSearch] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [attachPreview, setAttachPreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);

  // Call state
  const [call, setCall] = useState(null); // { peer, type, direction, status, stream, remoteStream }
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceCandidateBuffer = useRef([]);
  const activeRoomRef = useRef("general");
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const fileInputRef = useRef(null);
  const activeRoomNameRef = useRef("General Chat");

  const EMOJIS = ["😀","😂","🔥","❤️","👍","🎉","😎","🤔","💯","🚀","😊","🙌","✨","😅","🤣","💪","🥳","😍","🤩","👏"];
  const isDark = theme === "dark";

  // ── WebRTC helpers ──
  const ICE_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ],
  };
  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  const createPC = useCallback((peer) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("call_ice", { to: peer, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      setCall(prev => prev ? { ...prev, remoteStream: e.streams[0], status: "active" } : prev);
    };
    pcRef.current = pc;
    return pc;
  }, []);

  const startCall = async (peer, type) => {
    if (call) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
    localStreamRef.current = stream;
    const pc = createPC(peer);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("call_offer", { to: peer, from: user.username, type, offer });
    setCall({ peer, type, direction: "outgoing", status: "pending", stream });
  };

  const handleCallEnd = async (action) => {
    if (action === "accept" && call) {
      // Accept incoming call
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: call.type === "video" });
      localStreamRef.current = stream;
      const pc = createPC(call.peer);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(call._offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call_answer", { to: call.peer, answer });
      setCall(prev => ({ ...prev, stream, status: "active" }));
    } else {
      socket.emit("call_end", { to: call?.peer });
      stopLocalStream();
      setCall(null);
    }
  };

  // ── Socket: online users ──
  useEffect(() => {
    socket.emit("user_online", { username: user.username });
    const interval = setInterval(() => socket.emit("user_online", { username: user.username }), 5000);
    socket.on("online_users", (users) => setOnlineUsers(users.filter(u => u !== user.username)));
    return () => { clearInterval(interval); socket.off("online_users"); };
  }, [user.username]);

  // ── Socket: messages ──
  useEffect(() => {
    const handleMessage = (msg) => {
      if (msg.room === activeRoomRef.current) {
        setMessages(prev => [...prev, { ...msg, time: getTime() }]);
      } else if (msg.sender !== user.username) {
        setUnreadCounts(prev => ({ ...prev, [msg.room]: (prev[msg.room] || 0) + 1 }));
      }
    };
    socket.on("receive_message", handleMessage);
    return () => socket.off("receive_message", handleMessage);
  }, [user.username]);

  // ── Socket: WebRTC signaling ──
  useEffect(() => {
    socket.on("call_offer", async ({ from, type, offer }) => {
      setCall({ peer: from, type, direction: "incoming", status: "pending", _offer: offer });
    });
    socket.on("call_answer", async ({ answer }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(answer);
        setCall(prev => prev ? { ...prev, status: "active" } : prev);
      }
    });
    socket.on("call_ice", async ({ candidate }) => {
      if (pcRef.current) {
        try { await pcRef.current.addIceCandidate(candidate); } catch {}
      }
    });
    socket.on("call_end", () => {
      stopLocalStream();
      setCall(null);
    });
    return () => {
      socket.off("call_offer");
      socket.off("call_answer");
      socket.off("call_ice");
      socket.off("call_end");
    };
  }, []);

  // ── Room switch ──
  useEffect(() => {
    activeRoomRef.current = activeRoom;
    socket.emit("join_room", { room: activeRoom });
    setMessages([]);
    setIsTyping(false);
    setUnreadCounts(prev => ({ ...prev, [activeRoom]: 0 }));
    socket.off("chat_history");
    socket.off("user_typing");
    socket.on("chat_history", (history) => {
      const formatted = history.map((m) => ({
        ...m,
        time: new Date(m.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      }));
    
      setMessages(formatted);
    });
    socket.on("user_typing", ({ username }) => {
      if (username !== user.username) {
        setTypingUser(username);
        setIsTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setIsTyping(false), 2000);
      }
    });
  }, [activeRoom, user.username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const switchRoom = (roomId, roomName) => {
    setActiveRoom(roomId);
    setActiveRoomName(roomName);
    activeRoomNameRef.current = roomName;
    setIsTyping(false);
    setAttachment(null);
    setAttachPreview(null);
    setShowEmojiPicker(false);
    setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }));
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    socket.emit("typing", { username: user.username, room: activeRoom });
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachment({ name: file.name, size: file.size, type: file.type, dataUrl: ev.target.result, isImage });
      if (isImage) setAttachPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addEmoji = (emoji) => {
    setText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const sendMessage = () => {
    if (!text.trim() && !attachment) return;
  
    const msgData = {
      sender: user.username,
      room: activeRoom,
      message: text.trim(),
    };
  
    // FIXED attachment sending
    if (attachment) {
      msgData.fileData = {
        name: attachment.name,
        size: attachment.size,
        type: attachment.type,
        data: attachment.dataUrl, // <-- changed from dataUrl to data
        isImage: attachment.isImage,
      };
    }
  
    socket.emit("send_message", msgData);
  
    setText("");
    setAttachment(null);
    setAttachPreview(null);
  
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  
    setShowEmojiPicker(false);
  };

  const filteredUsers = onlineUsers.filter(u => u.toLowerCase().includes(search.toLowerCase()));
  const showGeneral = "general chat".includes(search.toLowerCase()) || search === "";
  const activePeerForCall = activeRoom !== "general" ? activeRoomName : null;

  return (
    <div className={`chat-bg ${isDark ? "dark" : "light"}`}>
      <div className="chat-container">

        {/* Lightbox */}
        {lightboxImg && (
          <div className="lightbox" onClick={() => setLightboxImg(null)}>
            <img src={lightboxImg} alt="full" className="lightbox-img" />
            <button className="lightbox-close" onClick={() => setLightboxImg(null)}>✕</button>
          </div>
        )}

        {/* Call overlay */}
        {call && (
          <CallOverlay call={call} user={user} onEnd={handleCallEnd} isDark={isDark} />
        )}

        {showSettings && (
          <SettingsPanel user={user} onLogout={onLogout} onClose={() => setShowSettings(false)} isDark={isDark} />
        )}

        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="brand-logo">💬</div>
            <span className="brand-label">ChatApp</span>
            <button className="icon-btn theme-btn" onClick={toggleTheme} title={isDark ? "Light mode" : "Dark mode"}>
              {isDark ? "☀️" : "🌙"}
            </button>
            <button className="icon-btn settings-btn" onClick={() => setShowSettings(true)} title="Settings">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>

          <div className="sidebar-user">
            <div className="my-av" style={{ background: getColor(user.username) }}>
              {user.username[0].toUpperCase()}
            </div>
            <div className="my-info">
              <div className="my-name">{user.username}</div>
              <div className="my-status"><span className="online-dot" />Online</div>
            </div>
          </div>

          <div className="search-wrap">
            <span className="search-ico">🔍</span>
            <input className="search-inp" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="search-clear" onClick={() => setSearch("")}>✕</button>}
          </div>

          <div className="sidebar-scroll">
            {showGeneral && (
              <>
                <div className="section-lbl">Rooms</div>
                <div className={`contact ${activeRoom === "general" ? "active" : ""}`} onClick={() => switchRoom("general", "General Chat")}>
                  <div className="contact-av" style={{ background: "linear-gradient(135deg,#6c63ff,#9b8fff)", fontSize: 18, width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>💬</div>
                  <div className="contact-info">
                    <div className="contact-name">General Chat</div>
                    <div className="contact-last">Everyone can chat here</div>
                  </div>
                  {unreadCounts["general"] > 0 && <div className="unread-badge">{unreadCounts["general"]}</div>}
                </div>
              </>
            )}

            <div className="section-lbl">Online — {filteredUsers.length}</div>
            {filteredUsers.length === 0 && search === "" && <div className="empty-users">No other users online</div>}
            {filteredUsers.length === 0 && search !== "" && <div className="empty-users">No results for "{search}"</div>}

            {filteredUsers.map((u, i) => {
              const roomId = getRoomId(user.username, u);
              return (
                <div key={i} className={`contact ${activeRoom === roomId ? "active" : ""}`} onClick={() => switchRoom(roomId, u)}>
                  <div className="contact-av-wrap">
                    <div className="contact-av" style={{ background: getColor(u) }}>{u[0].toUpperCase()}</div>
                    <span className="online-badge" />
                  </div>
                  <div className="contact-info">
                    <div className="contact-name">{u}</div>
                    <div className="contact-last online-text">Online</div>
                  </div>
                  {unreadCounts[roomId] > 0 && <div className="unread-badge">{unreadCounts[roomId]}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main */}
        <div className="chat-main">
          <div className="chat-header">
            <div className="ch-av" style={{ background: activeRoom === "general" ? "linear-gradient(135deg,#6c63ff,#9b8fff)" : getColor(activeRoomName), fontSize: activeRoom === "general" ? 20 : 16 }}>
              {activeRoom === "general" ? "💬" : activeRoomName[0].toUpperCase()}
            </div>
            <div className="ch-info">
              <div className="ch-name">{activeRoomName}</div>
              <div className="ch-status">
                <span className="online-dot" />
                {activeRoom === "general" ? `${onlineUsers.length + 1} members online` : "Private · End-to-end encrypted"}
              </div>
            </div>
            {/* Call buttons — only in private DMs */}
            {activeRoom !== "general" && (
              <div className="ch-actions">
                <button className="call-icon-btn voice" onClick={() => startCall(activeRoomName, "voice")} title="Voice call">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.88a16 16 0 0 0 6.21 6.21l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </button>
                <button className="call-icon-btn video" onClick={() => startCall(activeRoomName, "video")} title="Video call">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                </button>
              </div>
            )}
          </div>

          <div className="messages" onClick={() => setShowEmojiPicker(false)}>
            {messages.length === 0 && (
              <div className="empty-chat">
                <div className="empty-icon">{activeRoom === "general" ? "💬" : "🔒"}</div>
                <p className="empty-title">{activeRoom === "general" ? "Welcome to General Chat!" : `Private chat with ${activeRoomName}`}</p>
                <p className="empty-sub">Be the first to say hello</p>
              </div>
            )}

            {messages.map((msg, i) => {
              const mine = msg.sender === user.username;
              const showName = i === 0 || messages[i - 1]?.sender !== msg.sender;
              const showAv = i === messages.length - 1 || messages[i + 1]?.sender !== msg.sender;
              return (
                <div key={i} className={`msg-row ${mine ? "mine" : ""}`}>
                  {!mine && (
                    <div className="msg-av" style={{ background: getColor(msg.sender), opacity: showAv ? 1 : 0 }}>
                      {msg.sender[0].toUpperCase()}
                    </div>
                  )}
                  <div className="bwrap">
                    {!mine && showName && <div className="bsender" style={{ color: getColor(msg.sender) }}>{msg.sender}</div>}
                    <div className={`bubble ${mine ? "mine" : "theirs"}`}>
                      {/* Image attachment */}
{msg.fileData?.isImage && (
  <img
    src={msg.fileData.data}
    alt={msg.fileData.name}
    className="bubble-img clickable"
    onClick={() => setLightboxImg(msg.fileData.data)}
  />
)}

{/* File attachment */}
{msg.fileData && !msg.fileData.isImage && (
  <a
    href={msg.fileData.data}
    download={msg.fileData.name}
    target="_blank"
    rel="noreferrer"
    style={{
      color: "#8b5cf6",
      textDecoration: "none",
      display: "block",
      marginTop: "8px"
    }}
  >
    📄 {msg.fileData.name}
  </a>
)}
                      {/* Legacy image support */}
                      {msg.image && !msg.fileData && (
                        <img src={msg.image} alt="attachment" className="bubble-img clickable" onClick={() => setLightboxImg(msg.image)} />
                      )}
                      {msg.message && <span className="btext">{msg.message}</span>}
                      <span className="btime">{msg.time}</span>
                    </div>
                  </div>
                  {mine && (
                    <div className="msg-av" style={{ background: getColor(msg.sender) }}>
                      {msg.sender[0].toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="msg-row">
                <div className="msg-av" style={{ background: getColor(typingUser) }}>{typingUser[0]?.toUpperCase()}</div>
                <div className="bubble theirs typing-bubble">
                  <span className="tdot" /><span className="tdot" /><span className="tdot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Attachment preview bar */}
          {attachment && (
            <div className="attach-preview">
              {attachment.isImage ? (
                <img src={attachment.dataUrl} alt="preview" className="attach-img" />
              ) : (
                <div className="attach-file-preview">
                  <span className="attach-file-icon">📄</span>
                  <div>
                    <div className="attach-fname">{attachment.name}</div>
                    <div className="attach-fsize">{formatBytes(attachment.size)}</div>
                  </div>
                </div>
              )}
              <button className="attach-remove" onClick={removeAttachment}>Remove</button>
            </div>
          )}

          {showEmojiPicker && (
            <div className="emoji-picker">
              {EMOJIS.map((em, i) => (
                <button key={i} className="emoji-opt" onClick={() => addEmoji(em)}>{em}</button>
              ))}
            </div>
          )}

          <div className="input-area">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx" />
            <button className="input-icon-btn" title="Attach file" onClick={() => fileInputRef.current.click()}>📎</button>
            <button className={`input-icon-btn ${showEmojiPicker ? "active" : ""}`} title="Emoji" onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}>😊</button>
            <textarea className="msg-input" placeholder={`Message ${activeRoomName}...`} value={text} onChange={handleTyping} onKeyDown={handleKey} rows={1} />
            <button className={`send-btn ${(text.trim() || attachment) ? "ready" : ""}`} onClick={sendMessage} disabled={!text.trim() && !attachment}>
              &#x27A4;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;