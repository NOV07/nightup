export function RadarBadge() {
  return (
    <>
      {/* subtle gradient fade top-left */}
      <div className="absolute top-0 left-0 w-48 h-20 bg-gradient-to-br from-black/60 via-black/20 to-transparent rounded-tl-lg pointer-events-none z-[9]" />

      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="relative w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
          <span className="absolute w-[18px] h-[18px] rounded-full border border-amber-400 opacity-0 animate-[radar-ping_2.5s_ease-out_infinite]" />
          <span className="absolute w-[10px] h-[10px] rounded-full border border-amber-400 opacity-0 animate-[radar-ping_2.5s_ease-out_infinite_0.85s]" />
          <span className="relative w-[5px] h-[5px] rounded-full border-[1.5px] border-amber-400 bg-transparent" />
        </div>
        <span className="text-[10px] font-semibold tracking-[0.2em] text-amber-400 uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
          Nightup Radar
        </span>
      </div>
    </>
  );
}
