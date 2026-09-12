import { useState } from "react";
import HUD from "./components/HUD";
import SkillBar from "./components/SkillBar";
import Inventory from "./components/Inventory";
import QuestLog from "./components/QuestLog";

type Panel = "inventory" | "quest" | null;

export default function App() {
  const [openPanel, setOpenPanel] = useState<Panel>(null);

  const toggle = (p: Panel) => setOpenPanel((prev) => (prev === p ? null : p));

  return (
    <div
      className="size-full relative overflow-hidden flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #1a0e02 0%, #0a0700 60%, #050300 100%)",
        fontFamily: "'Cinzel', serif",
      }}
    >
      {/* Background texture overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c4922a' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Scene label */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <p className="text-xs tracking-[0.3em] uppercase" style={{ color: "#5c4420", fontFamily: "'Crimson Text', serif" }}>
          Medieval RPG — UI Showcase
        </p>
      </div>

      {/* Top HUD */}
      <div className="w-full px-4 pt-4">
        <HUD />
      </div>

      {/* Center area — panel toggle buttons */}
      <div className="flex-1 flex items-center justify-center gap-6">
        <button
          onClick={() => toggle("inventory")}
          className="rpg-panel rpg-corner-btn px-6 py-3 gold-text text-sm tracking-widest uppercase transition-all hover:scale-105 active:scale-95"
          style={{ letterSpacing: "0.15em" }}
        >
          <span className="rpg-corner rpg-corner-tl" />
          <span className="rpg-corner rpg-corner-tr" />
          <span className="rpg-corner rpg-corner-bl" />
          <span className="rpg-corner rpg-corner-br" />
          ⚔ Inventory
        </button>
        <button
          onClick={() => toggle("quest")}
          className="rpg-panel rpg-corner-btn px-6 py-3 gold-text text-sm tracking-widest uppercase transition-all hover:scale-105 active:scale-95"
          style={{ letterSpacing: "0.15em" }}
        >
          <span className="rpg-corner rpg-corner-tl" />
          <span className="rpg-corner rpg-corner-tr" />
          <span className="rpg-corner rpg-corner-bl" />
          <span className="rpg-corner rpg-corner-br" />
          📜 Quest Log
        </button>
      </div>

      {/* Floating Panels */}
      {openPanel === "inventory" && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 30 }}>
          <div className="relative">
            <button
              onClick={() => setOpenPanel(null)}
              className="absolute -top-3 -right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{ background: "#3d2e0f", border: "1px solid #7a5c2a", color: "#c4922a" }}
            >
              ✕
            </button>
            <Inventory />
          </div>
        </div>
      )}
      {openPanel === "quest" && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 30 }}>
          <div className="relative">
            <button
              onClick={() => setOpenPanel(null)}
              className="absolute -top-3 -right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{ background: "#3d2e0f", border: "1px solid #7a5c2a", color: "#c4922a" }}
            >
              ✕
            </button>
            <QuestLog />
          </div>
        </div>
      )}

      {/* Background overlay when panel open */}
      {openPanel && (
        <div
          className="absolute inset-0 bg-black/60"
          style={{ zIndex: 20 }}
          onClick={() => setOpenPanel(null)}
        />
      )}

      {/* Bottom Skill Bar */}
      <div className="w-full px-4 pb-4 flex justify-center">
        <SkillBar />
      </div>
    </div>
  );
}
