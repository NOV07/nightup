"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "bot";
  text: string;
}

const QUICK_REPLIES = ["Events tonight", "Best clubs in Athens", "How to buy tickets", "Party planning help"];

const getBotReply = (msg: string): string => {
  const m = msg.toLowerCase();
  if (m.includes("event") || m.includes("tonight")) return "We have amazing events happening across Greece! Check our Events page for tonight's lineup. 🎉";
  if (m.includes("club") || m.includes("athens")) return "Athens has a vibrant club scene! Top picks: Fuzz Club, Six D.O.G.S, and Club Noir. Check our Events page for upcoming nights. 🏛️";
  if (m.includes("ticket")) return "You can buy tickets directly from event pages. Click the 'Get Tickets' button on any event. 🎫";
  if (m.includes("party") || m.includes("plan")) return "Need help planning your party? Visit our Party page to find venues, DJs, photographers, and more! ✨";
  if (m.includes("radio")) return "Check our Radio page for live streams — House, Techno, R&B and more, all synced live! 📻";
  return "I'm the Nightup assistant! I can help you find events, plan parties, or discover Greek nightlife. What are you looking for? 🌙";
};

const BUBBLE_SIZE = 56;
const WINDOW_W = 320;
const WINDOW_H = 440;
const EDGE_PAD = 12;

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hey! 👋 I'm your Nightup guide. Ask me anything about events, parties, or nightlife in Greece!" },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Draggable position
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });

  useEffect(() => {
    setPos({ x: window.innerWidth - BUBBLE_SIZE - EDGE_PAD, y: window.innerHeight - BUBBLE_SIZE - 80 });
  }, []);

  const clamp = useCallback((x: number, y: number) => ({
    x: Math.max(EDGE_PAD, Math.min(window.innerWidth - BUBBLE_SIZE - EDGE_PAD, x)),
    y: Math.max(EDGE_PAD, Math.min(window.innerHeight - BUBBLE_SIZE - EDGE_PAD, y)),
  }), []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = { dx: e.clientX - (pos?.x ?? 0), dy: e.clientY - (pos?.y ?? 0) };
  }, [pos]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    dragging.current = true;
    dragOffset.current = { dx: t.clientX - (pos?.x ?? 0), dy: t.clientY - (pos?.y ?? 0) };
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos(clamp(e.clientX - dragOffset.current.dx, e.clientY - dragOffset.current.dy));
    };
    const onTouch = (e: TouchEvent) => {
      if (!dragging.current) return;
      const t = e.touches[0];
      setPos(clamp(t.clientX - dragOffset.current.dx, t.clientY - dragOffset.current.dy));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onUp);
    };
  }, [clamp]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "bot", text: getBotReply(text) }]);
    }, 600);
  };

  if (!pos) return null;

  // Position chat window above/left of bubble, clamped to viewport
  const chatLeft = Math.max(EDGE_PAD, Math.min(pos.x - WINDOW_W + BUBBLE_SIZE, window.innerWidth - WINDOW_W - EDGE_PAD));
  const chatTop = Math.max(EDGE_PAD, pos.y - WINDOW_H - 8);

  return (
    <>
      {open && (
        <div
          className="fixed z-[60] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            left: chatLeft,
            top: chatTop,
            width: WINDOW_W,
            maxHeight: WINDOW_H,
            backgroundColor: "#1A1A2E",
            border: "1px solid #E8A020",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ backgroundColor: "#E8A020" }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">🌙</span>
              <span className="font-bold text-sm" style={{ color: "#0F0F1A" }}>Nightup Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ color: "#0F0F1A" }} aria-label="Close chat">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 160, maxHeight: 240 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed"
                  style={{
                    backgroundColor: m.role === "user" ? "#E8A020" : "#16213E",
                    color: m.role === "user" ? "#0F0F1A" : "#fff",
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          <div className="px-3 pb-2 flex flex-wrap gap-1 flex-shrink-0">
            {QUICK_REPLIES.map((r) => (
              <button
                key={r}
                onClick={() => sendMessage(r)}
                className="text-xs px-2 py-1 rounded-full border hover:bg-amber-500/10"
                style={{ borderColor: "#E8A020", color: "#E8A020" }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 pt-0 flex-shrink-0">
            <input
              className="flex-1 rounded-lg px-3 py-2 text-sm focus-gold"
              style={{ backgroundColor: "#16213E", color: "#fff", border: "1px solid #333" }}
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            />
            <button
              onClick={() => sendMessage(input)}
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 hover:opacity-80"
              style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
              aria-label="Send"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Draggable bubble */}
      <button
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={() => { if (!dragging.current) setOpen((v) => !v); }}
        className="fixed z-[60] w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform select-none"
        style={{
          left: pos.x,
          top: pos.y,
          backgroundColor: "#E8A020",
          cursor: "grab",
          touchAction: "none",
        }}
        aria-label={open ? "Close chat" : "Open Nightup Assistant"}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="#0F0F1A" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="#0F0F1A" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
        )}
      </button>
    </>
  );
}
