import { createVisuals } from './visuals.js';
import { initPaletteControls, colorForNote, describeNote } from './palettes.js';
import { setupMIDI } from './midi.js';
import { setupInstallPrompt, showIOSTips, registerServiceWorker } from './pwa.js';

const canvas = document.getElementById('viz');
const notePill = document.getElementById('note-pill');
const modePill = document.getElementById('mode-pill');
const info = document.getElementById('info');
const installButton = document.getElementById('install-button');
const installHint = document.getElementById('install-hint');
const iosTip = document.getElementById('ios-tip');
const offlineTip = document.getElementById('offline-tip');
const paletteSelect = document.getElementById('palette-select');
const paletteGrid = document.getElementById('palette-grid');
const paletteNameInput = document.getElementById('palette-name');
const savePaletteButton = document.getElementById('save-palette');
const updatePaletteButton = document.getElementById('update-palette');
const paletteMessage = document.getElementById('palette-message');
const transitionDecayInput = document.getElementById('transition-decay');
const transitionDecayLabel = document.getElementById('transition-decay-label');
const transitionEffectSelect = document.getElementById('transition-effect');
const uiToggle = document.getElementById('ui-toggle');
const rainbowToggle = document.getElementById('rainbow-toggle');
const fireworkToggle = document.getElementById('firework-toggle');
const pianoToggle = document.getElementById('piano-toggle');
const piano = document.getElementById('piano');
const whiteKeysEl = document.getElementById('white-keys');
const blackKeysEl = document.getElementById('black-keys');
const midiStatus = document.getElementById('midi-status');

const visuals = createVisuals({
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
});

let rainbowActive = false;

function setRainbowActive(active) {
  rainbowActive = active;
  document.body.classList.toggle('rainbow-active', active);
  if (!active) {
    document.body.classList.remove('rainbow-hover');
    visuals.setFireworkMode(false);
    visuals.setPianoVisibility(false);
    if (modePill) {
      modePill.textContent = 'Rainbow paused';
    }
    if (info) {
      info.textContent = 'Rainbow controls hidden. Toggle back on to explore.';
    }
  } else {
    document.body.classList.remove('rainbow-hover');
    visuals.setPianoVisibility(true);
    if (modePill) {
      modePill.textContent = 'Rainbow piano active';
    }
  }
  if (rainbowToggle) {
    rainbowToggle.setAttribute('aria-pressed', String(active));
    rainbowToggle.textContent = active ? '🌈 Rainbow piano on' : '🌈 Rainbow piano off';
    rainbowToggle.setAttribute('aria-label', active ? 'Disable rainbow piano HUD' : 'Enable rainbow piano HUD');
  }
}

function handleRainbowHovering(hovering) {
  if (rainbowActive) return;
  document.body.classList.toggle('rainbow-hover', hovering);
}

function bindUI() {
  if (uiToggle) {
    uiToggle.addEventListener('click', () => {
      const shouldShowUI = document.body.classList.contains('ui-hidden');
      visuals.setUIVisibility(shouldShowUI);
    });
  }

  if (rainbowToggle) {
    rainbowToggle.addEventListener('click', () => {
      setRainbowActive(!rainbowActive);
    });
    rainbowToggle.addEventListener('mouseenter', () => handleRainbowHovering(true));
    rainbowToggle.addEventListener('mouseleave', () => handleRainbowHovering(false));
    rainbowToggle.addEventListener('focus', () => handleRainbowHovering(true));
    rainbowToggle.addEventListener('blur', () => handleRainbowHovering(false));
  }

  if (fireworkToggle) {
    fireworkToggle.addEventListener('click', () => {
      visuals.setFireworkMode(!fireworkToggle.matches('[aria-pressed="true"]'));
    });
  }

  if (pianoToggle) {
    pianoToggle.addEventListener('click', () => {
      visuals.setPianoVisibility(piano.hidden);
    });
  }

  window.addEventListener('resize', visuals.resize);
}

function init() {
  bindUI();
  visuals.buildOnscreenKeyboard();
  setRainbowActive(false);
  visuals.setUIVisibility(false);
  visuals.resize();
  visuals.initTransitionControls();
  initPaletteControls({
    paletteSelect,
    paletteGrid,
    paletteNameInput,
    savePaletteButton,
    updatePaletteButton,
    paletteMessage
  });
  visuals.paint('#0b1021', 40);
  visuals.startAnimationLoop();
  setupMIDI({ midiStatus, info, handleNoteOn: visuals.handleNoteOn, handleNoteOff: visuals.handleNoteOff });
  setupInstallPrompt({ installButton, installHint });
  showIOSTips({ iosTip });
  registerServiceWorker({ offlineTip });
}

init();
