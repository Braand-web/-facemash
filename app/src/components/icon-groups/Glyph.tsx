import type { CSSProperties } from 'react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

export interface IconProps {
  name: string;
  size?: number;
  fill?: 0 | 1;
  color?: string;
  style?: CSSProperties;
}

export function Glyph({ Glyph: Component, size = 24, fill = 0, color, style }: IconProps & { Glyph: PhosphorIcon }) {
  return (
    <Component
      aria-hidden="true"
      focusable="false"
      size={size}
      weight={fill ? 'fill' : 'regular'}
      color={color}
      style={{ flex: '0 0 auto', ...style }}
    />
  );
}
