export function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized.padEnd(6, '0');
  const int = parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

export function rgbToHex({ r, g, b }) {
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function rgbaString({ r, g, b }, alpha = 1) {
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpColor(a, b, t) {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t))
  };
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function shadePalette(baseColors, factor) {
  return baseColors.map((hex) => {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex({
      r: r * factor,
      g: g * factor,
      b: b * factor
    });
  });
}

export function clampTransitionDecay(value, defaultValue) {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : defaultValue;
  return Math.min(2200, Math.max(400, safe));
}
