import { useState } from "react";

interface Item {
  id: number;
  icon: string;
  name: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  type: string;
  value: number;
}

const ITEMS: Item[] = [
  { id: 1,  icon: "⚔️", name: "Shadowfang Blade",     rarity: "legendary", type: "Sword",   value: 4200 },
  { id: 2,  icon: "🛡️", name: "Iron Aegis",            rarity: "rare",      type: "Shield",  value: 980  },
  { id: 3,  icon: "👑", name: "Crown of the Fallen",   rarity: "epic",      type: "Helmet",  value: 2100 },
  { id: 4,  icon: "🧤", name: "Gauntlets of Fury",     rarity: "rare",      type: "Gloves",  value: 760  },
  { id: 5,  icon: "🪄", name: "Wand of Embers",        rarity: "uncommon",  type: "Wand",    value: 320  },
  { id: 6,  icon: "🧪", name: "Health Potion",         rarity: "common",    type: "Potion",  value: 50   },
  { id: 7,  icon: "💎", name: "Soulstone",             rarity: "epic",      type: "Gem",     value: 1800 },
  { id: 8,  icon: "🏹", name: "Elven Longbow",         rarity: "rare",      type: "Bow",     value: 1100 },
  { id: 9,  icon: "🧣", name: "Cloak of Shadows",      rarity: "epic",      type: "Cloak",   value: 1650 },
  { id: 10, icon: "🔮", name: "Orb of Insight",        rarity: "rare",      type: "Orb",     value: 870  },
  { id: 11, icon: "🥾", name: "Boots of Swiftness",    rarity: "uncommon",  type: "Boots",   value: 290  },
  { id: 12, icon: "💙", name: "Mana Potion",           rarity: "common",    type: "Potion",  value: 45   },
];

const RARITY_BORDER: Record<string, string> = {
  common:    "#5c5c5c",
  uncommon:  "#16a34a",
  rare:      "#2563eb",
  epic:      "#7c3aed",
  legendary: "#ea580c",
};

const GRID_SIZE = 20;

export default function Inventory() {
  const [selected, setSelected] = useState<Item | null>(null);
  const [items] = useState<(Item | null)[]>(() => {
    const grid: (Item | null)[] = Array(GRID_SIZE).fill(null);
    ITEMS.forEach((item, i) => { grid[i] = item; });
    return grid;
  });

  return (
    <div className="rpg-panel p-4 w-[480px]" style={{ fontFamily: "'Cinzel', serif" }}>
      <span className="rpg-corner rpg-corner-tl" />
      <span className="rpg-corner rpg-corner-tr" />
      <span className="rpg-corner rpg-corner-bl" />
      <span className="rpg-corner rpg-corner-br" />

      {/* Header */}
      <div className="text-center mb-3">
        <h2 className="gold-text-bright text-base font-bold tracking-[0.2em] uppercase">
          ⚔ Inventory
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "#5c4420", fontFamily: "'Crimson Text', serif" }}>
          {ITEMS.length} / {GRID_SIZE} slots used
        </p>
      </div>
      <div className="rpg-divider mb-3" />

      <div className="flex gap-4">
        {/* Grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setSelected(item)}
              className={`inv-slot w-16 h-16 rounded-sm flex flex-col items-center justify-center gap-0.5 ${item ? "has-item" : ""} ${selected?.id === item?.id && item ? "ring-1 ring-yellow-500/50" : ""}`}
              style={item ? { borderColor: RARITY_BORDER[item.rarity] + "88" } : {}}
            >
              {item ? (
                <>
                  <span className="text-2xl">{item.icon}</span>
                  <span
                    className="text-[9px] text-center leading-tight px-0.5 truncate w-full text-center"
                    style={{ color: "#9a7030", fontFamily: "'Crimson Text', serif" }}
                  >
                    {item.name.split(" ")[0]}
                  </span>
                </>
              ) : (
                <span style={{ color: "#2a1f0a", fontSize: "20px" }}>+</span>
              )}
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-[140px]">
          {selected ? (
            <div className="flex flex-col gap-2 h-full">
              <div className="text-center">
                <div className="text-4xl mb-1">{selected.icon}</div>
                <div className={`text-sm font-bold rarity-${selected.rarity}`}>
                  {selected.name}
                </div>
                <div
                  className="text-xs mt-0.5 capitalize"
                  style={{ color: "#5c4420", fontFamily: "'Crimson Text', serif" }}
                >
                  {selected.rarity} · {selected.type}
                </div>
              </div>

              <div className="rpg-divider" />

              <div className="flex flex-col gap-1.5 text-xs" style={{ fontFamily: "'Crimson Text', serif" }}>
                {selected.type === "Sword" && (
                  <>
                    <div className="flex justify-between"><span style={{ color: "#7a5c2a" }}>Damage</span><span style={{ color: "#c4922a" }}>142–198</span></div>
                    <div className="flex justify-between"><span style={{ color: "#7a5c2a" }}>Speed</span><span style={{ color: "#c4922a" }}>1.8</span></div>
                  </>
                )}
                {selected.type === "Potion" && (
                  <div className="flex justify-between"><span style={{ color: "#7a5c2a" }}>Restores</span><span style={{ color: "#c4922a" }}>250 HP</span></div>
                )}
                <div className="flex justify-between">
                  <span style={{ color: "#7a5c2a" }}>Value</span>
                  <span className="gold-text">{selected.value}g</span>
                </div>
              </div>

              <div className="rpg-divider" />

              <div className="flex flex-col gap-1.5 mt-auto">
                <button
                  className="w-full py-1.5 text-xs tracking-wider uppercase text-center transition-all hover:brightness-110"
                  style={{
                    background: "linear-gradient(145deg, #3d2e0f, #5c4420)",
                    border: "1px solid #7a5c2a",
                    color: "#e8b84b",
                    fontFamily: "'Cinzel', serif",
                  }}
                >
                  Equip
                </button>
                <button
                  className="w-full py-1.5 text-xs tracking-wider uppercase text-center transition-all hover:brightness-110"
                  style={{
                    background: "linear-gradient(145deg, #1a0f02, #2a1a06)",
                    border: "1px solid #3d2e0f",
                    color: "#9a7030",
                    fontFamily: "'Cinzel', serif",
                  }}
                >
                  Drop
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-xs text-center" style={{ color: "#3d2e0f", fontFamily: "'Crimson Text', serif" }}>
                Select an item<br />to inspect
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer weight */}
      <div className="rpg-divider mt-3 mb-2" />
      <div className="flex justify-between text-xs" style={{ fontFamily: "'Crimson Text', serif" }}>
        <span style={{ color: "#5c4420" }}>Weight: 48.2 / 80 kg</span>
        <span className="gold-text">Total: 14,780g</span>
      </div>
    </div>
  );
}
