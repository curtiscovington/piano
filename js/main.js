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
const fireworkToggle = document.getElementById('firework-toggle');
const pianoToggle = document.getElementById('piano-toggle');
const rainbowGameButtons = Array.from(document.querySelectorAll('[data-game="rainbow"]'));
const piano = document.getElementById('piano');
const whiteKeysEl = document.getElementById('white-keys');
const blackKeysEl = document.getElementById('black-keys');
const midiStatus = document.getElementById('midi-status');
const mainMenu = document.getElementById('main-menu');
let midiInstrumentConnected = false;

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

function setUIToggleAvailability(isMiniGameActive) {
  if (uiToggle) {
    uiToggle.hidden = !isMiniGameActive;
  }
}

function updateOnscreenPianoInvite() {
  const pianoHidden = piano ? piano.hidden : true;
  const shouldInvite = !midiInstrumentConnected && pianoHidden;
  visuals.setPianoInvite(shouldInvite);
}

function bindUI() {
  if (uiToggle) {
    uiToggle.addEventListener('click', () => {
      const shouldShowUI = document.body.classList.contains('ui-hidden');
      visuals.setUIVisibility(shouldShowUI);
    });
  }

  if (fireworkToggle) {
    fireworkToggle.addEventListener('click', () => {
      visuals.setFireworkMode(!fireworkToggle.matches('[aria-pressed="true"]'));
    });
  }

  if (pianoToggle) {
    pianoToggle.addEventListener('click', () => {
      visuals.setPianoVisibility(piano.hidden);
      updateOnscreenPianoInvite();
    });
  }

  rainbowGameButtons.forEach((button) => {
    button.addEventListener('click', () => launchRainbowGame(button));
  });

  window.addEventListener('resize', visuals.resize);
}

function launchRainbowGame(sourceButton) {
  document.body.classList.remove('mode-main-menu');
  document.body.classList.add('game-zooming');
  setUIToggleAvailability(true);
  if (sourceButton) {
    sourceButton.classList.add('zooming');
  }
  visuals.setPianoVisibility(false);
  updateOnscreenPianoInvite();
  visuals.setUIVisibility(true);
  if (modePill) {
    modePill.textContent = 'Rainbow piano active';
  }
  if (info) {
    info.textContent = 'Zoomed into the rainbow piano intervention.';
  }
  setTimeout(() => {
    document.body.classList.remove('game-zooming');
    if (sourceButton) {
      sourceButton.classList.remove('zooming');
    }
  }, 750);
}

function returnToMainMenu() {
  document.body.classList.add('mode-main-menu');
  document.body.classList.remove('game-zooming');
  setUIToggleAvailability(false);
  visuals.setUIVisibility(false);
  visuals.setPianoVisibility(false);
  visuals.setPianoInvite(false);
  if (modePill) {
    modePill.textContent = 'Velocity reactive';
  }
  if (notePill) {
    notePill.textContent = 'Waiting for activation';
  }
  if (info) {
    info.textContent = 'Back at the main menu. Launch a mini-game to begin.';
  }
  if (mainMenu) {
    mainMenu.focus();
  }
}

function handleMidiDevicesChanged({ connected }) {
  midiInstrumentConnected = connected;
  if (connected) {
    visuals.setPianoVisibility(false);
  }
  updateOnscreenPianoInvite();
}

function init() {
  bindUI();
  visuals.buildOnscreenKeyboard();
  visuals.setPianoVisibility(false);
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
  setupMIDI({
    midiStatus,
    info,
    handleNoteOn: visuals.handleNoteOn,
    handleNoteOff: visuals.handleNoteOff,
    onDevicesChanged: handleMidiDevicesChanged
  });
  setupInstallPrompt({ installButton, installHint });
  showIOSTips({ iosTip });
  registerServiceWorker({ offlineTip });
  returnToMainMenu();
}

init();
