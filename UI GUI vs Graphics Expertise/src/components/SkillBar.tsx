import { useState, useEffect } from "react";

interface Skill {
  id: number;
  icon: string;
  name: string;
  cooldown: number; // seconds
  maxCooldown: number;
  key: string;
  color: string;
}

const SKILLS: Skill[] = [
  { id: 1, icon: "⚔️", name: "Blade Rush",    cooldown: 0,  maxCooldown: 8,  key: "1", color: "#dc2626" },
  { id: 2, icon: "🛡️", name: "Iron Bulwark",  cooldown: 5,  maxCooldown: 15, key: "2", color: "#2563eb" },
  { id: 3, icon: "🔥", name: "Inferno Strike", cooldown: 0,  maxCooldown: 12, key: "3", color: "#ea580c" },
  { id: 4, icon: "⚡", name: "Thunder Cleave", cooldown: 10, maxCooldown: 20, key: "4", color: "#ca8a04" },
  { id: 5, icon: "💀", name: "Death's Mark",   cooldown: 0,  maxCooldown: 30, key: "5", color: "#7c3aed" },
  { id: 6, icon: "🌿", name: "Healing Aura",   cooldown: 3,  maxCooldown: 25, key: "6", color: "#16a34a" },
  { id: 7, icon: "❄️", name: "Frost Nova",     cooldown: 0,  maxCooldown: 18, key: "7", color: "#0891b2" },
  { id: 8, icon: "🗡️", name: "Shadow Step",   cooldown: 0,  maxCooldown: 10, key: "8", color: "#6b7280" },
];

export default function SkillBar() {
  const [skills, setSkills] = useState(SKILLS);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<Skill | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setSkills((prev) =>
        prev.map((s) =>
          s.cooldown > 0 ? { ...s, cooldown: Math.max(0, s.cooldown - 0.1) } : s
        )
      );
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const activate = (skill: Skill) => {
    if (skill.cooldown > 0) return;
    setActiveSlot(skill.id);
    setSkills((prev) =>
      prev.map((s) => (s.id === skill.id ? { ...s, cooldown: s.maxCooldown } : s))
    );
    setTimeout(() => setActiveSlot(null), 300);
  };

  return (
    <div className="relative">
      {/* Tooltip */}
      {tooltip && (
        <div
          className="rpg-tooltip absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-2 text-center min-w-[120px]"
          style={{ fontFamily: "'Crimson Text', serif" }}
        >
          <div className="gold-text-bright text-sm font-bold mb-0.5">{tooltip.name}</div>
          <div className="text-xs" style={{ color: "#9a7030" }}>
            {tooltip.cooldown > 0
              ? `Cooldown: ${tooltip.cooldown.toFixed(1)}s`
              : "Ready"}
          </div>
        </div>
      )}

      <div className="rpg-panel p-2 flex items-center gap-1.5">
        <span className="rpg-corner rpg-corner-tl" />
        <span className="rpg-corner rpg-corner-tr" />
        <span className="rpg-corner rpg-corner-bl" />
        <span className="rpg-corner rpg-corner-br" />

        {skills.map((skill) => {
          const onCD = skill.cooldown > 0;
          const pct = onCD ? (skill.cooldown / skill.maxCooldown) * 100 : 0;

          return (
            <div key={skill.id} className="relative flex flex-col items-center gap-0.5">
              <button
                onClick={() => activate(skill)}
                onMouseEnter={() => setTooltip(skill)}
                onMouseLeave={() => setTooltip(null)}
                className={`skill-slot w-14 h-14 rounded-sm flex items-center justify-center text-2xl ${onCD ? "on-cooldown" : ""} ${activeSlot === skill.id ? "active" : ""}`}
              >
                <span className="relative z-10">{skill.icon}</span>

                {/* Cooldown overlay sweep */}
                {onCD && (
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 56 56"
                    style={{ zIndex: 5 }}
                  >
                    <circle
                      cx="28" cy="28" r="24"
                      fill="none"
                      stroke={skill.color}
                      strokeWidth="3"
                      strokeDasharray={`${(1 - pct / 100) * 150.8} 150.8`}
                      strokeLinecap="round"
                      transform="rotate(-90 28 28)"
                      opacity="0.7"
                    />
                  </svg>
                )}

                {/* Cooldown text */}
                {onCD && (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                    style={{ color: "#e8b84b", zIndex: 10, fontFamily: "'Cinzel', serif" }}
                  >
                    {Math.ceil(skill.cooldown)}
                  </span>
                )}

                {/* Ready glow */}
                {!onCD && (
                  <div
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                    style={{ boxShadow: `inset 0 0 12px ${skill.color}66` }}
                  />
                )}
              </button>

              {/* Keybind */}
              <span
                className="text-xs"
                style={{ color: "#5c4420", fontFamily: "'Cinzel', serif" }}
              >
                {skill.key}
              </span>
            </div>
          );
        })}

        {/* Potion slots */}
        <div className="w-px h-12 mx-1" style={{ background: "#3d2e0f" }} />
        {[
          { icon: "🧪", label: "x3", color: "#dc2626" },
          { icon: "💙", label: "x2", color: "#2563eb" },
        ].map(({ icon, label, color }) => (
          <div key={label} className="relative flex flex-col items-center gap-0.5">
            <button className="skill-slot w-12 h-12 rounded-sm flex flex-col items-center justify-center gap-0.5">
              <span className="text-xl">{icon}</span>
              <span className="text-xs" style={{ color, fontFamily: "'Cinzel', serif" }}>
                {label}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
