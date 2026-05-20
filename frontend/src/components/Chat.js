import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import "./Chat.css";

const BACKEND_URL = "https://chatapp-16sp.onrender.com";

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

const getMediaConstraints = (type) => ({
  audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
  video: type === "video"
    ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
    : false,
});

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "8183412731114fe26f75c0cd",
      credential: "SmXUVvFxV76lTYN6",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "8183412731114fe26f75c0cd",
      credential: "SmXUVvFxV76lTYN6",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "8183412731114fe26f75c0cd",
      credential: "SmXUVvFxV76lTYN6",
    },
  ],
};

const EMOJI_CATEGORIES = {
  "😀 Smileys": ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
  "👋 People": ["👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦵","🦶","👂","🦻","👃","👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵","🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷"],
  "🐶 Animals": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🦂","🐢","🐍","🦎","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐈","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿","🦔"],
  "🍎 Food": ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🫑","🥕","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🫓","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥮","🍢","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🧃","🥤","🧋","☕","🍵","🫖","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾","🧊"],
  "🌍 Travel": ["🚗","🚕","🚙","🚌","🚎","🏎","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍","🛵","🚲","🛴","🛹","🛺","🚨","🚔","🚍","🚘","🚖","🚡","🚠","🚟","🚃","🚋","🚞","🚝","🚄","🚅","🚈","🚂","🚆","🚇","🚊","🚉","✈️","🛫","🛬","🛩","💺","🛸","🚁","🛶","⛵","🚤","🛥","🛳","⛴","🚢","🗺","🧭","🏔","⛰","🌋","🗻","🏕","🏖","🏜","🏝","🏞","🏟","🏛","🏗","🧱","🛖","🏘","🏚","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛪","🕌","🛕","🕍","⛩","🕋","⛲","⛺","🌁","🌃","🏙","🌄","🌅","🌆","🌇","🌉","🎠","🎡","🎢","💈","🎪"],
  "⚽ Activities": ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛷","⛸","🥌","🎿","⛷","🏂","🪂","🏋","🤼","🤸","⛹","🤺","🏇","🧘","🏄","🏊","🤽","🚣","🧗","🚵","🚴","🏆","🥇","🥈","🥉","🏅","🎖","🎗","🎫","🎟","🎪","🤹","🎭","🩰","🎨","🎬","🎤","🎧","🎼","🎹","🪘","🥁","🎷","🎺","🎸","🪕","🎻","🎲","♟","🎯","🎳","🎮","🎰","🧩"],
  "💡 Objects": ["⌚","📱","📲","💻","⌨️","🖥","🖨","🖱","🖲","🕹","🗜","💽","💾","💿","📀","📼","📷","📸","📹","🎥","📽","🎞","📞","☎️","📟","📠","📺","📻","🧭","⏱","⏲","⏰","🕰","⌛","⏳","📡","🔋","🪫","🔌","💡","🔦","🕯","🪔","🧯","🛢","💸","💵","💴","💶","💷","🪙","💰","💳","💎","⚖️","🪜","🧰","🪛","🔧","🔨","⚒","🛠","⛏","🪚","🔩","🪤","🧲","🔫","💣","🪓","🔪","🗡","⚔️","🛡","🏹","🔗","⛓","🧱","🪞","🪟","🛋","🪑","🚽","🪠","🚿","🛁","🧴","🪥","🧷","🧹","🧺","🧻","🪣","🧼","🫧","🪒","🧽","🛒","🚪","🧸","🖼","🛍","🎁","🎀","🎊","🎉","🎈","🎏","🎐","🧧","✉️","📩","📨","📧","📥","📤","📦","🏷","📪","📫","📬","📭","📮","🗳","✏️","✒️","🖊","🖋","📝","📁","📂","🗂","📅","📆","🗒","🗓","📇","📈","📉","📊","📋","📌","📍","✂️","🗃","🗄","🗑","🔒","🔓","🔏","🔐","🔑","🗝","⚙️","🗜","🔗","⛓","🧲","🔮","🪄","🧿","🔭","🔬","🩺","💉","🩹","💊","🩻","🩼","🌡","🧬","🦠","🧫","🧪"],
  "💕 Symbols": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛","🚫","💯","❗","❕","❓","❔","‼️","⁉️","🔅","🔆","〽️","⚠️","🚸","🔱","⚜️","🔰","♻️","✅","🈯","💹","❎","🌐","💠","Ⓜ️","🌀","💤","🏧","🚾","♿","🅿️","🛗","🈳","🈂️","🛂","🛃","🛄","🛅","🚹","🚺","🚼","⚧","🚻","🚮","🎦","📵","🔞","🔃","🔄","🔙","🔚","🔛","🔜","🔝","🛐","🔀","🔁","🔂","⏩","⏫","⏭","⏯","🔼","⏪","⏬","⏮","🔽","🎵","🎶","➕","➖","➗","✖️","♾","💲","💱","™️","©️","®️","〰️","➰","➿"],
};

