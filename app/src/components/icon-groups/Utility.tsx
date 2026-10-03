import {
  ArrowsClockwiseIcon, CaretLeftIcon, ClockCounterClockwiseIcon, ClockIcon, CommandIcon,
  FireIcon, GridFourIcon, HandsClappingIcon, HashIcon, KeyboardIcon, MagnifyingGlassMinusIcon,
  InfoIcon, PaletteIcon, PushPinIcon, PushPinSlashIcon, QuestionIcon, SlidersHorizontalIcon,
  SparkleIcon, TextAaIcon, TrashIcon, TrayIcon,
} from '@phosphor-icons/react';
import { Glyph, type IconProps } from './Glyph';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

const icons: Record<string, PhosphorIcon> = {
  delete: TrashIcon,
  autorenew: ArrowsClockwiseIcon,
  chevron_left: CaretLeftIcon,
  history: ClockCounterClockwiseIcon,
  schedule: ClockIcon,
  keyboard_cmd: CommandIcon,
  local_fire: FireIcon,
  grid: GridFourIcon,
  info: InfoIcon,
  applause: HandsClappingIcon,
  keyboard: KeyboardIcon,
  search_off: MagnifyingGlassMinusIcon,
  palette: PaletteIcon,
  pin: PushPinIcon,
  pin_off: PushPinSlashIcon,
  question: QuestionIcon,
  tune: SlidersHorizontalIcon,
  sparkle: SparkleIcon,
  text_format: TextAaIcon,
  unarchive: TrayIcon,
  tag: HashIcon,
};

export default function UtilityIcon(props: IconProps) {
  const GlyphComponent = icons[props.name];
  return GlyphComponent ? <Glyph Glyph={GlyphComponent} {...props} /> : null;
}
