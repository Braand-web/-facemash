import { lazy, Suspense, type ComponentType, type CSSProperties } from 'react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import {
  ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, ArrowUpRightIcon,
  BellIcon, BookmarkIcon, BookmarkSimpleIcon, CaretRightIcon, ChatCircleIcon,
  CheckIcon, CheckCircleIcon, CircleNotchIcon, CopyIcon, DotsThreeIcon, HeartIcon,
  HouseIcon, ImageIcon, LightningIcon, LockKeyIcon, MagnifyingGlassIcon, MapPinIcon,
  PaperPlaneTiltIcon, PlayIcon, PlusIcon, PlusCircleIcon, QuestionIcon, RepeatIcon,
  GearIcon, SpeakerHighIcon, SpeakerSlashIcon, XIcon,
} from '@phosphor-icons/react';
import { Glyph, type IconProps } from './icon-groups/Glyph';

const MessagingIcons = lazy(() => import('./icon-groups/Messaging'));
const MediaIcons = lazy(() => import('./icon-groups/Media'));
const AccountIcons = lazy(() => import('./icon-groups/Account'));
const UtilityIcons = lazy(() => import('./icon-groups/Utility'));

const coreIcons: Record<string, PhosphorIcon> = {
  add: PlusIcon,
  add_circle: PlusCircleIcon,
  arrow_back: ArrowLeftIcon,
  arrow_downward: ArrowDownIcon,
  arrow_forward: ArrowRightIcon,
  arrow_outward: ArrowUpRightIcon,
  arrow_upward: ArrowUpIcon,
  bolt: LightningIcon,
  bookmark: BookmarkIcon,
  bookmark_border: BookmarkSimpleIcon,
  chat_bubble: ChatCircleIcon,
  chat_bubble_outline: ChatCircleIcon,
  chat: ChatCircleIcon,
  check: CheckIcon,
  check_circle: CheckCircleIcon,
  chevron_right: CaretRightIcon,
  close: XIcon,
  content_copy: CopyIcon,
  favorite: HeartIcon,
  home: HouseIcon,
  image: ImageIcon,
  location_on: MapPinIcon,
  lock: LockKeyIcon,
  more_horiz: DotsThreeIcon,
  notifications: BellIcon,
  play_arrow: PlayIcon,
  progress_activity: CircleNotchIcon,
  repeat: RepeatIcon,
  search: MagnifyingGlassIcon,
  send: PaperPlaneTiltIcon,
  settings: GearIcon,
  volume_up: SpeakerHighIcon,
  volume_off: SpeakerSlashIcon,
};

const accountNames = new Set([
  'archive', 'block', 'campaign', 'device_mobile', 'error', 'flag', 'install_mobile',
  'ios_share', 'keep', 'keep_off', 'language', 'link', 'lock_open', 'logout', 'person',
  'person_add', 'person_alert', 'person_check', 'person_remove', 'notifications_active',
  'shield_person',
]);
const mediaNames = new Set(['add_photo_alternate', 'camera_alt', 'graphic_eq', 'movie', 'music', 'notes', 'photo_camera', 'play_circle']);
const messagingNames = new Set([
  'alternate_email', 'attach_file', 'call', 'call_end', 'chat_unread', 'description', 'done_all', 'download',
  'forward', 'forum', 'group', 'group_add', 'keyboard_arrow_down', 'keyboard_arrow_up',
  'mail', 'mic', 'mic_off', 'mode_comment', 'mood', 'more_vert', 'notifications_off', 'reply',
  'timer', 'videocam', 'videocam_off',
]);

const accountIconNames = new Set([...accountNames, 'ios_share']);
const mediaIconNames = new Set([...mediaNames]);
const messagingIconNames = new Set([...messagingNames]);
const lazyIcons: Record<string, ComponentType<IconProps>> = {};
for (const name of accountIconNames) lazyIcons[name] = AccountIcons;
for (const name of mediaIconNames) lazyIcons[name] = MediaIcons;
for (const name of messagingIconNames) lazyIcons[name] = MessagingIcons;
for (const name of [
  'arrow_back_ios', 'arrow_forward_ios', 'autorenew', 'chevron_left', 'dark_mode', 'explore',
  'delete', 'history', 'inbox', 'info', 'keyboard', 'keyboard_cmd', 'light_mode', 'local_fire', 'grid', 'applause',
  'palette', 'pause', 'pin', 'pin_off', 'public', 'radio_button_checked', 'radio_button_unchecked',
  'search_off', 'share_network', 'schedule', 'sparkle', 'tag', 'tune', 'text_format', 'unarchive',
  'visibility', 'visibility_off', 'vibrate',
]) lazyIcons[name] = UtilityIcons;

export function Icon({ name, size = 24, fill = 0, color, style }: IconProps) {
  const GlyphComponent = coreIcons[name];
  if (GlyphComponent) return <Glyph Glyph={GlyphComponent} name={name} size={size} fill={fill} color={color} style={style} />;

  const Group = lazyIcons[name];
  if (!Group) return <Glyph Glyph={QuestionIcon} name={name} size={size} fill={fill} color={color} style={style} />;

  return (
    <Suspense fallback={<span aria-hidden="true" style={{ width: size, height: size, flex: '0 0 auto', ...style } as CSSProperties} />}>
      <Group name={name} size={size} fill={fill} color={color} style={style} />
    </Suspense>
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

/** Generative avatar: a soft flat tint off the account's hue, initials on top. */
export function Avatar({ hue, initials, size, radius = '50%', fontSize, style }: AvatarProps) {
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: fontSize ?? Math.round(size * 0.36),
        background: `oklch(0.8 0.07 ${hue})`,
        color: `oklch(0.26 0.05 ${hue})`,
        textShadow: 'none',
        ...style,
      }}
    >
      {initials}
    </span>
  );
}
