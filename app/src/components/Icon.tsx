import type { CSSProperties } from 'react';

interface IconProps {
  name: string;
  size?: number;
  fill?: 0 | 1;
  color?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 24, fill = 0, color, style }: IconProps) {
  return (
    <span
      className="ms"
      style={{
        fontFamily: "'Material Symbols Rounded'",
        fontSize: size,
        lineHeight: 1,
        fontVariationSettings: `'FILL' ${fill}`,
        color,
        ...style,
      }}
    >
      {name}
    </span>
  );
}

interface AvatarProps {
  hue: number;
  initials: string;
  size: number;
  radius?: string;
  fontSize?: number;
  style?: CSSProperties;
}

export function Avatar({ hue, initials, size, radius = '50%', fontSize, style }: AvatarProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        borderRadius: radius,
        display: 'grid',
        placeItems: 'center',
        fontWeight: 600,
        fontSize: fontSize ?? Math.round(size * 0.32),
        color: `oklch(0.16 0.03 ${hue})`,
        background: `oklch(0.78 0.10 ${hue})`,
        ...style,
      }}
    >
      {initials}
    </span>
  );
}

/** The striped placeholder used everywhere a real photo or video would sit. */
export const stripes = (hue: number, light = 0.30, dark = 0.25, step = 11): string =>
  `repeating-linear-gradient(135deg, oklch(${light} 0.03 ${hue}) 0 ${step}px, oklch(${dark} 0.02 ${hue}) ${step}px ${step * 2}px)`;
