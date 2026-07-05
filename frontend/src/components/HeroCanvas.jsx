import { useEffect, useRef, useCallback } from "react";

/*
  CONNEXTed hero particle animation.

  A looping, three-act morph that tells the product story:
    1. card handoff  — two people, one passing a business card (capture)
    2. neural net    — the card dissolves into a layered network (AI enrichment)
    3. handshake     — the network reforms into a handshake (human connection)

  Pure React + Canvas, no dependencies. Light particles on a dark hero band.
  The canvas is pointer-events: none so the CTAs above stay clickable; mouse
  repulsion is wired through a window listener instead.
*/

const PARTICLE_COUNT = 2600;
const MORPH_DURATION = 150; // frames to morph between scenes
const HOLD_DURATION = 120; // frames to hold each scene
const SCENES = ["card", "neural", "handshake"];

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// --- primitive samplers -------------------------------------------------

function sampleDisc(cx, cy, rad) {
  const a = Math.random() * Math.PI * 2;
  const rr = Math.sqrt(Math.random()) * rad;
  return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr };
}

function sampleCapsule(ax, ay, bx, by, rad) {
  const t = Math.random();
  const x = ax + (bx - ax) * t;
  const y = ay + (by - ay) * t;
  const o = sampleDisc(0, 0, rad);
  return { x: x + o.x, y: y + o.y };
}

function sampleRect(cx, cy, w, h) {
  return { x: cx + (Math.random() - 0.5) * w, y: cy + (Math.random() - 0.5) * h };
}

function disc(cx, cy, rad) {
  return { w: Math.PI * rad * rad, sample: () => sampleDisc(cx, cy, rad) };
}
function capsule(ax, ay, bx, by, rad) {
  const len = Math.hypot(bx - ax, by - ay);
  return { w: len * 2 * rad + Math.PI * rad * rad, sample: () => sampleCapsule(ax, ay, bx, by, rad) };
}
function rect(cx, cy, w, h) {
  return { w: w * h, sample: () => sampleRect(cx, cy, w, h) };
}

// Build exactly `count` points, distributed across primitives by area weight.
function buildPoints(count, prims) {
  const total = prims.reduce((a, p) => a + p.w, 0);
  const out = [];
  for (let i = 0; i < count; i++) {
    let r = Math.random() * total;
    let chosen = prims[prims.length - 1];
    for (const p of prims) {
      if (r < p.w) {
        chosen = p;
        break;
      }
      r -= p.w;
    }
    out.push(chosen.sample());
  }
  return out;
}

// --- scene geometry -----------------------------------------------------

function personPrims(px, py, h, facing) {
  // px,py = torso center; h = full figure height; facing +1 = faces right.
  const f = facing;
  return [
    disc(px, py - 0.34 * h, 0.075 * h), // head
    capsule(px, py - 0.22 * h, px, py + 0.06 * h, 0.072 * h), // torso
    capsule(px - 0.03 * h, py + 0.06 * h, px - 0.045 * h, py + 0.34 * h, 0.034 * h), // back leg
    capsule(px + 0.03 * h, py + 0.06 * h, px + 0.045 * h, py + 0.34 * h, 0.034 * h), // front leg
    capsule(px - f * 0.05 * h, py - 0.16 * h, px - f * 0.09 * h, py + 0.05 * h, 0.03 * h), // back arm
    // front arm reaches toward the centre (toward the card)
    capsule(px + f * 0.05 * h, py - 0.15 * h, px + f * 0.28 * h, py - 0.06 * h, 0.03 * h)
  ];
}

function cardScene(count, cx, cy, S) {
  const h = 0.6 * S;
  const gap = 0.24 * S;
  const prims = [
    ...personPrims(cx - gap, cy, h, 1),
    ...personPrims(cx + gap, cy, h, -1),
    // the business card being passed, centred between the reaching hands
    rect(cx, cy - 0.09 * h, 0.11 * h, 0.07 * h)
  ];
  return buildPoints(count, prims);
}

function neuralScene(count, cx, cy, S) {
  const layerSizes = [4, 6, 6, 4];
  const nLayers = layerSizes.length;
  const spanX = 0.64 * S;
  const spanY = 0.62 * S;
  const layers = [];
  const prims = [];
  for (let l = 0; l < nLayers; l++) {
    const n = layerSizes[l];
    const lx = cx + (l / (nLayers - 1) - 0.5) * spanX;
    const nodes = [];
    for (let k = 0; k < n; k++) {
      const ly = cy + (n === 1 ? 0 : (k / (n - 1) - 0.5) * spanY);
      nodes.push({ x: lx, y: ly });
      prims.push(disc(lx, ly, 0.024 * S));
    }
    layers.push(nodes);
  }
  return { points: buildPoints(count, prims), layers };
}

