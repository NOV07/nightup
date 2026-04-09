"use client";

import { useState, useRef, useEffect } from "react";

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
  if (m.includes("radio")) return "Check our Radio page for live streams from Athens Beats FM, Night Groove Radio, and Thessaloniki Club! 📻";
  return "I'm the Nightup assistant! I can help you find events, plan parties, or discover Greek nightlife. What are you looking for? 🌙";
};

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hey! 👋 I'm your Nightup guide. Ask me anything about events, parties, or nightlife in Greece!" },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-28 md:bottom-16 right-4 z-50 w-80 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ backgroundColor: "#1A1A2E", border: "1px solid #E8A020", maxHeight: "420px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: "#E8A020" }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">🌙</span>
              <span className="font-bold text-sm" style={{ color: "#0F0F1A" }}>Nightup Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ color: "#0F0F1A" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: "200px", maxHeight: "280px" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] rounded-xl px-3 py-2 text-sm"
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
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {QUICK_REPLIES.map((r) => (
              <button
                key={r}
                onClick={() => sendMessage(r)}
                className="text-xs px-2 py-1 rounded-full border transition-colors"
                style={{ borderColor: "#E8A020", color: "#E8A020" }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 pt-0">
            <input
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "#16213E", color: "#fff", border: "1px solid #333" }}
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            />
            <button
              onClick={() => sendMessage(input)}
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 md:bottom-8 right-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110"
        style={{ backgroundColor: "#E8A020" }}
        aria-label="Open chatbot"
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
