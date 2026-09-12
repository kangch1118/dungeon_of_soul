import { useState } from "react";

function StatBar({
  value,
  max,
  color,
  label,
  icon,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  icon: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-base w-5 text-center">{icon}</span>
      <div className="flex-1">
        <div className="stat-bar-track h-4 w-full">
          <div
            className="stat-bar-fill h-full"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
      <span
        className="text-xs tabular-nums w-20 text-right"
        style={{ color: "#9a7030", fontFamily: "'Crimson Text', serif" }}
      >
        {value} / {max}
      </span>
    </div>
  );
}

export default function HUD() {
  const [hp] = useState(340);
  const [mp] = useState(180);
  const [xp] = useState(6800);
  const maxHp = 500;
  const maxMp = 250;
  const maxXp = 10000;
  const level = 24;

  return (
    <div className="flex items-start gap-4 w-full max-w-5xl mx-auto">
      {/* Character portrait + stats */}
      <div className="rpg-panel p-3 flex gap-3 min-w-[320px]">
        <span className="rpg-corner rpg-corner-tl" />
        <span className="rpg-corner rpg-corner-tr" />
        <span className="rpg-corner rpg-corner-bl" />
        <span className="rpg-corner rpg-corner-br" />

        {/* Portrait */}
        <div className="relative flex-shrink-0">
          <div
            className="portrait-ring w-16 h-16 rounded-sm overflow-hidden flex items-center justify-center"
            style={{ background: "linear-gradient(145deg, #2a1a06, #1a0f02)" }}
          >
            {/* SVG knight helmet portrait */}
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <ellipse cx="22" cy="18" rx="12" ry="13" fill="#4a3520" stroke="#7a5c2a" strokeWidth="1.5" />
              <rect x="14" y="22" width="16" height="8" rx="1" fill="#3a2810" stroke="#7a5c2a" strokeWidth="1" />
              <rect x="16" y="24" width="3" height="2" rx="0.5" fill="#c4922a" opacity="0.6" />
              <rect x="21" y="24" width="7" height="2" rx="0.5" fill="#c4922a" opacity="0.6" />
              <rect x="16" y="27" width="12" height="1.5" rx="0.5" fill="#c4922a" opacity="0.4" />
              <path d="M14 22 Q22 26 30 22" stroke="#5c4420" strokeWidth="1" fill="none" />
              <ellipse cx="22" cy="13" rx="6" ry="4" fill="#5c4420" stroke="#7a5c2a" strokeWidth="1" />
              <path d="M16 10 Q22 6 28 10" fill="#c4922a" opacity="0.7" />
            </svg>
          </div>
          {/* Level badge */}
          <div
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: "linear-gradient(145deg, #7a5c2a, #c4922a)",
              border: "1px solid #e8b84b",
              color: "#0d0a04",
            }}
          >
            {level}
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="gold-text-bright text-sm font-bold tracking-wider">Aldric the Bold</span>
            <span className="text-xs" style={{ color: "#5c4420", fontFamily: "'Crimson Text', serif" }}>
              Knight Lv.{level}
            </span>
          </div>
          <StatBar
            value={hp}
            max={maxHp}
            color="linear-gradient(90deg, #7f1d1d, #dc2626, #f87171)"
            label="HP"
            icon="❤️"
          />
          <StatBar
            value={mp}
            max={maxMp}
            color="linear-gradient(90deg, #1e3a8a, #2563eb, #60a5fa)"
            label="MP"
            icon="💧"
          />
          {/* XP bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-base w-5 text-center">✨</span>
            <div className="flex-1 stat-bar-track h-2">
              <div
                className="exp-bar-fill h-full"
                style={{ width: `${Math.round((xp / maxXp) * 100)}%` }}
              />
            </div>
            <span
              className="text-xs tabular-nums w-20 text-right"
              style={{ color: "#9a7030", fontFamily: "'Crimson Text', serif" }}
            >
              {xp} / {maxXp}
            </span>
          </div>
        </div>
      </div>

      {/* Boss HP bar */}
      <div className="rpg-panel p-3 flex-1">
        <span className="rpg-corner rpg-corner-tl" />
        <span className="rpg-corner rpg-corner-tr" />
        <span className="rpg-corner rpg-corner-bl" />
        <span className="rpg-corner rpg-corner-br" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs tracking-widest uppercase flicker" style={{ color: "#dc2626" }}>
            ☠ Boss
          </span>
          <span className="gold-text text-sm font-bold tracking-wide">Shadowlord Malachar</span>
          <span className="text-xs tabular-nums" style={{ color: "#9a7030", fontFamily: "'Crimson Text', serif" }}>
            2,340 / 5,000
          </span>
        </div>
        <div className="stat-bar-track h-5 w-full">
          <div className="boss-hp-fill h-full" style={{ width: "46.8%" }} />
        </div>
        <div className="flex gap-2 mt-2">
          {["Enraged", "Cursed", "Shielded"].map((s, i) => (
            <span
              key={s}
              className="text-xs px-2 py-0.5 rounded"
              style={{
                background: ["#7f1d1d", "#4c1d95", "#1e3a8a"][i] + "88",
                border: `1px solid ${["#dc2626", "#7c3aed", "#2563eb"][i]}44`,
                color: ["#f87171", "#a78bfa", "#60a5fa"][i],
                fontFamily: "'Crimson Text', serif",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Gold + stats mini panel */}
      <div className="rpg-panel p-3 flex flex-col gap-2 min-w-[120px]">
        <span className="rpg-corner rpg-corner-tl" />
        <span className="rpg-corner rpg-corner-tr" />
        <span className="rpg-corner rpg-corner-bl" />
        <span className="rpg-corner rpg-corner-br" />
        <div className="text-center">
          <div className="text-xl">🪙</div>
          <div className="gold-text-bright text-base font-bold">3,482</div>
          <div className="text-xs" style={{ color: "#5c4420" }}>Gold</div>
        </div>
        <div className="rpg-divider" />
        {[
          { label: "ATK", value: "248" },
          { label: "DEF", value: "185" },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-xs">
            <span style={{ color: "#7a5c2a" }}>{label}</span>
            <span style={{ color: "#c4922a" }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
