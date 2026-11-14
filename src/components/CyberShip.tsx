import { useEffect, useRef, useState } from "react";
import { createEngine, type Engine, type Hud } from "@/game/engine";

const empty: Hud = {
  state: "title",
  score: 0,
  best: 0,
  lives: 3,
  wave: 1,
  bossHp: 0,
  bossMax: 0,
  banner: "",
  muted: false,
  shake: true,
};

export function CyberShip() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [hud, setHud] = useState<Hud>(empty);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createEngine(canvas, setHud);
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  const showOverlay = hud.state === "title" || hud.state === "over" || hud.state === "win";
  const bossRatio = hud.bossMax > 0 ? hud.bossHp / hud.bossMax : 0;

  return (
    <main className="play-layer relative h-dvh w-full overflow-hidden bg-ink text-fg">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

      <div className="hud-top pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs tracking-widest text-cyan">CYBERSHIP</p>
          <p className="mt-1 font-display text-2xl leading-none">{hud.score}</p>
          <p className="mt-1 text-sm text-muted">Beste {hud.best}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-sm text-muted">{hud.wave >= 4 ? "Boss" : `Bølge ${hud.wave}`}</p>
          <div className="flex justify-end gap-1.5">
            {Array.from({ length: 3 }, (_, i) => (
              <span
                key={i}
                className={`h-2.5 w-6 rounded-full ${i < hud.lives ? "bg-cyan" : "bg-line"}`}
              />
            ))}
          </div>
          {hud.state === "play" && (
            <button
              type="button"
              className="pointer-events-auto min-h-11 rounded-xl border border-line bg-panel px-4 text-sm text-fg"
              onClick={() => engineRef.current?.togglePause()}
            >
              Pause
            </button>
          )}
        </div>
      </div>

      {hud.bossMax > 0 && hud.state === "play" && (
        <div className="boss-bar pointer-events-none absolute z-10">
          <div className="mb-1 flex justify-between text-xs tracking-widest text-amber">
            <span>NEXUS-01</span>
            <span>{Math.ceil(bossRatio * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-panel">
            <div className="h-full bg-coral" style={{ width: `${Math.max(0, bossRatio) * 100}%` }} />
          </div>
        </div>
      )}

      {hud.banner && hud.state === "play" && (
        <p className="wave-banner pointer-events-none absolute inset-x-0 z-10 text-center font-display text-lg tracking-widest text-cyan">
          {hud.banner}
        </p>
      )}

      {hud.state === "pause" && (
        <div className="sheet absolute inset-0 z-20 flex items-center justify-center bg-ink/70">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6">
            <h2 className="font-display text-xl">Pause</h2>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="min-h-11 flex-1 rounded-xl bg-cyan font-display text-sm text-ink"
                onClick={() => engineRef.current?.togglePause()}
              >
                Fortsett
              </button>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-xl border border-line text-sm"
                onClick={() => engineRef.current?.start()}
              >
                Omstart
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="min-h-11 flex-1 rounded-xl border border-line text-sm"
                onClick={() => engineRef.current?.setShake(!hud.shake)}
              >
                Rist {hud.shake ? "på" : "av"}
              </button>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-xl border border-line text-sm"
                onClick={() => engineRef.current?.setMuted(!hud.muted)}
              >
                Lyd {hud.muted ? "av" : "på"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOverlay && (
        <div className="sheet absolute inset-0 z-20 flex items-end justify-center bg-ink/55 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel/95 p-6">
            <p className="font-display text-xs tracking-widest text-cyan">IPHONE 17 PRO</p>
            <h1 className="mt-2 font-display text-4xl leading-none">
              {hud.state === "win" ? "Seier" : hud.state === "over" ? "Game over" : "CyberShip"}
            </h1>
            <p className="mt-3 max-w-sm text-base leading-relaxed text-muted">
              {hud.state === "win"
                ? `NEXUS-01 er nede. Poeng ${hud.score}.`
                : hud.state === "over"
                  ? `Skipet gikk ned. Poeng ${hud.score}.`
                  : "Tre bølger, så bossen. Dra med tommelen — skipet holder seg over fingeren."}
            </p>
            {hud.state === "title" && (
              <ul className="mt-4 space-y-1 text-sm text-muted">
                <li>Hold telefonen i portrett.</li>
                <li>Skyting er automatisk. Pause sitter oppe til høyre.</li>
              </ul>
            )}
            <button
              type="button"
              className="mt-6 min-h-12 w-full rounded-xl bg-cyan font-display text-sm tracking-wide text-ink"
              onClick={() => engineRef.current?.start()}
            >
              {hud.state === "title" ? "Start oppdrag" : "Spill igjen"}
            </button>
          </div>
        </div>
      )}

      <div className="rotate-lock fixed inset-0 z-40 items-center justify-center bg-ink px-8 text-center">
        <p className="font-display text-xl text-cyan">Snu til portrett</p>
        <p className="mt-2 text-sm text-muted">CyberShip er laget for iPhone 17 Pro stående.</p>
      </div>
    </main>
  );
}
