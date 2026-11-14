export const MAX_PARTICLES = 700;

export type Particle = {
  on: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  end: number;
  cr: number;
  cg: number;
  cb: number;
  drag: number;
  grav: number;
  kind: number;
  rot: number;
  vr: number;
};

export function createParticles(): Particle[] {
  const pool: Particle[] = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pool.push({
      on: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      max: 1,
      size: 2,
      end: 0,
      cr: 255,
      cg: 255,
      cb: 255,
      drag: 1,
      grav: 0,
      kind: 0,
      rot: 0,
      vr: 0,
    });
  }
  return pool;
}

let cursor = 0;

export function spawn(pool: Particle[]): Particle {
  const p = pool[cursor];
  cursor = (cursor + 1) % pool.length;
  p.on = 1;
  return p;
}

function rand(spread: number) {
  return (Math.random() - 0.5) * spread;
}

export function emitSparks(
  pool: Particle[],
  x: number,
  y: number,
  count: number,
  speed: number,
  cr: number,
  cg: number,
  cb: number,
  biasX = 0,
  biasY = 0,
) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.85);
    const p = spawn(pool);
    p.x = x;
    p.y = y;
    p.vx = Math.cos(a) * s + biasX;
    p.vy = Math.sin(a) * s + biasY;
    p.life = p.max = 0.18 + Math.random() * 0.28;
    p.size = 1.5 + Math.random() * 2.2;
    p.end = 0.2;
    p.cr = cr;
    p.cg = cg;
    p.cb = cb;
    p.drag = 2.4;
    p.grav = 0;
    p.kind = 0;
    p.rot = 0;
    p.vr = 0;
  }
}

export function emitDebris(pool: Particle[], x: number, y: number, count: number, cr: number, cg: number, cb: number) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 160;
    const p = spawn(pool);
    p.x = x + rand(8);
    p.y = y + rand(8);
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s;
    p.life = p.max = 0.35 + Math.random() * 0.45;
    p.size = 2 + Math.random() * 4;
    p.end = 0.4;
    p.cr = cr;
    p.cg = cg;
    p.cb = cb;
    p.drag = 1.1;
    p.grav = 80;
    p.kind = 4;
    p.rot = Math.random() * 6;
    p.vr = rand(8);
  }
}

export function emitSmoke(pool: Particle[], x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    const p = spawn(pool);
    p.x = x + rand(10);
    p.y = y + rand(10);
    p.vx = rand(30);
    p.vy = -20 - Math.random() * 40;
    p.life = p.max = 0.45 + Math.random() * 0.4;
    p.size = 6 + Math.random() * 8;
    p.end = 22 + Math.random() * 10;
    p.cr = 90;
    p.cg = 110;
    p.cb = 120;
    p.drag = 0.6;
    p.grav = -10;
    p.kind = 2;
    p.rot = 0;
    p.vr = 0;
  }
}

export function emitRing(pool: Particle[], x: number, y: number, cr: number, cg: number, cb: number, size = 8) {
  const p = spawn(pool);
  p.x = x;
  p.y = y;
  p.vx = 0;
  p.vy = 0;
  p.life = p.max = 0.38;
  p.size = size;
  p.end = size * 7;
  p.cr = cr;
  p.cg = cg;
  p.cb = cb;
  p.drag = 0;
  p.grav = 0;
  p.kind = 3;
  p.rot = 0;
  p.vr = 0;
}

export function emitFlash(pool: Particle[], x: number, y: number, cr: number, cg: number, cb: number, size = 18) {
  const p = spawn(pool);
  p.x = x;
  p.y = y;
  p.vx = 0;
  p.vy = 0;
  p.life = p.max = 0.12;
  p.size = size;
  p.end = size * 0.4;
  p.cr = cr;
  p.cg = cg;
  p.cb = cb;
  p.drag = 0;
  p.grav = 0;
  p.kind = 5;
  p.rot = 0;
  p.vr = 0;
}

