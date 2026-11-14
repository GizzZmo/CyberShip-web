import { createSfx, type Sfx } from "./audio";
import {
  createParticles,
  drawParticles,
  emitDebris,
  emitEngine,
  emitExplosion,
  emitMuzzle,
  emitPhase,
  emitRing,
  emitSparks,
  emitTrail,
  stepParticles,
  type Particle,
} from "./particles";

export const WORLD_W = 402;
export const WORLD_H = 778;

export type GameState = "title" | "play" | "pause" | "over" | "win";

export type Hud = {
  state: GameState;
  score: number;
  best: number;
  lives: number;
  wave: number;
  bossHp: number;
  bossMax: number;
  banner: string;
  muted: boolean;
  shake: boolean;
};

type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  friendly: boolean;
  dmg: number;
  life: number;
  homing: number;
};

type Enemy = {
  kind: "drone" | "kami" | "boss";
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  max: number;
  r: number;
  t: number;
  shoot: number;
  phase: number;
  score: number;
};

type Pop = { x: number; y: number; text: string; life: number };
type Boom = { x: number; y: number; t: number };

type Sprites = {
  player: HTMLImageElement;
  drone: HTMLImageElement;
  boss: HTMLImageElement;
  bolt: HTMLImageElement;
  plasma: HTMLImageElement;
  boom: HTMLImageElement[];
};

const BEST_KEY = "cybership-best";

