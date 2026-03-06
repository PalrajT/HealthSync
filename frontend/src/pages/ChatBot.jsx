import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ChatBot.css";

import { API } from "../config";

const HIDE_PATHS = [
  "/", "/login-register", "/patient-login", "/patient-register",
  "/doctor-login", "/doctor-register", "/admin-login",
  "/forgot-password", "/reset-password",
];

const WELCOME = {
  role: "bot",
  text: "👋 Hi! I'm **HealthBot AI**, your medical assistant powered by AI.\n\nI can help you with:\n🩺 **Health questions** — symptoms, conditions, wellness tips\n📅 **Appointments** — book, track, cancel\n👨‍⚕️ **Find doctors** — by specialty or name\n\nAsk me anything!",
  suggestions: [
    "What causes headaches?",
    "Book an appointment",
    "Find a doctor",
    "Tips for better sleep",
  ],
};

// Simple markdown-ish bold + italic renderer
function renderText(text) {
  // Handle bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function MessageBubble({ msg }) {
  const isBot = msg.role === "bot";
  return (
    <div className={`cb-bubble-wrap cb-bubble-wrap--${isBot ? "bot" : "user"}`}>
      {isBot && <div className="cb-avatar">🤖</div>}
      <div className={`cb-bubble cb-bubble--${isBot ? "bot" : "user"}`}>
        {msg.text.split("\n").map((line, i) => (
          <span key={i}>
            {renderText(line)}
            {i < msg.text.split("\n").length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="cb-bubble-wrap cb-bubble-wrap--bot">
      <div className="cb-avatar">🤖</div>
      <div className="cb-bubble cb-bubble--bot cb-typing">
        <span /><span /><span />
      </div>
    </div>
  );
}

export default function ChatBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const getToken = () => localStorage.getItem("token");
  const getRole = () => {
    const token = getToken();
    if (!token) return null;
    try { return JSON.parse(atob(token.split(".")[1]))?.role || null; } catch { return null; }
  };

  const hidden = HIDE_PATHS.some(p => location.pathname === p);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (!hidden) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, hidden]);

  // Focus input when chat opens
  useEffect(() => {
    if (open && !hidden) {
      setTimeout(() => inputRef.current?.focus(), 120);
      setHasUnread(false);
    }
  }, [open, hidden]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", text: trimmed }]);
    setTyping(true);

    try {
      const headers = { "Content-Type": "application/json" };
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API}/api/chatbot`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: trimmed, role: getRole() }),
      });
      const data = await res.json();

      setTyping(false);

      const botMsg = {
        role: "bot",
        text: data.data?.reply || "I'm having trouble responding right now. Please try again.",
        suggestions: data.data?.suggestions || [],
        action: data.data?.action || null,
      };

      setMessages(prev => [...prev, botMsg]);

      // Auto-navigate after a short delay if action is provided
      if (botMsg.action?.type === "navigate") {
        if (!open) setHasUnread(true);
      }
    } catch {
      setTyping(false);
      setMessages(prev => [...prev, {
        role: "bot",
        text: "⚠️ Connection issue. Make sure the server is running and try again.",
        suggestions: [],
        action: null,
      }]);
    }
  }, [input, open]);

  const handleSuggestion = (suggestion) => {
    sendMessage(suggestion);
  };

  const handleNavigate = (action) => {
    if (action?.type === "navigate") {
      navigate(action.path);
      setOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([WELCOME]);
    setInput("");
  };

  // Find last bot message for action button
  const lastBotMsg = [...messages].reverse().find(m => m.role === "bot");

  // Don't render on auth pages (moved below all hooks to respect Rules of Hooks)
  if (hidden) return null;

  return (
    <>
      {/* Floating toggle button */}
      <button
        className={`cb-fab${open ? " cb-fab--open" : ""}`}
        onClick={() => setOpen(v => !v)}
        aria-label="HealthBot Assistant"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
        {hasUnread && !open && <span className="cb-fab-dot" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="cb-panel">
          {/* Header */}
          <div className="cb-header">
            <div className="cb-header-left">
              <div className="cb-header-avatar">🤖</div>
              <div>
                <p className="cb-header-name">HealthBot AI</p>
                <p className="cb-header-status">
                  <span className="cb-status-dot" /> AI-Powered Medical Assistant
                </p>
              </div>
            </div>
            <div className="cb-header-actions">
              <button className="cb-header-btn" title="Clear chat" onClick={clearChat}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.51" />
                </svg>
              </button>
              <button className="cb-header-btn" title="Close" onClick={() => setOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="cb-messages">
            {messages.map((msg, i) => (
              <div key={i}>
                <MessageBubble msg={msg} />
                {/* Suggestion chips — only on last bot message */}
                {msg.role === "bot" && i === messages.length - 1 && msg.suggestions?.length > 0 && !typing && (
                  <div className="cb-suggestions">
                    {msg.suggestions.map((s, j) => (
                      <button key={j} className="cb-chip" onClick={() => handleSuggestion(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {/* Navigate button */}
                {msg.role === "bot" && i === messages.length - 1 && msg.action?.type === "navigate" && (
                  <button className="cb-action-btn" onClick={() => handleNavigate(msg.action)}>
                    {msg.action.path.includes("appointment")
                      ? "📅 Open Appointments"
                      : msg.action.path.includes("dashboard")
                      ? "🏠 Go to Dashboard"
                      : msg.action.path.includes("profile")
                      ? "👤 Open Profile"
                      : "→ Take me there"}
                  </button>
                )}
              </div>
            ))}
            {typing && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="cb-input-row">
            <input
              ref={inputRef}
              className="cb-input"
              placeholder="Ask about health, symptoms, appointments..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={typing}
              maxLength={500}
            />
            <button
              className="cb-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || typing}
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="cb-footer-note">Powered by AI · HealthSync · Not a substitute for professional medical advice</p>
        </div>
      )}
    </>
  );
}