export function emitEngine(pool: Particle[], x: number, y: number) {
  const p = spawn(pool);
  p.x = x + rand(6);
  p.y = y;
  p.vx = rand(18);
  p.vy = 70 + Math.random() * 90;
  p.life = p.max = 0.18 + Math.random() * 0.12;
  p.size = 2.5;
  p.end = 0.4;
  p.cr = Math.random() > 0.35 ? 46 : 255;
  p.cg = Math.random() > 0.35 ? 230 : 80;
  p.cb = Math.random() > 0.35 ? 199 : 140;
  p.drag = 1.2;
  p.grav = 0;
  p.kind = 1;
  p.rot = 0;
  p.vr = 0;
}

export function emitTrail(pool: Particle[], x: number, y: number, cr: number, cg: number, cb: number) {
  const p = spawn(pool);
  p.x = x;
  p.y = y;
  p.vx = rand(12);
  p.vy = rand(12);
  p.life = p.max = 0.16;
  p.size = 2.2;
  p.end = 0.2;
  p.cr = cr;
  p.cg = cg;
  p.cb = cb;
  p.drag = 0.4;
  p.grav = 0;
  p.kind = 1;
  p.rot = 0;
  p.vr = 0;
}

export function emitMuzzle(pool: Particle[], x: number, y: number, dir: number) {
  emitFlash(pool, x, y, 230, 255, 255, 14);
  for (let i = 0; i < 6; i++) {
    const p = spawn(pool);
    p.x = x;
    p.y = y;
    p.vx = rand(40);
    p.vy = dir * (80 + Math.random() * 140);
    p.life = p.max = 0.1 + Math.random() * 0.08;
    p.size = 1.6;
    p.end = 0.2;
    p.cr = 80;
    p.cg = 255;
    p.cb = 230;
    p.drag = 1.5;
    p.grav = 0;
    p.kind = 0;
    p.rot = 0;
    p.vr = 0;
  }
}

export function emitExplosion(pool: Particle[], x: number, y: number, scale: number) {
  const n = Math.round(18 * scale);
  emitSparks(pool, x, y, n, 220 * scale, 80, 255, 230);
  emitSparks(pool, x, y, Math.round(10 * scale), 160 * scale, 255, 77, 109);
  emitDebris(pool, x, y, Math.round(8 * scale), 240, 180, 80);
  emitSmoke(pool, x, y, Math.round(6 * scale));
  emitRing(pool, x, y, 180, 255, 245, 6 * scale);
  emitFlash(pool, x, y, 255, 255, 255, 22 * scale);
}

export function emitPhase(pool: Particle[], x: number, y: number) {
  emitRing(pool, x, y, 240, 180, 40, 10);
  emitRing(pool, x, y, 46, 230, 199, 18);
  emitSparks(pool, x, y, 36, 280, 255, 210, 90);
  emitFlash(pool, x, y, 255, 220, 140, 40);
}

export function stepParticles(pool: Particle[], dt: number) {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.on) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.on = 0;
      continue;
    }
    p.vx *= Math.max(0, 1 - p.drag * dt);
    p.vy *= Math.max(0, 1 - p.drag * dt);
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, pool: Particle[]) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.on || p.kind === 2) continue;
    const t = 1 - p.life / p.max;
    const alpha = p.kind === 5 ? 1 - t : 1 - t * t;
    const size = p.size + (p.end - p.size) * t;
    ctx.strokeStyle = `rgba(${p.cr},${p.cg},${p.cb},${alpha})`;
    ctx.fillStyle = `rgba(${p.cr},${p.cg},${p.cb},${alpha})`;
    if (p.kind === 0) {
      const len = Math.hypot(p.vx, p.vy);
      const nx = len > 1 ? p.vx / len : 0;
      const ny = len > 1 ? p.vy / len : -1;
      ctx.lineWidth = Math.max(1, size * 0.6);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - nx * (6 + size * 2), p.y - ny * (6 + size * 2));
      ctx.stroke();
    } else if (p.kind === 3) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, size), 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 4) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-size * 0.5, -size * 0.2, size, size * 0.4);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.on || p.kind !== 2) continue;
    const t = 1 - p.life / p.max;
    const alpha = (1 - t) * 0.35;
    const size = p.size + (p.end - p.size) * t;
    ctx.fillStyle = `rgba(${p.cr},${p.cg},${p.cb},${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
