/**
 * Predefined color palette for medications
 */

export const MED_COLORS = [
  { name: 'Coral',    hex: '#f97066' },
  { name: 'Ámbar',    hex: '#f59e0b' },
  { name: 'Lima',     hex: '#84cc16' },
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Teal',     hex: '#14b8a6' },
  { name: 'Cyan',     hex: '#06b6d4' },
  { name: 'Cielo',    hex: '#38bdf8' },
  { name: 'Índigo',   hex: '#6366f1' },
  { name: 'Violeta',  hex: '#8b5cf6' },
  { name: 'Púrpura',  hex: '#a855f7' },
  { name: 'Rosa',     hex: '#ec4899' },
  { name: 'Naranja',  hex: '#f97316' },
];

export function getColorName(hex) {
  const color = MED_COLORS.find(c => c.hex === hex);
  return color ? color.name : 'Personalizado';
}

export function getDefaultColor() {
  return MED_COLORS[8].hex; // Violeta
}
