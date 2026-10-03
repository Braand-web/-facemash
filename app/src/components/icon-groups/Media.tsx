import {
  CameraIcon, FilmStripIcon, MusicNotesIcon, NotepadIcon, PlayCircleIcon, WaveformIcon,
} from '@phosphor-icons/react';
import { Glyph, type IconProps } from './Glyph';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

const icons: Record<string, PhosphorIcon> = {
  camera_alt: CameraIcon,
  photo_camera: CameraIcon,
  movie: FilmStripIcon,
  notes: NotepadIcon,
  music: MusicNotesIcon,
  play_circle: PlayCircleIcon,
  graphic_eq: WaveformIcon,
};

export default function MediaIcon(props: IconProps) {
  const GlyphComponent = icons[props.name];
  return GlyphComponent ? <Glyph Glyph={GlyphComponent} {...props} /> : null;
}