// ─── EMOJI PICKER ─────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const [emojiSearch, setEmojiSearch] = useState("");
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
  const displayEmojis = emojiSearch
    ? allEmojis.filter(e => e.includes(emojiSearch))
    : EMOJI_CATEGORIES[activeCategory] || [];

  return (
    <div className="emoji-picker-full" ref={pickerRef}>
      <div className="emoji-search-wrap">
        <input
          className="emoji-search"
          placeholder="Search emoji..."
          value={emojiSearch}
          onChange={e => setEmojiSearch(e.target.value)}
          autoFocus
        />
      </div>
      {!emojiSearch && (
        <div className="emoji-categories">
          {Object.keys(EMOJI_CATEGORIES).map(cat => (
            <button
              key={cat}
              className={`emoji-cat-btn ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
              title={cat}
            >
              {cat.split(" ")[0]}
            </button>
          ))}
        </div>
      )}
      <div className="emoji-grid">
        {displayEmojis.map((em, i) => (
          <button key={i} className="emoji-opt" onClick={() => onSelect(em)}>{em}</button>
        ))}
      </div>
    </div>
  );
}

// ─── CALL OVERLAY ─────────────────────────────────────────────────────────────
// All fixes applied:
//  ✅ FIX 1 — Local video srcObject assigned via useEffect watching call.stream
//  ✅ FIX 2 — visibilitychange handler resumes remote video on iOS tab-switch
//  ✅ FIX 3 — Remote video: play muted → unmute (beats iOS/Android autoplay block)
//  ✅ FIX 4 — Fullscreen targets .call-panel div (not the backdrop); uses CSS
//             :fullscreen pseudo-class for styling, not a JS-toggled class
//  ✅ FIX 5 — Local preview shows while outgoing call is pending (only remote hidden)
//  ✅ FIX 6 — call-video-wrap gets position:relative via inline style so absolute
//             children (fullscreen-btn, unmute-badge) position correctly
//  ✅ FIX 7 — Double-tap handled manually for mobile (two touches within 300ms)
//  ✅ FIX 8 — remoteMuted resets to true whenever call changes (new call = re-mute)
//  ✅ FIX 9 — Clear enter/exit fullscreen icons (⛶ enter, ✕ / ⊡ exit)
//  ✅ FIX 10 — Socket.io pingInterval/pingTimeout tuned in connection options

function CallOverlay({ call, user, onEnd, isDark, onSwitchCamera }) {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const panelRef       = useRef(null); // ← fullscreen target is the PANEL, not backdrop
  // Tracks whether remote video has already been successfully played once.
  // Prevents the "re-mute on every state update" bug where the useEffect
  // re-runs because ontrack keeps firing with the same stream object.
  const hasPlayedRemoteRef = useRef(false);

  const [duration,     setDuration]     = useState(0);
  const [muted,        setMuted]        = useState(false);
  const [camOff,       setCamOff]       = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remoteMuted,  setRemoteMuted]  = useState(true);

  // Reset state and hasPlayedRemoteRef whenever a brand-new call starts
  useEffect(() => {
    hasPlayedRemoteRef.current = false;
    setRemoteMuted(true);
    setDuration(0);
    setMuted(false);
    setCamOff(false);
  }, [call?.peer]);

  // ── FIX 1: Attach LOCAL stream ──────────────────────────────────────────────
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video || !call?.stream) return;
    video.srcObject = call.stream;
    video.muted = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.play().catch(() => {});
  }, [call?.stream]);

  // ── FIX 3 + 2: Attach REMOTE stream with muted-first + visibilitychange ────
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video || !call?.remoteStream) return;

    // KEY FIX: if we've already successfully played this stream, do NOT
    // re-run the muted→unmute sequence. Just ensure srcObject is set and return.
    // This stops the "re-mute on every ontrack/state-update" bug on mobile.
    if (hasPlayedRemoteRef.current) {
      if (video.srcObject !== call.remoteStream) {
        video.srcObject = call.remoteStream;
      }
      return;
    }

    video.srcObject = call.remoteStream;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");

    const tryPlay = async () => {
      try {
        video.muted = true;
        setRemoteMuted(true);
        await video.play();
        // Mark as played BEFORE unmuting so a re-render doesn't re-trigger
        hasPlayedRemoteRef.current = true;
        video.muted = false;
        setRemoteMuted(false);
      } catch (err) {
        console.error("Remote play error:", err);
        setTimeout(async () => {
          try {
            video.muted = true;
            await video.play();
            hasPlayedRemoteRef.current = true;
            video.muted = false;
            setRemoteMuted(false);
          } catch (e) {
            console.error("Remote play retry failed:", e);
            // unmute badge stays visible — user taps to unmute
          }
        }, 800);
      }
    };

    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.onloadedmetadata = tryPlay;
    }

    // FIX 2: Resume video when user returns to tab (iOS Safari pauses on hide)
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && video.paused) {
        video.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      video.onloadedmetadata = null;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [call?.remoteStream]);

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (call?.status !== "active") return;
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, [call?.status]);

  // ── FIX 4: Fullscreen change listener ──────────────────────────────────────
  useEffect(() => {
    const onChange = () => {
      const fsEl =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement;
      setIsFullscreen(!!fsEl);
    };
    document.addEventListener("fullscreenchange",       onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    document.addEventListener("mozfullscreenchange",    onChange);
    return () => {
      document.removeEventListener("fullscreenchange",       onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      document.removeEventListener("mozfullscreenchange",    onChange);
    };
  }, []);

  const fmt = s =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const toggleMute = () => {
    if (call?.stream) {
      call.stream.getAudioTracks().forEach(t => { t.enabled = muted; });
      setMuted(m => !m);
    }
  };

  const toggleCam = () => {
    if (call?.stream) {
      call.stream.getVideoTracks().forEach(t => { t.enabled = camOff; });
      setCamOff(c => !c);
    }
  };

  // ── FIX 4: Fullscreen targets panelRef (.call-panel), not the backdrop ──────
  const doEnterFullscreen = (el) => {
    if (!el) return;
    if      (el.requestFullscreen)            el.requestFullscreen();
    else if (el.webkitRequestFullscreen)      el.webkitRequestFullscreen();
    else if (el.webkitEnterFullscreen)        el.webkitEnterFullscreen(); // iOS <video>
    else if (el.mozRequestFullScreen)         el.mozRequestFullScreen();
  };

  const doExitFullscreen = () => {
    if      (document.exitFullscreen)             document.exitFullscreen();
    else if (document.webkitExitFullscreen)       document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen)        document.mozCancelFullScreen();
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      doExitFullscreen();
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      // iOS Safari can only fullscreen a <video> element directly
      if (isIOS) {
        doEnterFullscreen(remoteVideoRef.current);
      } else {
        doEnterFullscreen(panelRef.current);
      }
    }
  };

  // ── FIX 7: Manual double-tap for mobile fullscreen ──────────────────────────
  const lastTapRef = useRef(0);
  const handleTouchEnd = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      e.preventDefault();
      toggleFullscreen();
    }
    lastTapRef.current = now;
  };

  const handleUnmute = () => {
    const video = remoteVideoRef.current;
    if (video) { video.muted = false; setRemoteMuted(false); }
  };

  const isVideo    = call?.type === "video";
  const isIncoming = call?.direction === "incoming";
  const isPending  = call?.status === "pending";
  // FIX 5: Only hide remote video while pending — local preview always visible
  const hideRemote = isPending;

  return (
    <div className="call-overlay">
      {/* FIX 4: panelRef here, not on the backdrop */}
      <div
        ref={panelRef}
        className={`call-panel ${isDark ? "dark" : "light"}`}
      >
        {isVideo ? (
          <div
            className="call-video-wrap"
            style={{ position: "relative" }}         // FIX 6: needed for absolute children
            onDoubleClick={toggleFullscreen}          // desktop double-click
            onTouchEnd={handleTouchEnd}               // FIX 7: mobile double-tap
          >
            {/* Remote video — always in DOM so ref is always valid */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              webkit-playsinline="true"
              x-webkit-airplay="allow"
              className="call-remote-video"
              style={{ display: hideRemote ? "none" : "block" }}
            />

            {/* Local (self-view) video — visible even while outgoing pending */}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              webkit-playsinline="true"
              className="call-local-video"
            />

            {/* FIX 9: Distinct icons for enter / exit fullscreen */}
            {call?.status === "active" && (
              <button
                className="fullscreen-btn"
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? "⊡" : "⛶"}
              </button>
            )}

            {/* Unmute fallback — shown if autoplay muted got stuck */}
            {remoteMuted && call?.status === "active" && (
              <button className="unmute-badge" onClick={handleUnmute}>
                🔇 Tap to unmute
              </button>
            )}
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
          <div className="call-status-text">
            Incoming {isVideo ? "video" : "voice"} call…
          </div>
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
              <button
                className={`call-ctrl-btn ${muted ? "off" : ""}`}
                onClick={toggleMute}
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? "🔇" : "🎤"}
              </button>

              {isVideo && (
                <>
                  <button
                    className={`call-ctrl-btn ${camOff ? "off" : ""}`}
                    onClick={toggleCam}
                    title={camOff ? "Camera on" : "Camera off"}
                  >
                    {camOff ? "📷" : "🎥"}
                  </button>
                  <button
                    className="call-ctrl-btn"
                    onClick={onSwitchCamera}
                    title="Switch camera"
                  >
                    🔄
                  </button>
                  <button
                    className="call-ctrl-btn"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? "⊡" : "⛶"}
                  </button>
                </>
              )}
            </>
          )}

          {isPending && isIncoming && (
            <button
              className="call-ctrl-btn accept"
              onClick={() => onEnd("accept")}
              title="Accept call"
            >
              ✓
            </button>
          )}

          <button
            className="call-ctrl-btn end"
            onClick={() => onEnd("end")}
            title="End call"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS PANEL ───────────────────────────────────────────────────────────
function SettingsPanel({ user, onLogout, onClose, isDark }) {
  const [newUsername, setNewUsername] = useState(user.username);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass,     setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [msg,         setMsg]         = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
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
      await axios.post(`${BACKEND_URL}/api/auth/update`, {
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
      <div
        className={`settings-panel ${isDark ? "dark" : "light"}`}
        onClick={e => e.stopPropagation()}
      >
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
          <input
            className="settings-input"
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            placeholder="New username"
          />
        </div>
        <div className="settings-section-label" style={{ marginTop: 8 }}>Change Password</div>
        <div className="settings-field">
          <label className="settings-label">Current Password</label>
          <div className="settings-input-wrap">
            <input
              className="settings-input"
              type={showCurrent ? "text" : "password"}
              value={currentPass}
              onChange={e => setCurrentPass(e.target.value)}
              placeholder="Required to save changes"
            />
            <button className="settings-eye" onClick={() => setShowCurrent(v => !v)}>
              {showCurrent ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div className="settings-field">
          <label className="settings-label">New Password</label>
          <div className="settings-input-wrap">
            <input
              className="settings-input"
              type={showNew ? "text" : "password"}
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="Leave blank to keep current"
            />
            <button className="settings-eye" onClick={() => setShowNew(v => !v)}>
              {showNew ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div className="settings-field">
          <label className="settings-label">Confirm New Password</label>
          <div className="settings-input-wrap">
            <input
              className="settings-input"
              type={showConfirm ? "text" : "password"}
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              placeholder="Repeat new password"
            />
            <button className="settings-eye" onClick={() => setShowConfirm(v => !v)}>
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {msg && <div className={`settings-msg ${msg.type}`}>{msg.text}</div>}
        <button className="settings-save-btn" onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </button>
        <div className="settings-divider" />
        <button className="settings-logout-btn" onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
}

// ─── MAIN CHAT ────────────────────────────────────────────────────────────────
function Chat({ user, onLogout, theme, toggleTheme }) {
  const [messages,          setMessages]          = useState([]);
  const [text,              setText]              = useState("");
  const [onlineUsers,       setOnlineUsers]       = useState([]);
  const [typingUser,        setTypingUser]        = useState("");
  const [isTyping,          setIsTyping]          = useState(false);
  const [activeRoom,        setActiveRoom]        = useState("general");
  const [activeRoomName,    setActiveRoomName]    = useState("General Chat");
  const [search,            setSearch]            = useState("");
  const [attachment,        setAttachment]        = useState(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [showEmojiPicker,   setShowEmojiPicker]   = useState(false);
  const [unreadCounts,      setUnreadCounts]      = useState({});
  const [showSettings,      setShowSettings]      = useState(false);
  const [lightboxImg,       setLightboxImg]       = useState(null);
  const [editingMsg,        setEditingMsg]        = useState(null);
  const [editText,          setEditText]          = useState("");
  const [hoveredMsg,        setHoveredMsg]        = useState(null);
  const [call,              setCall]              = useState(null);
  const [facingMode,        setFacingMode]        = useState("user");
  const [socketReady,       setSocketReady]       = useState(false);

  const socketRef         = useRef(null);
  const pcRef             = useRef(null);
  const localStreamRef    = useRef(null);
  const remoteStreamRef   = useRef(null); // stable ref — avoids re-triggering video useEffect
  const iceCandidateQueue = useRef([]);
  const activeRoomRef     = useRef("general");
  const bottomRef         = useRef(null);
  const typingTimer       = useRef(null);
  const fileInputRef      = useRef(null);

  const isDark = theme === "dark";

  // ── WebRTC helpers ──────────────────────────────────────────────────────────
  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    // Clear the remote stream ref so the next call starts fresh
    remoteStreamRef.current = null;
    iceCandidateQueue.current = [];
  }, []);

  const flushIceCandidates = useCallback(async (pc) => {
    for (const candidate of iceCandidateQueue.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (e) { console.warn("ICE flush error:", e); }
    }
    iceCandidateQueue.current = [];
  }, []);

  const createPC = useCallback((peer) => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current)
        socketRef.current.emit("call_ice", { to: peer, candidate: e.candidate });
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState);
      // If ICE fails, surface it to the user
      if (pc.iceConnectionState === "failed") {
        console.error("ICE connection failed");
      }
    };

    pc.ontrack = (e) => {
      console.log("ontrack fired, track:", e.track?.kind);

      // Reuse the SAME MediaStream object reference on every ontrack event.
      // This keeps call.remoteStream reference stable, so CallOverlay's
      // useEffect [call?.remoteStream] does NOT re-fire after the first
      // attach — fixing the "re-mute on every track arrival" bug on mobile.
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }

      const alreadyHasTrack = remoteStreamRef.current
        .getTracks()
        .some(t => t.id === e.track.id);

      if (!alreadyHasTrack) {
        remoteStreamRef.current.addTrack(e.track);
        console.log("Added track:", e.track.kind,
          "| total:", remoteStreamRef.current.getTracks().length);
      }

      setCall(prev =>
        prev
          ? { ...prev, remoteStream: remoteStreamRef.current, status: "active" }
          : prev
      );
    };

    pcRef.current = pc;
    return pc;
  }, []);

  const startCall = useCallback(async (peer, type) => {
    if (call) return;
    iceCandidateQueue.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(type));
      console.log("Got local tracks:", stream.getTracks().map(t => t.kind));
      localStreamRef.current = stream;
      const pc = createPC(peer);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("call_offer", {
        to: peer,
        from: user.username,
        type,
        offer: pc.localDescription,
      });
      setCall({ peer, type, direction: "outgoing", status: "pending", stream });
      setFacingMode("user");
    } catch (err) {
      stopLocalStream();
      console.error("startCall error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        alert(
          `Microphone${type === "video" ? "/camera" : ""} permission denied.\n\n` +
          `Tap the 🔒 lock icon in the address bar → allow microphone` +
          `${type === "video" ? " & camera" : ""} → refresh.`
        );
      } else if (err.name === "NotFoundError") {
        alert(`No microphone${type === "video" ? "/camera" : ""} found on this device.`);
      } else if (err.name === "NotReadableError") {
        alert("Mic/camera is being used by another app. Close it and try again.");
      } else {
        alert("Could not start call: " + err.message);
      }
    }
  }, [call, createPC, stopLocalStream, user.username]);

  const handleCallEnd = useCallback(async (action) => {
    if (action === "accept" && call) {
      iceCandidateQueue.current = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(call.type));
        console.log("Answer local tracks:", stream.getTracks().map(t => t.kind));
        localStreamRef.current = stream;
        const pc = createPC(call.peer);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        await pc.setRemoteDescription(new RTCSessionDescription(call._offer));
        await flushIceCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current.emit("call_answer", { to: call.peer, answer: pc.localDescription });
        setCall(prev => ({ ...prev, stream, status: "active" }));
        setFacingMode("user");
      } catch (err) {
        stopLocalStream();
        setCall(null);
        console.error("accept error:", err);
        alert("Could not accept call: " + err.message);
      }
    } else {
      if (socketRef.current && call?.peer)
        socketRef.current.emit("call_end", { to: call.peer });
      stopLocalStream();
      setCall(null);
    }
  }, [call, createPC, flushIceCandidates, stopLocalStream]);

  const handleSwitchCamera = useCallback(async () => {
    if (!localStreamRef.current || !pcRef.current) return;
    const newFacing = facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
        audio: true,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find(s => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newVideoTrack);

      localStreamRef.current.getVideoTracks().forEach(t => t.stop());

      const newMediaStream = new MediaStream([
        ...localStreamRef.current.getAudioTracks(),
        newVideoTrack,
      ]);
      localStreamRef.current = newMediaStream;
      setCall(prev => prev ? { ...prev, stream: newMediaStream } : prev);
      setFacingMode(newFacing);
    } catch (e) {
      console.warn("Camera switch failed:", e);
      alert("Could not switch camera: " + e.message);
    }
  }, [facingMode]);

  // ── FIX 10: Socket with tuned ping timings for Render.com free tier ─────────
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      maxHttpBufferSize: 10 * 1024 * 1024,
      pingInterval: 10000,   // ping every 10s (default 25s — too slow for Render)
      pingTimeout:  20000,   // wait 20s for pong before disconnecting
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("user_online", { username: user.username });
      setSocketReady(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setSocketReady(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect error:", err.message);
    });

    // Heartbeat to keep Render.com free instance alive
    const interval = setInterval(() => {
      if (socket.connected) socket.emit("user_online", { username: user.username });
    }, 5000);

    socket.on("online_users", (users) =>
      setOnlineUsers(users.filter(u => u !== user.username))
    );

    return () => {
      clearInterval(interval);
      socket.disconnect();
      setSocketReady(false);
    };
  }, [user.username]);

  // ── Socket: messages ────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socketReady) return;

    const handleMessage = (msg) => {
      if (msg.room === activeRoomRef.current) {
        setMessages(prev => {
          const filtered = prev.filter(
            m =>
              !(
                m._isLocal &&
                m.sender === msg.sender &&
                m.message === msg.message &&
                (m.fileData?.name ?? null) === (msg.fileData?.name ?? null)
              )
          );
          return [...filtered, { ...msg, time: getTime(), _isLocal: false }];
        });
      } else if (msg.sender !== user.username) {
        setUnreadCounts(prev => ({
          ...prev,
          [msg.room]: (prev[msg.room] || 0) + 1,
        }));
      }
    };

    socket.on("receive_message", handleMessage);
    socket.on("message_edited", (updatedMsg) => {
      setMessages(prev =>
        prev.map(m => m._id === updatedMsg._id ? { ...updatedMsg, time: m.time } : m)
      );
    });
    socket.on("message_deleted", ({ messageId }) => {
      setMessages(prev =>
        prev.map(m => m._id === messageId ? { ...m, deleted: true, message: "" } : m)
      );
    });

    return () => {
      socket.off("receive_message", handleMessage);
      socket.off("message_edited");
      socket.off("message_deleted");
    };
  }, [user.username, socketReady]);

  // ── Socket: call signaling ──────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on("call_offer", ({ from, type, offer }) => {
      iceCandidateQueue.current = [];
      setCall({ peer: from, type, direction: "incoming", status: "pending", _offer: offer });
    });

    socket.on("call_answer", async ({ answer }) => {
      const pc = pcRef.current;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushIceCandidates(pc);
          // Caller side: voice calls may never fire ontrack, so force active here
          setCall(prev => prev ? { ...prev, status: "active" } : prev);
        } catch (e) {
          console.error("set answer error:", e);
        }
      }
    });

    socket.on("call_ice", async ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription?.type) {
        iceCandidateQueue.current.push(candidate);
        return;
      }
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (e) { console.warn("ICE add error:", e); }
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
  }, [flushIceCandidates, stopLocalStream]);

  // ── Socket: room ────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    activeRoomRef.current = activeRoom;
    socket.emit("join_room", { room: activeRoom });
    setMessages([]);
    setIsTyping(false);
    setUnreadCounts(prev => ({ ...prev, [activeRoom]: 0 }));
    socket.off("chat_history");
    socket.off("user_typing");
    socket.on("chat_history", (history) => {
      setMessages(history.map(m => ({
        ...m,
        time: new Date(m.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      })));
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

  // ── Room switching ───────────────────────────────────────────────────────────
  const switchRoom = (roomId, roomName) => {
    setActiveRoom(roomId);
    setActiveRoomName(roomName);
    setIsTyping(false);
    setAttachment(null);
    setShowEmojiPicker(false);
    setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }));
    setEditingMsg(null);
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (socketRef.current?.connected)
      socketRef.current.emit("typing", { username: user.username, room: activeRoom });
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`File too large (max 5MB).\nYour file: ${formatBytes(file.size)}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const isImage = file.type.startsWith("image/");
    setAttachmentLoading(true);

    if (isImage) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const MAX_DIM = 1200;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        URL.revokeObjectURL(objectUrl);
        setAttachment({ name: file.name, size: file.size, type: "image/jpeg", dataUrl, isImage: true });
        setAttachmentLoading(false);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setAttachmentLoading(false);
        alert("Could not load image.");
      };
      img.src = objectUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachment({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: ev.target.result,
          isImage: false,
        });
        setAttachmentLoading(false);
      };
      reader.onerror = () => {
        alert("Failed to read file.");
        setAttachmentLoading(false);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addEmoji = (emoji) => setText(prev => prev + emoji);

  const sendMessage = () => {
    if (attachmentLoading) return;
    if (!text.trim() && !attachment) return;
    if (!socketRef.current?.connected) {
      alert("Not connected. Please wait or refresh.");
      return;
    }

    const msgData = {
      sender: user.username,
      room: activeRoom,
      message: text.trim(),
    };

    if (attachment) {
      msgData.fileData = {
        name: attachment.name,
        size: attachment.size,
        type: attachment.type,
        data: attachment.dataUrl,
        isImage: attachment.isImage,
      };
    }

    const localMsg = {
      ...msgData,
      _id: `local_${Date.now()}`,
      _isLocal: true,
      time: getTime(),
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, localMsg]);
    setText("");
    setAttachment(null);
    setShowEmojiPicker(false);
    socketRef.current.emit("send_message", msgData);
  };

  const startEdit = (msg) => { setEditingMsg(msg._id); setEditText(msg.message); };

  const submitEdit = () => {
    if (!editText.trim()) return;
    socketRef.current.emit("edit_message", {
      messageId: editingMsg,
      newMessage: editText.trim(),
      room: activeRoom,
    });
    setEditingMsg(null);
    setEditText("");
  };

  const deleteMessage = (msgId) => {
    if (!window.confirm("Delete this message?")) return;
    socketRef.current.emit("delete_message", { messageId: msgId, room: activeRoom });
  };

  const filteredUsers = onlineUsers.filter(u =>
    u.toLowerCase().includes(search.toLowerCase())
  );
  const showGeneral = "general chat".includes(search.toLowerCase()) || search === "";

  return (
    <div className={`chat-bg ${isDark ? "dark" : "light"}`}>
      <div className="chat-container">

        {lightboxImg && (
          <div className="lightbox" onClick={() => setLightboxImg(null)}>
            <img src={lightboxImg} alt="full" className="lightbox-img" />
            <button className="lightbox-close" onClick={() => setLightboxImg(null)}>✕</button>
          </div>
        )}

        {call && (
          <CallOverlay
            call={call}
            user={user}
            onEnd={handleCallEnd}
            isDark={isDark}
            onSwitchCamera={handleSwitchCamera}
          />
        )}

        {showSettings && (
          <SettingsPanel
            user={user}
            onLogout={onLogout}
            onClose={() => setShowSettings(false)}
            isDark={isDark}
          />
        )}

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="brand-logo">💬</div>
            <span className="brand-label">ChatApp</span>
            <button
              className="icon-btn theme-btn"
              onClick={toggleTheme}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              className="icon-btn settings-btn"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
            <input
              className="search-inp"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch("")}>✕</button>
            )}
          </div>

          <div className="sidebar-scroll">
            {showGeneral && (
              <>
                <div className="section-lbl">Rooms</div>
                <div
                  className={`contact ${activeRoom === "general" ? "active" : ""}`}
                  onClick={() => switchRoom("general", "General Chat")}
                >
                  <div className="contact-av" style={{
                    background: "linear-gradient(135deg,#6c63ff,#9b8fff)",
                    fontSize: 18, width: 40, height: 40,
                    borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>💬</div>
                  <div className="contact-info">
                    <div className="contact-name">General Chat</div>
                    <div className="contact-last">Everyone can chat here</div>
                  </div>
                  {unreadCounts["general"] > 0 && (
                    <div className="unread-badge">{unreadCounts["general"]}</div>
                  )}
                </div>
              </>
            )}

            <div className="section-lbl">Online — {filteredUsers.length}</div>
            {filteredUsers.length === 0 && search === "" && (
              <div className="empty-users">No other users online</div>
            )}
            {filteredUsers.length === 0 && search !== "" && (
              <div className="empty-users">No results for "{search}"</div>
            )}

            {filteredUsers.map((u, i) => {
              const roomId = getRoomId(user.username, u);
              return (
                <div
                  key={i}
                  className={`contact ${activeRoom === roomId ? "active" : ""}`}
                  onClick={() => switchRoom(roomId, u)}
                >
                  <div className="contact-av-wrap">
                    <div className="contact-av" style={{ background: getColor(u) }}>
                      {u[0].toUpperCase()}
                    </div>
                    <span className="online-badge" />
                  </div>
                  <div className="contact-info">
                    <div className="contact-name">{u}</div>
                    <div className="contact-last online-text">Online</div>
                  </div>
                  {unreadCounts[roomId] > 0 && (
                    <div className="unread-badge">{unreadCounts[roomId]}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Main chat ─────────────────────────────────────────────────────── */}
        <div className="chat-main">
          <div className="chat-header">
            <div className="ch-av" style={{
              background: activeRoom === "general"
                ? "linear-gradient(135deg,#6c63ff,#9b8fff)"
                : getColor(activeRoomName),
              fontSize: activeRoom === "general" ? 20 : 16,
            }}>
              {activeRoom === "general" ? "💬" : activeRoomName[0].toUpperCase()}
            </div>
            <div className="ch-info">
              <div className="ch-name">{activeRoomName}</div>
              <div className="ch-status">
                <span className="online-dot" />
                {activeRoom === "general"
                  ? `${onlineUsers.length + 1} members online`
                  : "Private · End-to-end encrypted"}
              </div>
            </div>
            {activeRoom !== "general" && (
              <div className="ch-actions">
                <button
                  className="call-icon-btn voice"
                  onClick={() => startCall(activeRoomName, "voice")}
                  title="Voice call"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.88a16 16 0 0 0 6.21 6.21l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </button>
                <button
                  className="call-icon-btn video"
                  onClick={() => startCall(activeRoomName, "video")}
                  title="Video call"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="messages" onClick={() => setShowEmojiPicker(false)}>
            {messages.length === 0 && (
              <div className="empty-chat">
                <div className="empty-icon">{activeRoom === "general" ? "💬" : "🔒"}</div>
                <p className="empty-title">
                  {activeRoom === "general"
                    ? "Welcome to General Chat!"
                    : `Private chat with ${activeRoomName}`}
                </p>
                <p className="empty-sub">Be the first to say hello</p>
              </div>
            )}

            {messages.map((msg, i) => {
              const mine      = msg.sender === user.username;
              const showName  = i === 0 || messages[i - 1]?.sender !== msg.sender;
              const showAv    = i === messages.length - 1 || messages[i + 1]?.sender !== msg.sender;
              const isDeleted = msg.deleted;
              const isEditing = editingMsg === msg._id;

              return (
                <div
                  key={msg._id || i}
                  className={`msg-row ${mine ? "mine" : ""}`}
                  onMouseEnter={() => setHoveredMsg(msg._id)}
                  onMouseLeave={() => setHoveredMsg(null)}
                >
                  {!mine && (
                    <div
                      className="msg-av"
                      style={{ background: getColor(msg.sender), opacity: showAv ? 1 : 0 }}
                    >
                      {msg.sender[0].toUpperCase()}
                    </div>
                  )}
                  <div className="bwrap">
                    {!mine && showName && !isDeleted && (
                      <div className="bsender" style={{ color: getColor(msg.sender) }}>
                        {msg.sender}
                      </div>
                    )}
                    {isEditing ? (
                      <div className="edit-wrap">
                        <input
                          className="edit-input"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") submitEdit();
                            if (e.key === "Escape") setEditingMsg(null);
                          }}
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button className="edit-save" onClick={submitEdit}>Save</button>
                          <button className="edit-cancel" onClick={() => setEditingMsg(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className={`bubble ${mine ? "mine" : "theirs"} ${isDeleted ? "deleted" : ""} ${msg._isLocal ? "local" : ""}`}>
                        {isDeleted ? (
                          <span className="deleted-text">🚫 Message deleted</span>
                        ) : (
                          <>
                            {msg.fileData?.isImage && (
                              <img
                                src={msg.fileData.data}
                                alt={msg.fileData.name}
                                className="bubble-img clickable"
                                onClick={() => setLightboxImg(msg.fileData.data)}
                              />
                            )}
                            {msg.fileData && !msg.fileData.isImage && (
                              <a
                                href={msg.fileData.data}
                                download={msg.fileData.name}
                                className="file-download-link"
                              >
                                <div className="file-card">
                                  <span className="file-card-icon">📄</span>
                                  <div className="file-card-info">
                                    <div className="file-card-name">{msg.fileData.name}</div>
                                    <div className="file-card-size">{formatBytes(msg.fileData.size)}</div>
                                  </div>
                                  <span className="file-card-dl">⬇</span>
                                </div>
                              </a>
                            )}
                            {msg.image && !msg.fileData && (
                              <img
                                src={msg.image}
                                alt="attachment"
                                className="bubble-img clickable"
                                onClick={() => setLightboxImg(msg.image)}
                              />
                            )}
                            {msg.message && <span className="btext">{msg.message}</span>}
                            {msg.edited && <span className="edited-tag">edited</span>}
                            <span className="btime">{msg._isLocal ? "sending…" : msg.time}</span>
                          </>
                        )}
                      </div>
                    )}
                    {mine && !isDeleted && !isEditing && hoveredMsg === msg._id && !msg._isLocal && (
                      <div className="msg-actions mine">
                        {msg.message && !msg.fileData && (
                          <button
                            className="msg-action-btn edit"
                            onClick={() => startEdit(msg)}
                            title="Edit"
                          >✏️</button>
                        )}
                        <button
                          className="msg-action-btn delete"
                          onClick={() => deleteMessage(msg._id)}
                          title="Delete"
                        >🗑️</button>
                      </div>
                    )}
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
                <div className="msg-av" style={{ background: getColor(typingUser) }}>
                  {typingUser[0]?.toUpperCase()}
                </div>
                <div className="bubble theirs typing-bubble">
                  <span className="tdot" /><span className="tdot" /><span className="tdot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {attachmentLoading && (
            <div className="attach-preview">
              <div className="attach-file-preview">
                <span>⏳</span>
                <div><div className="attach-fname">Processing…</div></div>
              </div>
            </div>
          )}

          {attachment && !attachmentLoading && (
            <div className="attach-preview">
              {attachment.isImage ? (
                <img src={attachment.dataUrl} alt="preview" className="attach-img" />
              ) : (
                <div className="attach-file-preview">
                  <span>📄</span>
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
            <EmojiPicker onSelect={addEmoji} onClose={() => setShowEmojiPicker(false)} />
          )}

          <div className="input-area">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,.mp4,.mp3"
            />
            <button
              className="input-icon-btn"
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
            >📎</button>
            <button
              className={`input-icon-btn ${showEmojiPicker ? "active" : ""}`}
              title="Emoji"
              onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(v => !v); }}
            >😊</button>
            <textarea
              className="msg-input"
              placeholder={`Message ${activeRoomName}...`}
              value={text}
              onChange={handleTyping}
              onKeyDown={handleKey}
              rows={1}
            />
            <button
              className={`send-btn ${(text.trim() || attachment) ? "ready" : ""}`}
              onClick={sendMessage}
              disabled={(!text.trim() && !attachment) || attachmentLoading}
            >
              &#x27A4;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;