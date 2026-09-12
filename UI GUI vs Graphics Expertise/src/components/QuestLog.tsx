import { useState } from "react";

interface Quest {
  id: number;
  title: string;
  giver: string;
  description: string;
  objectives: { text: string; done: boolean }[];
  reward: { gold: number; xp: number; item?: string };
  difficulty: "Easy" | "Normal" | "Hard" | "Legendary";
}

const QUESTS: Quest[] = [
  {
    id: 1,
    title: "The Shadowlord's Bane",
    giver: "King Alderon III",
    description:
      "The Shadowlord Malachar has risen from the cursed crypts beneath Darkhold. Only the bearer of the Sunblade can end his reign of terror.",
    objectives: [
      { text: "Forge the Sunblade at the Eternal Forge", done: true },
      { text: "Slay the Shadow Knights (3/3)", done: true },
      { text: "Defeat Shadowlord Malachar", done: false },
    ],
    reward: { gold: 5000, xp: 12000, item: "Crown of Kings" },
    difficulty: "Legendary",
  },
  {
    id: 2,
    title: "Wolves of the Ashwood",
    giver: "Huntmaster Brynn",
    description:
      "A pack of cursed wolves has been terrorizing the villages east of Ashwood. Track them to their den and end the threat.",
    objectives: [
      { text: "Find wolf tracks near Millhaven", done: true },
      { text: "Kill 8 Cursed Wolves (5/8)", done: false },
      { text: "Slay the Alpha Wolf", done: false },
    ],
    reward: { gold: 480, xp: 1200 },
    difficulty: "Normal",
  },
  {
    id: 3,
    title: "The Alchemist's Request",
    giver: "Alchemist Verna",
    description:
      "Verna needs rare reagents for her research. Gather them from the swamps south of Thornwall.",
    objectives: [
      { text: "Collect Moonbloom Petals (3/3)", done: true },
      { text: "Gather Bog Essence (2/5)", done: false },
    ],
    reward: { gold: 220, xp: 600, item: "Elixir of Fortitude" },
    difficulty: "Easy",
  },
];

const DIFF_COLOR: Record<string, string> = {
  Easy:      "#16a34a",
  Normal:    "#c4922a",
  Hard:      "#dc2626",
  Legendary: "#7c3aed",
};

export default function QuestLog() {
  const [selected, setSelected] = useState<Quest>(QUESTS[0]);

  return (
    <div className="rpg-panel p-4 w-[540px]" style={{ fontFamily: "'Cinzel', serif" }}>
      <span className="rpg-corner rpg-corner-tl" />
      <span className="rpg-corner rpg-corner-tr" />
      <span className="rpg-corner rpg-corner-bl" />
      <span className="rpg-corner rpg-corner-br" />

      {/* Header */}
      <div className="text-center mb-3">
        <h2 className="gold-text-bright text-base font-bold tracking-[0.2em] uppercase">
          📜 Quest Log
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "#5c4420", fontFamily: "'Crimson Text', serif" }}>
          {QUESTS.length} active quests
        </p>
      </div>
      <div className="rpg-divider mb-3" />

      <div className="flex gap-4">
        {/* Quest list */}
        <div className="flex flex-col gap-1.5 w-[180px] flex-shrink-0">
          {QUESTS.map((q) => (
            <button
              key={q.id}
              onClick={() => setSelected(q)}
              className={`quest-entry text-left px-3 py-2 ${selected.id === q.id ? "active" : ""}`}
              style={{ background: selected.id === q.id ? "rgba(122,92,42,0.1)" : "transparent" }}
            >
              <div className="text-xs font-semibold leading-snug" style={{ color: selected.id === q.id ? "#e8b84b" : "#9a7030" }}>
                {q.title}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="text-[10px]"
                  style={{ color: DIFF_COLOR[q.difficulty], fontFamily: "'Crimson Text', serif" }}
                >
                  {q.difficulty}
                </span>
                <span className="text-[10px]" style={{ color: "#3d2e0f" }}>·</span>
                <span className="text-[10px]" style={{ color: "#5c4420", fontFamily: "'Crimson Text', serif" }}>
                  {q.objectives.filter((o) => o.done).length}/{q.objectives.length}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Quest detail */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Title + difficulty */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="gold-text-bright text-sm font-bold leading-snug">{selected.title}</div>
              <div className="text-xs mt-0.5" style={{ color: "#5c4420", fontFamily: "'Crimson Text', serif" }}>
                Given by: {selected.giver}
              </div>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded flex-shrink-0"
              style={{
                background: DIFF_COLOR[selected.difficulty] + "22",
                border: `1px solid ${DIFF_COLOR[selected.difficulty]}44`,
                color: DIFF_COLOR[selected.difficulty],
                fontFamily: "'Crimson Text', serif",
              }}
            >
              {selected.difficulty}
            </span>
          </div>

          {/* Description */}
          <p
            className="text-xs leading-relaxed italic"
            style={{ color: "#9a7030", fontFamily: "'Crimson Text', serif" }}
          >
            "{selected.description}"
          </p>

          <div className="rpg-divider" />

          {/* Objectives */}
          <div>
            <div className="text-xs tracking-widest uppercase mb-1.5 gold-text">Objectives</div>
            <div className="flex flex-col gap-1">
              {selected.objectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0" style={{ color: obj.done ? "#16a34a" : "#3d2e0f" }}>
                    {obj.done ? "✓" : "○"}
                  </span>
                  <span
                    className="text-xs"
                    style={{
                      color: obj.done ? "#5c7a3a" : "#9a7030",
                      fontFamily: "'Crimson Text', serif",
                      textDecoration: obj.done ? "line-through" : "none",
                      opacity: obj.done ? 0.7 : 1,
                    }}
                  >
                    {obj.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rpg-divider" />

          {/* Rewards */}
          <div>
            <div className="text-xs tracking-widest uppercase mb-1.5 gold-text">Rewards</div>
            <div className="flex items-center gap-3 text-xs" style={{ fontFamily: "'Crimson Text', serif" }}>
              <div className="flex items-center gap-1">
                <span>🪙</span>
                <span className="gold-text">{selected.reward.gold.toLocaleString()}g</span>
              </div>
              <div className="flex items-center gap-1">
                <span>✨</span>
                <span style={{ color: "#a78bfa" }}>{selected.reward.xp.toLocaleString()} XP</span>
              </div>
              {selected.reward.item && (
                <div className="flex items-center gap-1">
                  <span>🎁</span>
                  <span className="rarity-legendary">{selected.reward.item}</span>
                </div>
              )}
            </div>
          </div>

          {/* Track button */}
          <button
            className="mt-auto w-full py-2 text-xs tracking-widest uppercase transition-all hover:brightness-110"
            style={{
              background: "linear-gradient(145deg, #3d2e0f, #5c4420)",
              border: "1px solid #7a5c2a",
              color: "#e8b84b",
              fontFamily: "'Cinzel', serif",
            }}
          >
            Track Quest
          </button>
        </div>
      </div>
    </div>
  );
}