function loadImage(src: string) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  return img;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function createEngine(canvas: HTMLCanvasElement, onHud: (hud: Hud) => void) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unsupported");
  const ctx: CanvasRenderingContext2D = context;

  const sfx: Sfx = createSfx();
  const particles: Particle[] = createParticles();
  const sprites: Sprites = {
    player: loadImage("/sprites/player/clean.png"),
    drone: loadImage("/sprites/drone/clean.png"),
    boss: loadImage("/sprites/boss/clean.png"),
    bolt: loadImage("/sprites/bolt/projectile-1.png"),
    plasma: loadImage("/sprites/plasma/projectile-1.png"),
    boom: [1, 2, 3, 4].map((n) => loadImage(`/sprites/explosion/impact-${n}.png`)),
  };

  const keys = new Set<string>();
  let pointer = false;
  let aimX = WORLD_W * 0.5;
  let aimY = WORLD_H * 0.82;
  let raf = 0;
  let running = true;
  let last = performance.now();
  let acc = 0;
  const step = 1 / 60;

  let state: GameState = "title";
  let score = 0;
  let best = 0;
  try {
    best = Number(localStorage.getItem(BEST_KEY) || 0);
  } catch {
    best = 0;
  }
  let lives = 3;
  let wave = 1;
  let banner = "";
  let bannerT = 0;
  let muted = false;
  let shakeOn = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let trauma = 0;
  let flash = 0;
  let freeze = 0;
  let invuln = 0;
  let fireCd = 0;
  let px = WORLD_W * 0.5;
  let py = WORLD_H * 0.82;
  const bullets: Bullet[] = [];
  const enemies: Enemy[] = [];
  const pops: Pop[] = [];
  const booms: Boom[] = [];
  const stars = Array.from({ length: 70 }, () => ({
    x: Math.random() * WORLD_W,
    y: Math.random() * WORLD_H,
    s: 0.4 + Math.random() * 1.6,
    v: 20 + Math.random() * 80,
  }));

  let spawnQueue = 0;
  let kamiLeft = 0;
  let spawnTimer = 1.2;
  let between = 0;
  let bossSpawned = false;
  let hudDirty = true;

  function publish() {
    onHud({
      state,
      score,
      best,
      lives,
      wave,
      bossHp: boss()?.hp ?? 0,
      bossMax: boss()?.max ?? 0,
      banner,
      muted,
      shake: shakeOn,
    });
    hudDirty = false;
  }

  function boss() {
    return enemies.find((e) => e.kind === "boss");
  }

  function addScore(n: number) {
    score += n;
    if (score > best) {
      best = score;
      try {
        localStorage.setItem(BEST_KEY, String(best));
      } catch {
        /* ignore quota */
      }
    }
    hudDirty = true;
  }

  function setBanner(text: string, time = 1.6) {
    banner = text;
    bannerT = time;
    hudDirty = true;
  }

  function resetRun() {
    score = 0;
    lives = 3;
    wave = 1;
    px = WORLD_W * 0.5;
    py = WORLD_H * 0.82;
    bullets.length = 0;
    enemies.length = 0;
    pops.length = 0;
    booms.length = 0;
    spawnQueue = 8;
    kamiLeft = 0;
    spawnTimer = 0.8;
    between = 0;
    bossSpawned = false;
    invuln = 0;
    fireCd = 0.2;
    trauma = 0;
    flash = 0;
    freeze = 0;
    setBanner("Bølge 1", 1.4);
    hudDirty = true;
  }

  function start() {
    sfx.unlock();
    resetRun();
    state = "play";
    hudDirty = true;
  }

  function togglePause() {
    if (state === "play") state = "pause";
    else if (state === "pause") state = "play";
    hudDirty = true;
  }

  function killEnemy(e: Enemy, index: number) {
    const big = e.kind === "boss";
    emitExplosion(particles, e.x, e.y, big ? 2.4 : e.kind === "kami" ? 1.15 : 0.9);
    booms.push({ x: e.x, y: e.y, t: 0 });
    sfx.explode(big);
    addScore(e.score);
    pops.push({ x: e.x, y: e.y - 10, text: `+${e.score}`, life: 0.7 });
    trauma = Math.min(1, trauma + (big ? 0.85 : 0.28));
    flash = big ? 0.28 : 0.08;
    freeze = big ? 0.08 : 0.035;
    enemies.splice(index, 1);
    if (big) {
      state = "win";
      setBanner("NEXUS-01 nede", 3);
    }
  }

  function hurtPlayer() {
    if (invuln > 0 || state !== "play") return;
    lives -= 1;
    invuln = 1.35;
    trauma = Math.min(1, trauma + 0.55);
    flash = 0.18;
    freeze = 0.05;
    emitSparks(particles, px, py, 16, 180, 255, 77, 109);
    emitRing(particles, px, py, 255, 80, 110, 8);
    sfx.hurt();
    hudDirty = true;
    if (lives <= 0) {
      emitExplosion(particles, px, py, 1.6);
      booms.push({ x: px, y: py, t: 0 });
      sfx.explode(true);
      state = "over";
      setBanner("Skipet falt", 3);
    }
  }

  function spawnEnemy(kind: "drone" | "kami", hp: number) {
    const x = 40 + Math.random() * (WORLD_W - 80);
    enemies.push({
      kind,
      x,
      y: -30,
      vx: kind === "kami" ? 0 : (Math.random() - 0.5) * 40,
      vy: kind === "kami" ? 150 : 78,
      hp,
      max: hp,
      r: kind === "kami" ? 16 : 18,
      t: Math.random() * 6,
      shoot: 0.6 + Math.random() * 1.2,
      phase: 0,
      score: kind === "kami" ? 150 : 100,
    });
  }

  function spawnBoss() {
    enemies.push({
      kind: "boss",
      x: WORLD_W * 0.5,
      y: 120,
      vx: 40,
      vy: 0,
      hp: 140,
      max: 140,
      r: 62,
      t: 0,
      shoot: 1.1,
      phase: 0,
      score: 2000,
    });
    emitPhase(particles, WORLD_W * 0.5, 120);
    sfx.phase();
    setBanner("NEXUS-01", 2);
    bossSpawned = true;
  }

  function firePlayer() {
    if (fireCd > 0) return;
    fireCd = 0.16;
    bullets.push({
      x: px,
      y: py - 28,
      vx: 0,
      vy: -640,
      r: 7,
      friendly: true,
      dmg: 1,
      life: 2,
      homing: 0,
    });
    emitMuzzle(particles, px, py - 30, -1);
    sfx.shoot();
  }

  function bossAttack(b: Enemy) {
    const phase = b.phase;
    if (phase === 0) {
      for (let i = -2; i <= 2; i++) {
        const a = -Math.PI / 2 + i * 0.16;
        bullets.push({
          x: b.x,
          y: b.y + 40,
          vx: Math.cos(a) * 220,
          vy: Math.sin(a) * 220,
          r: 7,
          friendly: false,
          dmg: 1,
          life: 4,
          homing: 0,
        });
      }
    } else if (phase === 1) {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + b.t;
        bullets.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(a) * 170,
          vy: Math.sin(a) * 170,
          r: 6,
          friendly: false,
          dmg: 1,
          life: 4,
          homing: 0,
        });
      }
      emitRing(particles, b.x, b.y, 255, 90, 130, 12);
    } else {
      const n = phase === 3 ? 5 : 4;
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * 0.22;
        bullets.push({
          x: b.x + (i - (n - 1) / 2) * 18,
          y: b.y + 36,
          vx: Math.sin(spread) * 80,
          vy: 160,
          r: 8,
          friendly: false,
          dmg: 1,
          life: 5,
          homing: 2.2,
        });
      }
    }
    emitMuzzle(particles, b.x, b.y + 36, 1);
    sfx.shoot();
  }

  function update(dt: number) {
    for (const s of stars) {
      s.y += s.v * dt;
      if (s.y > WORLD_H) {
        s.y = 0;
        s.x = Math.random() * WORLD_W;
      }
    }

    if (state === "title" || state === "pause") {
      if (shakeOn && Math.random() < 0.4) emitEngine(particles, WORLD_W * 0.5, WORLD_H * 0.62);
      stepParticles(particles, dt);
      return;
    }
    if (state === "over" || state === "win") {
      stepParticles(particles, dt);
      for (const boom of booms) boom.t += dt;
      trauma = Math.max(0, trauma - dt * 1.4);
      flash = Math.max(0, flash - dt);
      return;
    }

    const simDt = freeze > 0 ? dt * 0.15 : dt;
    if (freeze > 0) freeze -= dt;
    if (bannerT > 0) {
      bannerT -= dt;
      if (bannerT <= 0) {
        banner = "";
        hudDirty = true;
      }
    }

    let mx = 0;
    let my = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;
    const speed = 320;
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my) || 1;
      px += (mx / len) * speed * simDt;
      py += (my / len) * speed * simDt;
    }
    if (pointer) {
      const k = 1 - Math.exp(-10 * simDt);
      px += (aimX - px) * k;
      py += (aimY - 120 - py) * k;
    }
    px = clamp(px, 34, WORLD_W - 34);
    py = clamp(py, WORLD_H * 0.55, WORLD_H - 56);

    if (shakeOn) {
      emitEngine(particles, px - 8, py + 22);
      emitEngine(particles, px + 8, py + 22);
    }

    invuln = Math.max(0, invuln - simDt);
    fireCd = Math.max(0, fireCd - simDt);
    firePlayer();

    if (!bossSpawned && wave <= 3) {
      spawnTimer -= simDt;
      if (between > 0) {
        between -= simDt;
      } else if (spawnQueue + kamiLeft > 0 && spawnTimer <= 0) {
        const kami = kamiLeft > 0 && (spawnQueue === 0 || Math.random() < 0.28);
        if (kami) {
          kamiLeft -= 1;
          spawnEnemy("kami", 1);
        } else if (spawnQueue > 0) {
          spawnQueue -= 1;
          spawnEnemy("drone", wave === 3 ? 3 : 2);
        }
        spawnTimer = wave === 1 ? 0.72 : wave === 2 ? 0.55 : 0.42;
      } else if (spawnQueue + kamiLeft <= 0 && enemies.length === 0) {
        if (wave >= 3) {
          between = 1.4;
          wave = 4;
          hudDirty = true;
          setBanner("Boss innkommende", 1.4);
        } else {
          wave += 1;
          spawnQueue = wave === 2 ? 12 : 10;
          kamiLeft = wave === 2 ? 2 : 5;
          between = 1.3;
          setBanner(`Bølge ${wave}`, 1.3);
        }
      }
    } else if (wave >= 4 && !bossSpawned && between <= 0 && bannerT <= 0.2) {
      spawnBoss();
    } else if (between > 0 && wave >= 4 && !bossSpawned) {
      between -= simDt;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.t += simDt;
      if (e.kind === "boss") {
        e.x += Math.sin(e.t * 0.7) * 50 * simDt;
        e.x = clamp(e.x, 96, WORLD_W - 96);
        const ratio = e.hp / e.max;
        const next = ratio <= 0.25 ? 3 : ratio <= 0.5 ? 2 : ratio <= 0.75 ? 1 : 0;
        if (next !== e.phase) {
          e.phase = next;
          emitPhase(particles, e.x, e.y);
          sfx.phase();
          trauma = Math.min(1, trauma + 0.45);
          flash = 0.2;
          freeze = 0.07;
          setBanner(next === 3 ? "SISTE FASE" : `Fase ${next + 1}`, 1.1);
        }
        e.shoot -= simDt;
        const rate = e.phase === 3 ? 0.7 : e.phase === 0 ? 1.35 : 1.5;
        if (e.shoot <= 0) {
          e.shoot = rate;
          bossAttack(e);
        }
      } else if (e.kind === "kami") {
        const dx = px - e.x;
        e.vx += clamp(dx, -1, 1) * 220 * simDt;
        e.vx *= 0.98;
        e.x += e.vx * simDt;
        e.y += e.vy * simDt;
      } else {
        e.x += Math.sin(e.t * 2.2) * 50 * simDt + e.vx * simDt * 0.2;
        e.y += e.vy * simDt;
        e.shoot -= simDt;
        if (e.shoot <= 0 && e.y > 40 && e.y < WORLD_H * 0.7) {
          e.shoot = 1.4 + Math.random();
          bullets.push({
            x: e.x,
            y: e.y + 16,
            vx: (px - e.x) * 0.15,
            vy: 240,
            r: 6,
            friendly: false,
            dmg: 1,
            life: 4,
            homing: 0,
          });
        }
      }
      if (e.kind !== "boss" && e.y > WORLD_H + 40) enemies.splice(i, 1);
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (b.homing > 0) {
        const dx = px - b.x;
        const dy = py - b.y;
        const d = Math.hypot(dx, dy) || 1;
        b.vx += (dx / d) * 280 * simDt;
        b.vy += (dy / d) * 280 * simDt;
        const sp = Math.hypot(b.vx, b.vy) || 1;
        const max = 260;
        if (sp > max) {
          b.vx = (b.vx / sp) * max;
          b.vy = (b.vy / sp) * max;
        }
        b.homing -= simDt;
      }
      b.x += b.vx * simDt;
      b.y += b.vy * simDt;
      b.life -= simDt;
      if (shakeOn && Math.random() < 0.7) {
        emitTrail(particles, b.x, b.y, b.friendly ? 80 : 255, b.friendly ? 255 : 90, b.friendly ? 230 : 120);
      }
      if (b.life <= 0 || b.y < -30 || b.y > WORLD_H + 30 || b.x < -30 || b.x > WORLD_W + 30) {
        bullets.splice(i, 1);
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b) continue;
      if (b.friendly) {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const dx = e.x - b.x;
          const dy = e.y - b.y;
          if (dx * dx + dy * dy < (e.r + b.r) * (e.r + b.r)) {
            e.hp -= b.dmg;
            emitSparks(particles, b.x, b.y, 7, 140, 180, 255, 240, 0, b.vy * 0.05);
            sfx.hit();
            bullets.splice(i, 1);
            if (e.hp <= 0) killEnemy(e, j);
            else if (e.kind === "boss") hudDirty = true;
            break;
          }
        }
      } else if (invuln <= 0) {
        const dx = px - b.x;
        const dy = py - b.y;
        if (dx * dx + dy * dy < (16 + b.r) * (16 + b.r)) {
          bullets.splice(i, 1);
          hurtPlayer();
        }
      }
    }

    if (invuln <= 0) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (e.kind === "boss") continue;
        const dx = px - e.x;
        const dy = py - e.y;
        if (dx * dx + dy * dy < (16 + e.r) * (16 + e.r)) {
          killEnemy(e, j);
          hurtPlayer();
          break;
        }
      }
    }

    stepParticles(particles, dt);
    for (let i = pops.length - 1; i >= 0; i--) {
      pops[i].life -= dt;
      pops[i].y -= 30 * dt;
      if (pops[i].life <= 0) pops.splice(i, 1);
    }
    for (let i = booms.length - 1; i >= 0; i--) {
      booms[i].t += dt;
      if (booms[i].t > 0.32) booms.splice(i, 1);
    }
    trauma = Math.max(0, trauma - dt * 1.6);
    flash = Math.max(0, flash - dt * 1.4);
  }

  function drawSprite(img: HTMLImageElement, x: number, y: number, w: number, h: number, spin = 0) {
    if (!img.complete || img.naturalWidth === 0) return;
    ctx.save();
    ctx.translate(x, y);
    if (spin) ctx.rotate(spin);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function viewMetrics() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = canvas.getBoundingClientRect();
    const bw = Math.max(1, Math.floor(rect.width * dpr));
    const bh = Math.max(1, Math.floor(rect.height * dpr));
    const cs = getComputedStyle(document.documentElement);
    const padL = (parseFloat(cs.getPropertyValue("--sal")) || 0) * dpr;
    const padR = (parseFloat(cs.getPropertyValue("--sar")) || 0) * dpr;
    const padT = (parseFloat(cs.getPropertyValue("--sat")) || 0) * dpr;
    const padB = (parseFloat(cs.getPropertyValue("--sab")) || 0) * dpr;
    const availW = Math.max(1, bw - padL - padR);
    const availH = Math.max(1, bh - padT - padB);
    const scale = Math.min(availW / WORLD_W, availH / WORLD_H);
    const ox = padL + (availW - WORLD_W * scale) / 2;
    const oy = padT + (availH - WORLD_H * scale) / 2;
    return { dpr, bw, bh, scale, ox, oy };
  }

  function render() {
    const { bw, bh, scale, ox, oy } = viewMetrics();
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#07090d";
    ctx.fillRect(0, 0, bw, bh);

    const shake = shakeOn ? trauma * trauma : 0;
    const sx = (Math.random() - 0.5) * 16 * shake;
    const sy = (Math.random() - 0.5) * 16 * shake;
    ctx.setTransform(scale, 0, 0, scale, ox + sx * scale, oy + sy * scale);

    ctx.fillStyle = "#07090d";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    ctx.strokeStyle = "rgba(46,230,199,0.08)";
    ctx.lineWidth = 1;
    const scroll = (performance.now() / 18) % 40;
    for (let y = -40 + scroll; y < WORLD_H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_W, y);
      ctx.stroke();
    }
    for (let x = 20; x < WORLD_W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_H);
      ctx.stroke();
    }

    for (const s of stars) {
      ctx.fillStyle = s.s > 1.4 ? "rgba(240,180,41,0.7)" : "rgba(180,230,230,0.55)";
      ctx.fillRect(s.x, s.y, s.s, s.s * 2);
    }

    for (const e of enemies) {
      if (e.kind === "boss") {
        drawSprite(sprites.boss, e.x, e.y, 176, 126);
      } else if (e.kind === "kami") {
        drawSprite(sprites.drone, e.x, e.y, 46, 46, Math.sin(e.t * 12) * 0.15);
      } else {
        drawSprite(sprites.drone, e.x, e.y, 52, 52);
      }
    }

    for (const b of bullets) {
      const img = b.friendly ? sprites.bolt : sprites.plasma;
      const ang = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      drawSprite(img, b.x, b.y, b.friendly ? 16 : 18, b.friendly ? 28 : 22, ang);
    }

    if (state !== "over" && (invuln <= 0 || Math.floor(invuln * 16) % 2 === 0)) {
      drawSprite(sprites.player, px, py, 64, 78);
    }

    for (const boom of booms) {
      const frame = sprites.boom[Math.min(3, Math.floor(boom.t / 0.08))];
      drawSprite(frame, boom.x, boom.y, 96, 96);
    }

    drawParticles(ctx, particles);

    ctx.font = "700 14px Outfit, sans-serif";
    ctx.textAlign = "center";
    for (const pop of pops) {
      ctx.fillStyle = `rgba(46,230,199,${pop.life})`;
      ctx.fillText(pop.text, pop.x, pop.y);
    }

    if (flash > 0 && shakeOn) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.35})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
  }

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    acc += dt;
    while (acc >= step) {
      update(step);
      acc -= step;
    }
    render();
    if (hudDirty) publish();
    probe.x = px;
    probe.y = py;
    raf = requestAnimationFrame(frame);
  }

  function worldPoint(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const { dpr, bw, bh, scale, ox, oy } = viewMetrics();
    const x = ((clientX - rect.left) / rect.width) * bw;
    const y = ((clientY - rect.top) / rect.height) * bh;
    return { x: (x - ox) / scale, y: (y - oy) / scale, dpr };
  }

  function onKey(e: KeyboardEvent, down: boolean) {
    if (down && (e.code === "Space" || e.code === "Enter") && (state === "title" || state === "over" || state === "win")) {
      e.preventDefault();
      start();
      return;
    }
    if (down && e.code === "Escape") {
      togglePause();
      return;
    }
    if (down && e.code === "KeyM") {
      muted = !muted;
      sfx.setMuted(muted);
      hudDirty = true;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (down) keys.add(e.code);
    else keys.delete(e.code);
  }

  const keyDown = (e: KeyboardEvent) => onKey(e, true);
  const keyUp = (e: KeyboardEvent) => onKey(e, false);
  const pointerDown = (e: PointerEvent) => {
    if (state === "title" || state === "over" || state === "win") return;
    pointer = true;
    const p = worldPoint(e.clientX, e.clientY);
    aimX = p.x;
    aimY = p.y;
    canvas.setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: PointerEvent) => {
    if (!pointer) return;
    const p = worldPoint(e.clientX, e.clientY);
    aimX = p.x;
    aimY = p.y;
  };
  const pointerUp = () => {
    pointer = false;
  };

  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);

  const probe = {
    scheme: "shmup-strafe",
    a: "left",
    d: "right",
    x: px,
    y: py,
    sign(code: string) {
      if (code === "KeyA" || code === "ArrowLeft") return -1;
      if (code === "KeyD" || code === "ArrowRight") return 1;
      return 0;
    },
  };
  (window as unknown as { __controlsTest?: typeof probe }).__controlsTest = probe;

  publish();
  raf = requestAnimationFrame(frame);

  return {
    start,
    togglePause,
    setMuted(value: boolean) {
      muted = value;
      sfx.setMuted(value);
      hudDirty = true;
      publish();
    },
    setShake(value: boolean) {
      shakeOn = value;
      hudDirty = true;
      publish();
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
