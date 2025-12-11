import {
  NOTE_NAMES,
  DEFAULT_TRANSITION_SETTINGS,
  SIMULTANEOUS_WINDOW_MS,
  FIREWORK_DECAY_MS,
  PIANO_RANGE_START,
  PIANO_RANGE_END
} from './constants.js';
import {
  hexToRgb,
  rgbaString,
  lerp,
  lerpColor,
  easeOutCubic,
  clampTransitionDecay
} from './utils.js';

export function createVisuals({
  canvas,
  notePill,
  modePill,
  info,
  uiToggle,
  fireworkToggle,
  pianoToggle,
  piano,
  whiteKeysEl,
  blackKeysEl,
  transitionDecayInput,
  transitionDecayLabel,
  transitionEffectSelect,
  colorForNote,
  describeNote
}) {
  const ctx = canvas.getContext('2d');
  let viewW = window.innerWidth;
  let viewH = window.innerHeight;
  let uiVisible = false;
  let activeRipples = [];
  let transitionSettings = loadTransitionSettings();
  let targetColor = hexToRgb('#0b1021');
  let currentColor = { ...targetColor };
  let lastTransitionColor = { ...targetColor };
  let targetIntensity = 0.4;
  let currentIntensity = targetIntensity;
  let animationFrameId = null;
  let activeSwirls = [];
  let recentNotes = [];
  let lastSwirlAt = 0;
  let fireworkMode = false;
  let fireworks = [];
  let pianoVisible = false;
  const pianoKeys = new Map();
  const activePianoPresses = new Set();
  const pointerNotes = new Map();

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = viewW * dpr;
    canvas.height = viewH * dpr;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  function setUIVisibility(visible) {
    uiVisible = visible;
    document.body.classList.toggle('ui-hidden', !visible);
    if (uiToggle) {
      uiToggle.setAttribute('aria-pressed', String(visible));
      uiToggle.setAttribute('aria-label', visible ? 'Hide controls' : 'Show controls');
    }
  }

  function setFireworkMode(enabled) {
    fireworkMode = enabled;
    document.body.classList.toggle('firework-mode', enabled);
    if (fireworkToggle) {
      fireworkToggle.setAttribute('aria-pressed', String(enabled));
      fireworkToggle.textContent = enabled ? '🧨 Fireworks on' : '🧨 Fireworks off';
    }

    if (enabled) {
      activeRipples = [];
      activeSwirls = [];
      targetColor = hexToRgb('#000000');
      targetIntensity = 0.9;
      if (modePill) {
        modePill.textContent = 'Firework sky';
      }
      if (info) {
        info.textContent = 'Firework mode: black backdrop with glittering bursts.';
      }
    } else {
      fireworks = [];
      targetColor = hexToRgb('#0b1021');
      targetIntensity = 0.4;
      if (modePill) {
        modePill.textContent = 'Velocity reactive';
      }
    }
  }

  function setPianoVisibility(visible) {
    pianoVisible = visible;
    if (pianoToggle) {
      pianoToggle.setAttribute('aria-pressed', String(visible));
      pianoToggle.textContent = visible ? '🎹 Onscreen piano on' : '🎹 Onscreen piano off';
    }
    if (piano) {
      piano.hidden = !visible;
    }
  }

  function rgbaRadialGradient(x, y, inner, outer, color, alpha, size) {
    const gradient = ctx.createRadialGradient(x, y, inner, x, y, outer);
    gradient.addColorStop(0, rgbaString(color, alpha));
    gradient.addColorStop(1, rgbaString(color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  function spawnFirework(colorHex, intensity = 1) {
    const color = hexToRgb(colorHex);
    const count = 130;
    const cappedIntensity = Math.max(0.35, intensity);

    const particles = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      return {
        angle,
        speed: lerp(90, 240, Math.random()) * cappedIntensity,
        size: lerp(1.2, 3.8, Math.random()),
        twinkle: Math.random() * Math.PI * 2,
        decay: lerp(0.45, 0.95, Math.random()),
        spread: lerp(0.6, 1.1, Math.random())
      };
    });

    fireworks.push({
      color,
      intensity: cappedIntensity,
      start: performance.now(),
      duration: FIREWORK_DECAY_MS,
      particles
    });
  }

  function renderFireworks(now) {
    if (!fireworks.length) return;
    const centerX = viewW / 2;
    const centerY = viewH / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.globalCompositeOperation = 'lighter';

    fireworks = fireworks.filter((firework) => {
      const elapsed = now - firework.start;
      const progress = Math.min(1, elapsed / firework.duration);
      if (progress >= 1) return false;

      const fade = 1 - progress;
      const gravity = 60;

      firework.particles.forEach((particle) => {
        const travel = easeOutCubic(Math.min(1, progress * (0.7 + particle.decay * 0.5)));
        const distance = particle.speed * travel;
        const x = Math.cos(particle.angle) * distance;
        const y = Math.sin(particle.angle) * distance + gravity * progress * progress * particle.spread;

        const twinkle = 0.6 + 0.4 * Math.sin((now * 0.02) + particle.twinkle * 6);
        const alpha = Math.max(0, fade * twinkle * firework.intensity * particle.decay);
        const size = particle.size * (0.6 + fade * 0.6);

        if (alpha <= 0.01) return;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3.2);
        gradient.addColorStop(0, rgbaString(firework.color, alpha));
        gradient.addColorStop(1, rgbaString(firework.color, 0));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size * 2.6, 0, Math.PI * 2);
        ctx.fill();
      });

      return true;
    });

    ctx.restore();
  }

  function renderRipples(now) {
    if (!activeRipples.length) return;
    const centerX = viewW / 2;
    const centerY = viewH / 2;
    const maxRadius = Math.hypot(viewW, viewH) * 0.55;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    activeRipples = activeRipples.filter((ripple) => {
      const progress = Math.min(1, (now - ripple.start) / ripple.duration);
      if (progress >= 1) return false;
      const eased = easeOutCubic(progress);
      const radius = lerp(viewW * 0.04, maxRadius, eased);
      const alpha = (1 - eased) * 0.75 * ripple.velocity;

      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
      gradient.addColorStop(0, rgbaString(ripple.color, alpha));
      gradient.addColorStop(0.35, rgbaString(ripple.color, alpha * 0.75));
      gradient.addColorStop(0.7, rgbaString(ripple.color, alpha * 0.2));
      gradient.addColorStop(1, rgbaString(ripple.color, 0));

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, viewW, viewH);
      return true;
    });
    ctx.restore();
  }

  function renderSpiralStroke(radius, innerRadius, spin, offset, color, alpha) {
    const segments = 64;
    const turns = 2.2 + spin * 0.5;
    const widthStart = viewW * 0.08;
    const widthEnd = viewW * 0.015;

    ctx.save();
    ctx.rotate(offset);
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = (t * turns * Math.PI * 2);
      const r = lerp(radius, innerRadius, t);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineWidth = lerp(widthStart, widthEnd, (radius - innerRadius) / radius);
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgbaString(color, alpha);
    ctx.stroke();
    ctx.restore();
  }

  function renderSwirls(now) {
    if (!activeSwirls.length) return;
    const centerX = viewW / 2;
    const centerY = viewH / 2;
    const outerRadius = Math.hypot(viewW, viewH) * 0.55;
    const innerRadius = Math.min(viewW, viewH) * 0.05;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.globalCompositeOperation = 'lighter';

    activeSwirls = activeSwirls.filter((swirl) => {
      const progress = Math.min(1, (now - swirl.start) / swirl.duration);
      if (progress >= 1) return false;

      const eased = easeOutCubic(progress);
      const radius = lerp(outerRadius, innerRadius, eased);
      const alpha = (1 - eased) * 0.9 * swirl.intensity;
      const rotation = eased * Math.PI * 3 * swirl.spin;

      renderSpiralStroke(radius, innerRadius, swirl.spin, rotation, swirl.colors[0], alpha);
      renderSpiralStroke(radius, innerRadius, -swirl.spin, rotation + Math.PI, swirl.colors[1], alpha * 0.9);

      return true;
    });

    ctx.restore();
  }

  function renderFrame(now) {
    const timestamp = now || performance.now();

    if (fireworkMode) {
      ctx.clearRect(0, 0, viewW, viewH);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, viewW, viewH);
      renderFireworks(timestamp);
      animationFrameId = requestAnimationFrame(renderFrame);
      return;
    }

    currentColor = lerpColor(currentColor, targetColor, 0.065);
    currentIntensity = lerp(currentIntensity, targetIntensity, 0.05);

    ctx.clearRect(0, 0, viewW, viewH);
    ctx.fillStyle = rgbaString(currentColor, 1);
    ctx.fillRect(0, 0, viewW, viewH);

    const overlay = ctx.createLinearGradient(0, 0, viewW, viewH);
    overlay.addColorStop(0, 'rgba(255,255,255,' + (0.16 * currentIntensity) + ')');
    overlay.addColorStop(1, 'rgba(0,0,0,' + (0.22 * currentIntensity) + ')');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, viewW, viewH);

    renderRipples(timestamp);
    renderSwirls(timestamp);
    animationFrameId = requestAnimationFrame(renderFrame);
  }

  function startAnimationLoop() {
    if (animationFrameId !== null) return;
    animationFrameId = requestAnimationFrame(renderFrame);
  }

  function applyTransitionAnimation(color, velocity) {
    const duration = transitionSettings.decayMs + (1 - velocity) * 320;
    const spin = 1.1 + Math.random() * 1.6;

    if (transitionSettings.effect === 'swirl') {
      const previous = lastTransitionColor || color;
      activeSwirls.push({
        colors: [color, previous],
        intensity: Math.min(1, Math.max(0.35, velocity)),
        start: performance.now(),
        duration,
        spin
      });

      if (activeSwirls.length > 6) {
        activeSwirls.shift();
      }
      lastTransitionColor = color;
      return;
    }

    activeRipples.push({
      color: { ...color },
      velocity,
      start: performance.now(),
      duration
    });
    if (activeRipples.length > 8) {
      activeRipples.shift();
    }
    lastTransitionColor = color;
  }

  function paint(color, velocity = 100) {
    const normalizedVelocity = Math.min(1, Math.max(0.25, velocity / 127));
    if (fireworkMode) {
      targetColor = hexToRgb('#000000');
      targetIntensity = 0.9;
      spawnFirework(color, normalizedVelocity);
      return;
    }

    targetColor = hexToRgb(color);
    targetIntensity = normalizedVelocity;
    applyTransitionAnimation({ ...targetColor }, normalizedVelocity);
  }

  function triggerSwirlAnimation(noteA, noteB) {
    const colorA = hexToRgb(colorForNote(noteA.note));
    const colorB = hexToRgb(colorForNote(noteB.note));
    const intensity = Math.min(1, Math.max(0.35, (noteA.velocity + noteB.velocity) / (2 * 127)));

    activeSwirls.push({
      colors: [colorA, colorB],
      intensity,
      start: performance.now(),
      duration: 1200,
      spin: 1.5 + Math.random() * 1.8
    });

    if (activeSwirls.length > 6) {
      activeSwirls.shift();
    }
  }

  function pruneRecentNotes() {
    const now = performance.now();
    recentNotes = recentNotes.filter((entry) => now - entry.time < SIMULTANEOUS_WINDOW_MS);
    if (!recentNotes.length) {
      lastSwirlAt = 0;
    }
  }

  function registerSimultaneousHit(note, velocity) {
    pruneRecentNotes();
    const now = performance.now();
    const entry = { note, velocity, time: now };
    recentNotes.push(entry);

    if (now - lastSwirlAt < SIMULTANEOUS_WINDOW_MS) {
      return;
    }

    const partner = [...recentNotes]
      .filter((n) => n !== entry && n.note !== note && (now - n.time) < SIMULTANEOUS_WINDOW_MS)
      .pop();
    if (partner) {
      lastSwirlAt = now;
      triggerSwirlAnimation(entry, partner);
    }
  }

  function activateKey(note) {
    const key = pianoKeys.get(note);
    if (key) {
      key.classList.add('active');
    }
  }

  function deactivateKey(note) {
    const key = pianoKeys.get(note);
    if (key) {
      key.classList.remove('active');
    }
  }

  function handleNoteOn(note, velocity = 100) {
    pruneRecentNotes();

    const color = colorForNote(note);
    paint(color, velocity);
    registerSimultaneousHit(note, velocity);
    const label = describeNote(note) + ' · velocity ' + velocity;
    if (notePill) {
      notePill.textContent = label;
      notePill.style.background = 'rgba(255,255,255,0.08)';
    }
    if (info) {
      info.textContent = 'Painting ' + label;
    }
    activateKey(note);
  }

  function handleNoteOff(note) {
    pruneRecentNotes();
    recentNotes = recentNotes.filter((entry) => entry.note !== note);
    if (!recentNotes.length) {
      lastSwirlAt = 0;
    }
    deactivateKey(note);
  }

  function createKey(note, isBlack) {
    const key = document.createElement('button');
    key.className = 'key ' + (isBlack ? 'black' : 'white');
    key.dataset.note = String(note);
    key.setAttribute('aria-label', describeNote(note));
    key.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (key.setPointerCapture) {
        key.setPointerCapture(event.pointerId);
      }
      const pointerKey = event.pointerId + ':' + note;
      if (activePianoPresses.has(pointerKey)) return;
      activePianoPresses.add(pointerKey);
      pointerNotes.set(event.pointerId, note);
      handleNoteOn(note, 110);
    });

    const endPress = (event) => {
      const storedNote = pointerNotes.get(event.pointerId);
      if (storedNote === undefined) return;
      pointerNotes.delete(event.pointerId);
      const pointerKey = event.pointerId + ':' + storedNote;
      activePianoPresses.delete(pointerKey);
      handleNoteOff(storedNote);
    };

    key.addEventListener('pointerup', endPress);
    key.addEventListener('pointercancel', endPress);
    key.addEventListener('pointerleave', endPress);

    return key;
  }

  function buildOnscreenKeyboard() {
    if (!piano || !whiteKeysEl || !blackKeysEl) return;

    whiteKeysEl.innerHTML = '';
    blackKeysEl.innerHTML = '';
    pianoKeys.clear();

    let whiteCount = 0;
    const blackDefs = [];

    for (let note = PIANO_RANGE_START; note <= PIANO_RANGE_END; note++) {
      const name = NOTE_NAMES[note % 12];
      const isBlack = name.includes('#');

      if (isBlack) {
        blackDefs.push({ note, position: whiteCount - 0.5 });
      } else {
        const key = createKey(note, false);
        whiteKeysEl.appendChild(key);
        pianoKeys.set(note, key);
        whiteCount += 1;
      }
    }

    const totalWhites = whiteCount;
    blackDefs.forEach(({ note, position }) => {
      const key = createKey(note, true);
      key.style.left = (position / totalWhites * 100) + '%';
      key.style.transform = 'translateX(-50%)';
      blackKeysEl.appendChild(key);
      pianoKeys.set(note, key);
    });
  }

  function loadTransitionSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem('transitionSettings') || '{}');
      return {
        decayMs: clampTransitionDecay(stored.decayMs ?? DEFAULT_TRANSITION_SETTINGS.decayMs, DEFAULT_TRANSITION_SETTINGS.decayMs),
        effect: stored.effect === 'swirl' ? 'swirl' : DEFAULT_TRANSITION_SETTINGS.effect
      };
    } catch (err) {
      return { ...DEFAULT_TRANSITION_SETTINGS };
    }
  }

  function persistTransitionSettings() {
    localStorage.setItem('transitionSettings', JSON.stringify(transitionSettings));
  }

  function syncTransitionControls() {
    if (!transitionDecayInput || !transitionEffectSelect || !transitionDecayLabel) return;
    transitionDecayInput.value = String(transitionSettings.decayMs);
    transitionDecayLabel.textContent = transitionSettings.decayMs + ' ms';
    transitionEffectSelect.value = transitionSettings.effect;
  }

  function initTransitionControls() {
    syncTransitionControls();

    if (transitionDecayInput) {
      transitionDecayInput.addEventListener('input', (event) => {
        transitionSettings = {
          ...transitionSettings,
          decayMs: clampTransitionDecay(event.target.value, DEFAULT_TRANSITION_SETTINGS.decayMs)
        };
        syncTransitionControls();
        persistTransitionSettings();
      });
    }

    if (transitionEffectSelect) {
      transitionEffectSelect.addEventListener('change', (event) => {
        transitionSettings = {
          ...transitionSettings,
          effect: event.target.value === 'swirl' ? 'swirl' : 'ripple'
        };
        syncTransitionControls();
        persistTransitionSettings();
      });
    }
  }

  return {
    resize,
    setUIVisibility,
    setFireworkMode,
    setPianoVisibility,
    buildOnscreenKeyboard,
    startAnimationLoop,
    initTransitionControls,
    paint,
    handleNoteOn,
    handleNoteOff
  };
}
