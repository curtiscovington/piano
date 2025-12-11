import { NOTE_NAMES } from './constants.js';
import { shadePalette } from './utils.js';

export const defaultPalette = {
  id: 'default',
  name: 'Vivid spectrum',
  colors: [
    '#FF0000', // C / B#
    '#FF6600', // C# / Db
    '#FF8800', // D
    '#FFC400', // D# / Eb
    '#E1FF00', // E / Fb
    '#00FF00', // F / E#
    '#00DBC2', // F# / Gb
    '#00C8FA', // G
    '#0073FD', // G# / Ab
    '#001EFF', // A
    '#5E0FFF', // A# / Bb
    '#BB00FF'  // B / Cb
  ],
  locked: true
};

let colors = [...defaultPalette.colors];
let lowerOctaveColors = [];
let upperOctaveColors = [];
let palettes = [];
let activePaletteId = defaultPalette.id;
let colorInputs = [];

let paletteSelect;
let paletteGrid;
let paletteNameInput;
let savePaletteButton;
let updatePaletteButton;
let paletteMessage;

export function setPaletteColors(baseColors) {
  colors = [...baseColors];
  lowerOctaveColors = shadePalette(colors, 0.68);
  upperOctaveColors = shadePalette(colors, 1.22);
}

setPaletteColors(colors);

export function colorForNote(note) {
  const octave = Math.floor(note / 12) - 1;
  const index = note % colors.length;

  if (octave === 3 && lowerOctaveColors.length) {
    return lowerOctaveColors[index];
  }

  if (octave === 5 && upperOctaveColors.length) {
    return upperOctaveColors[index];
  }

  return colors[index];
}

export function describeNote(note) {
  const name = NOTE_NAMES[note % 12];
  const octave = Math.floor(note / 12) - 1;
  return name + octave;
}

function loadPalettesFromStorage() {
  try {
    const stored = JSON.parse(localStorage.getItem('palettes') || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((p) => Array.isArray(p.colors) && p.colors.length === 12 && p.id && p.name);
  } catch (err) {
    return [];
  }
}

function ensureDefaultPalette(list) {
  const filtered = list.filter((p) => p.id !== defaultPalette.id);
  return [defaultPalette, ...filtered];
}

function persistPalettes() {
  localStorage.setItem('palettes', JSON.stringify(palettes));
  localStorage.setItem('activePaletteId', activePaletteId);
}

function showPaletteStatus(message, isError = false) {
  if (!paletteMessage) return;
  paletteMessage.textContent = message;
  paletteMessage.style.color = isError ? '#ff9ba8' : 'var(--muted)';
}

function refreshColorInputs() {
  colorInputs.forEach((input) => {
    const idx = Number(input.dataset.index);
    input.value = colors[idx] || '#000000';
  });
}

function applyPaletteById(id) {
  const palette = palettes.find((p) => p.id === id) || defaultPalette;
  activePaletteId = palette.id;
  setPaletteColors(palette.colors);
  refreshColorInputs();
  persistPalettes();
  showPaletteStatus('Using "' + palette.name + '" palette.');
}

function syncPaletteSelect() {
  if (!paletteSelect) return;
  paletteSelect.innerHTML = '';
  palettes.forEach((p) => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name + (p.locked ? ' (built-in)' : '');
    paletteSelect.appendChild(option);
  });
  paletteSelect.value = activePaletteId;
}

function buildPaletteGrid() {
  if (!paletteGrid) return;
  paletteGrid.innerHTML = '';
  colorInputs = NOTE_NAMES.map((name, idx) => {
    const row = document.createElement('label');
    row.className = 'swatch-row';

    const label = document.createElement('span');
    label.className = 'note-label';
    label.textContent = name;

    const input = document.createElement('input');
    input.type = 'color';
    input.value = colors[idx];
    input.dataset.index = idx;
    input.addEventListener('input', (event) => {
      const updated = [...colors];
      updated[Number(event.target.dataset.index)] = event.target.value;
      setPaletteColors(updated);
    });

    row.appendChild(label);
    row.appendChild(input);
    paletteGrid.appendChild(row);
    return input;
  });
}

function saveCurrentAsPreset() {
  if (!paletteNameInput) return;
  const name = paletteNameInput.value.trim();
  if (!name) {
    showPaletteStatus('Name your palette to save it.', true);
    return;
  }

  const palette = {
    id: 'user-' + Date.now(),
    name,
    colors: [...colors]
  };

  palettes = ensureDefaultPalette([...palettes, palette]);
  activePaletteId = palette.id;
  persistPalettes();
  syncPaletteSelect();
  showPaletteStatus('Saved "' + name + '".');
  paletteNameInput.value = '';
}

function updateSelectedPreset() {
  const palette = palettes.find((p) => p.id === activePaletteId);
  if (!palette) return;
  if (palette.locked) {
    showPaletteStatus('Built-in palettes cannot be edited.', true);
    return;
  }

  palette.colors = [...colors];
  persistPalettes();
  showPaletteStatus('Updated "' + palette.name + '".');
}

export function initPaletteControls({
  paletteSelect: paletteSelectEl,
  paletteGrid: paletteGridEl,
  paletteNameInput: paletteNameInputEl,
  savePaletteButton: savePaletteButtonEl,
  updatePaletteButton: updatePaletteButtonEl,
  paletteMessage: paletteMessageEl
}) {
  paletteSelect = paletteSelectEl;
  paletteGrid = paletteGridEl;
  paletteNameInput = paletteNameInputEl;
  savePaletteButton = savePaletteButtonEl;
  updatePaletteButton = updatePaletteButtonEl;
  paletteMessage = paletteMessageEl;

  palettes = ensureDefaultPalette(loadPalettesFromStorage());
  const storedActive = localStorage.getItem('activePaletteId');
  const activeFromStorage = palettes.find((p) => p.id === storedActive);
  const paletteToUse = activeFromStorage || defaultPalette;
  activePaletteId = paletteToUse.id;
  setPaletteColors(paletteToUse.colors);

  buildPaletteGrid();
  syncPaletteSelect();
  showPaletteStatus('Using "' + paletteToUse.name + '" palette.');

  if (paletteSelect) {
    paletteSelect.addEventListener('change', (event) => {
      applyPaletteById(event.target.value);
    });
  }
  if (savePaletteButton) {
    savePaletteButton.addEventListener('click', saveCurrentAsPreset);
  }
  if (updatePaletteButton) {
    updatePaletteButton.addEventListener('click', updateSelectedPreset);
  }
}