function handshakeScene(count, cx, cy, S) {
  const prims = [
    // forearms come in fairly horizontally from the sides, angling down to cuffs
    capsule(cx - 0.4 * S, cy + 0.14 * S, cx - 0.07 * S, cy + 0.01 * S, 0.048 * S),
    capsule(cx + 0.4 * S, cy + 0.14 * S, cx + 0.07 * S, cy + 0.01 * S, 0.048 * S),
    // dense central clasp (two hands gripping)
    disc(cx - 0.03 * S, cy, 0.075 * S),
    disc(cx + 0.04 * S, cy - 0.005 * S, 0.07 * S),
    disc(cx + 0.005 * S, cy + 0.006 * S, 0.06 * S),
    // thumbs up
    capsule(cx - 0.02 * S, cy - 0.03 * S, cx - 0.05 * S, cy - 0.12 * S, 0.022 * S),
    capsule(cx + 0.03 * S, cy - 0.03 * S, cx + 0.06 * S, cy - 0.11 * S, 0.022 * S),
    // finger ridges across the grip
    capsule(cx - 0.06 * S, cy - 0.02 * S, cx + 0.06 * S, cy - 0.03 * S, 0.012 * S),
    capsule(cx - 0.06 * S, cy + 0.02 * S, cx + 0.06 * S, cy + 0.015 * S, 0.012 * S),
    // cuffs
    rect(cx - 0.38 * S, cy + 0.13 * S, 0.06 * S, 0.05 * S),
    rect(cx + 0.38 * S, cy + 0.13 * S, 0.06 * S, 0.05 * S)
  ];
  return buildPoints(count, prims);
}

function createParticle(startPts) {
  const p = startPts[Math.floor(Math.random() * startPts.length)];
  return {
    x: p.x + (Math.random() - 0.5) * 24,
    y: p.y + (Math.random() - 0.5) * 24,
    vx: 0,
    vy: 0,
    size: 0.6 + Math.random() * 1.3,
    alpha: 0.25 + Math.random() * 0.55,
    noiseOffset: Math.random() * 1000,
    brightness: 0.5 + Math.random() * 0.5
  };
}

