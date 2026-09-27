/** A calm hue-tinted fill for demo media that has no uploaded asset yet. */
const shotbaseSwatches = ['blue', 'amber', 'lime', 'lavender', 'red', 'white'] as const;

export const mediaTone = (hue: number): string => {
  const swatch = shotbaseSwatches[Math.abs(Math.round(hue / 60)) % shotbaseSwatches.length];
  return `color-mix(in oklab, var(--media-surface) 88%, var(--tone-${swatch}) 12%)`;
};
