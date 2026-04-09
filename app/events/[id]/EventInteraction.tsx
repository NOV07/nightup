"use client";

import { useState } from "react";

interface Props {
  interestedCount: number;
  goingCount: number;
}

export default function EventInteraction({ interestedCount, goingCount }: Props) {
  const [interested, setInterested] = useState(false);
  const [going, setGoing] = useState(false);

  const toggleInterested = () => {
    setInterested((v) => !v);
    if (!interested && going) setGoing(false);
  };
  const toggleGoing = () => {
    setGoing((v) => !v);
    if (!going && interested) setInterested(false);
  };

  const iCount = interestedCount + (interested ? 1 : 0);
  const gCount = goingCount + (going ? 1 : 0);

  const avatarSeeds = ["a1", "a2", "a3", "a4", "a5"];

  return (
    <div className="p-5 rounded-2xl space-y-4" style={{ backgroundColor: "#1A1A2E", border: "1px solid #333" }}>
      <div className="flex -space-x-2 mb-1">
        {avatarSeeds.map((s) => (
          <div
            key={s}
            className="w-7 h-7 rounded-full border-2 overflow-hidden"
            style={{ borderColor: "#0F0F1A" }}
          >
            <img src={`https://picsum.photos/seed/${s}/28/28`} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2"
          style={{ backgroundColor: "#E8A020", color: "#0F0F1A", borderColor: "#0F0F1A" }}
        >
          +{(iCount + gCount - 5).toLocaleString()}
        </div>
      </div>

      <button
        onClick={toggleInterested}
        className="w-full py-2.5 rounded-xl font-medium text-sm transition-all"
        style={{
          backgroundColor: interested ? "#E8A020" : "transparent",
          color: interested ? "#0F0F1A" : "#E8A020",
          border: "2px solid #E8A020",
        }}
      >
        {interested ? "❤️ Interested" : "🤍 Interested"} · {iCount.toLocaleString()}
      </button>

      <button
        onClick={toggleGoing}
        className="w-full py-2.5 rounded-xl font-medium text-sm transition-all"
        style={{
          backgroundColor: going ? "#fff" : "transparent",
          color: going ? "#0F0F1A" : "#fff",
          border: "2px solid #fff",
        }}
      >
        {going ? "✅ Going" : "Going"} · {gCount.toLocaleString()}
      </button>
    </div>
  );
}