export default function HeroCanvas() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef(0);
  const stateRef = useRef({
    W: 0,
    H: 0,
    dpr: 1,
    frame: 0,
    morphProgress: 0,
    sceneIndex: 0,
    morphState: "hold",
    holdTimer: 0,
    scenes: {},
    neuralLayers: [],
    particles: [],
    mouse: { x: -1000, y: -1000, active: false }
  });

  const buildScenes = useCallback(() => {
    const s = stateRef.current;
    const cx = s.W * 0.5;
    const cy = s.H * 0.5;
    const S = Math.min(s.W, s.H);
    const neural = neuralScene(PARTICLE_COUNT, cx, cy, S);
    s.scenes = {
      card: cardScene(PARTICLE_COUNT, cx, cy, S),
      neural: neural.points,
      handshake: handshakeScene(PARTICLE_COUNT, cx, cy, S)
    };
    s.neuralLayers = neural.layers;
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const s = stateRef.current;
    s.dpr = Math.min(window.devicePixelRatio || 1, 2);
    s.W = canvas.width = container.offsetWidth * s.dpr;
    s.H = canvas.height = container.offsetHeight * s.dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    s.W /= s.dpr;
    s.H /= s.dpr;

    buildScenes();
  }, [buildScenes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = stateRef.current;
    resize();

    s.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      s.particles.push(createParticle(s.scenes[SCENES[0]]));
    }

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const drawNeural = (weight) => {
      if (weight <= 0.01 || !s.neuralLayers.length) return;
      const time = s.frame * 0.02;

      // edges between adjacent layers
      ctx.lineWidth = 0.5;
      for (let l = 0; l < s.neuralLayers.length - 1; l++) {
        for (const a of s.neuralLayers[l]) {
          for (const b of s.neuralLayers[l + 1]) {
            ctx.strokeStyle = `rgba(210,220,235,${0.09 * weight})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // glowing nodes
      let i = 0;
      for (const layer of s.neuralLayers) {
        for (const node of layer) {
          const pulse = 0.6 + Math.sin(time + i) * 0.4;
          const r = 3 * weight;
          const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 5);
          grad.addColorStop(0, `rgba(235,240,250,${0.5 * pulse * weight})`);
          grad.addColorStop(0.4, `rgba(180,200,230,${0.18 * pulse * weight})`);
          grad.addColorStop(1, "rgba(180,200,230,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r * 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255,255,255,${0.75 * weight})`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r * 0.6, 0, Math.PI * 2);
          ctx.fill();
          i++;
        }
      }
    };

    const step = () => {
      // scene state machine
      if (s.morphState === "hold") {
        s.holdTimer++;
        if (s.holdTimer > HOLD_DURATION) {
          s.morphState = "morph";
          s.holdTimer = 0;
          s.morphProgress = 0;
        }
      } else {
        s.morphProgress += 1 / MORPH_DURATION;
        if (s.morphProgress >= 1) {
          s.morphProgress = 0;
          s.morphState = "hold";
          s.holdTimer = 0;
          s.sceneIndex = (s.sceneIndex + 1) % SCENES.length;
        }
      }

      const fromScene = SCENES[s.sceneIndex];
      const toScene = SCENES[(s.sceneIndex + 1) % SCENES.length];
      const eased = easeInOutCubic(s.morphProgress);
      const fromPts = s.scenes[fromScene];
      const toPts = s.scenes[toScene];

      let neuralWeight = 0;
      if (toScene === "neural") neuralWeight = eased;
      else if (fromScene === "neural") neuralWeight = 1 - eased;

      return { fromPts, toPts, eased, neuralWeight };
    };

    const render = () => {
      ctx.clearRect(0, 0, s.W, s.H);
      const { fromPts, toPts, eased, neuralWeight } = step();

      drawNeural(neuralWeight);

      for (let i = 0; i < s.particles.length; i++) {
        const p = s.particles[i];
        const fp = fromPts[i];
        const tp = toPts[i];
        const tx = fp.x + (tp.x - fp.x) * eased;
        const ty = fp.y + (tp.y - fp.y) * eased;

        const time = s.frame * 0.002;
        const nx = Math.sin(time + p.noiseOffset) * 6;
        const ny = Math.cos(time + p.noiseOffset * 1.3) * 6;

        let mx = 0;
        let my = 0;
        if (s.mouse.active) {
          const dx = p.x - s.mouse.x;
          const dy = p.y - s.mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 140 && dist > 0.01) {
            const force = (140 - dist) / 140;
            mx = (dx / dist) * force * 3;
            my = (dy / dist) * force * 3;
          }
        }

        const spring = 0.04;
        p.vx += (tx + nx - p.x) * spring + mx * 0.12;
        p.vy += (ty + ny - p.y) * spring + my * 0.12;
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.x += p.vx;
        p.y += p.vy;

        const dTarget = Math.hypot(p.x - tx, p.y - ty);
        const a = Math.max(0.06, p.alpha * (1 - Math.min(dTarget / 90, 0.7)));
        const light = 235 + Math.round(20 * neuralWeight);
        ctx.fillStyle = `rgba(${light},${light},${Math.min(255, light + 8)},${a * p.brightness})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      s.frame++;
    };

    const animate = () => {
      render();
      animRef.current = requestAnimationFrame(animate);
    };

    if (reduceMotion) {
      // static first scene for reduced-motion users
      const pts = s.scenes[SCENES[0]];
      ctx.clearRect(0, 0, s.W, s.H);
      for (let i = 0; i < s.particles.length; i++) {
        const p = s.particles[i];
        const tp = pts[i];
        ctx.fillStyle = `rgba(235,235,240,${p.alpha * p.brightness})`;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      animate();
    }

    const onResize = () => {
      resize();
    };
    window.addEventListener("resize", onResize);

    // Mouse tracking via window so the canvas can keep pointer-events: none.
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
        s.mouse.x = x;
        s.mouse.y = y;
        s.mouse.active = true;
      } else {
        s.mouse.active = false;
      }
    };
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [resize]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        maskImage: "radial-gradient(ellipse 72% 82% at 50% 48%, black 34%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(ellipse 72% 82% at 50% 48%, black 34%, transparent 80%)"
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full opacity-90" />
    </div>
  );
}
