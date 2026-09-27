import type { CSSProperties } from 'react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import {
  ArchiveIcon,
  ArrowBendUpLeftIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BellIcon,
  BellRingingIcon,
  BellSlashIcon,
  BookmarkIcon,
  BookmarkSimpleIcon,
  CameraIcon,
  AtIcon,
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
  ChatCircleDotsIcon,
  ChatCircleIcon,
  ChatsCircleIcon,
  CheckIcon,
  CheckCircleIcon,
  ChecksIcon,
  CircleIcon,
  CircleNotchIcon,
  ClockIcon,
  CopyIcon,
  DeviceMobileIcon,
  DotsThreeIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  EnvelopeSimpleIcon,
  ExportIcon,
  PaperclipIcon,
  EyeIcon,
  FilmStripIcon,
  FileTextIcon,
  FlagIcon,
  GearIcon,
  GlobeIcon,
  HashIcon,
  HeartIcon,
  HouseIcon,
  ImageIcon,
  ImagesIcon,
  InfoIcon,
  LightningIcon,
  LinkSimpleIcon,
  LockKeyIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassMinusIcon,
  MapPinIcon,
  MegaphoneIcon,
  MicrophoneIcon,
  MicrophoneSlashIcon,
  MoonIcon,
  NotepadIcon,
  PaperPlaneTiltIcon,
  PauseIcon,
  PencilSimpleIcon,
  PencilSimpleLineIcon,
  PhoneDisconnectIcon,
  PhoneIcon,
  PlayIcon,
  PlusCircleIcon,
  PlusIcon,
  ProhibitIcon,
  PushPinIcon,
  PushPinSlashIcon,
  QuestionIcon,
  RepeatIcon,
  ShieldCheckIcon,
  SignOutIcon,
  SmileyIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  SunIcon,
  TimerIcon,
  TrashIcon,
  TrayIcon,
  TranslateIcon,
  UserIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersThreeIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react';

interface IconProps {
  name: string;
  size?: number;
  fill?: 0 | 1;
  color?: string;
  style?: CSSProperties;
}

const iconMap: Record<string, PhosphorIcon> = {
  add: PlusIcon,
  add_circle: PlusCircleIcon,
  add_photo_alternate: ImagesIcon,
  alternate_email: AtIcon,
  archive: ArchiveIcon,
  attach_file: PaperclipIcon,
  arrow_back: ArrowLeftIcon,
  arrow_downward: ArrowDownIcon,
  arrow_upward: ArrowUpIcon,
  block: ProhibitIcon,
  bolt: LightningIcon,
  bookmark: BookmarkIcon,
  bookmark_border: BookmarkSimpleIcon,
  call: PhoneIcon,
  call_end: PhoneDisconnectIcon,
  campaign: MegaphoneIcon,
  camera_alt: CameraIcon,
  check: CheckIcon,
  check_circle: CheckCircleIcon,
  chat_bubble: ChatCircleIcon,
  chat_bubble_outline: ChatCircleIcon,
  chat: ChatCircleIcon,
  chat_unread: ChatCircleDotsIcon,
  mark_chat_unread: ChatCircleDotsIcon,
  forum: ChatsCircleIcon,
  chevron_right: CaretRightIcon,
  keyboard_arrow_down: CaretDownIcon,
  keyboard_arrow_up: CaretUpIcon,
  close: XIcon,
  content_copy: CopyIcon,
  delete: TrashIcon,
  done_all: ChecksIcon,
  description: FileTextIcon,
  device_mobile: DeviceMobileIcon,
  download: DownloadSimpleIcon,
  edit: PencilSimpleIcon,
  edit_square: PencilSimpleLineIcon,
  error: WarningCircleIcon,
  favorite: HeartIcon,
  flag: FlagIcon,
  forward: ArrowRightIcon,
  group: UsersThreeIcon,
  group_add: UserPlusIcon,
  home: HouseIcon,
  image: ImageIcon,
  inbox: TrayIcon,
  info: InfoIcon,
  install_mobile: DeviceMobileIcon,
  ios_share: ExportIcon,
  keep: PushPinIcon,
  keep_off: PushPinSlashIcon,
  language: TranslateIcon,
  link: LinkSimpleIcon,
  location_on: MapPinIcon,
  lock: LockKeyIcon,
  lock_open: LockOpenIcon,
  logout: SignOutIcon,
  mail: EnvelopeSimpleIcon,
  mic: MicrophoneIcon,
  mic_off: MicrophoneSlashIcon,
  mode_comment: ChatCircleIcon,
  mood: SmileyIcon,
  more_horiz: DotsThreeIcon,
  more_vert: DotsThreeVerticalIcon,
  movie: FilmStripIcon,
  notes: NotepadIcon,
  notifications: BellIcon,
  notifications_active: BellRingingIcon,
  notifications_off: BellSlashIcon,
  person: UserIcon,
  person_add: UserPlusIcon,
  person_alert: BellRingingIcon,
  person_remove: UserMinusIcon,
  photo_camera: CameraIcon,
  play_arrow: PlayIcon,
  progress_activity: CircleNotchIcon,
  public: GlobeIcon,
  radio_button_checked: CheckCircleIcon,
  radio_button_unchecked: CircleIcon,
  repeat: RepeatIcon,
  reply: ArrowBendUpLeftIcon,
  search: MagnifyingGlassIcon,
  search_off: MagnifyingGlassMinusIcon,
  send: PaperPlaneTiltIcon,
  settings: GearIcon,
  shield_person: ShieldCheckIcon,
  tag: HashIcon,
  timer: TimerIcon,
  unarchive: TrayIcon,
  videocam: VideoCameraIcon,
  videocam_off: VideoCameraSlashIcon,
  visibility: EyeIcon,
  light_mode: SunIcon,
  dark_mode: MoonIcon,
  volume_up: SpeakerHighIcon,
  volume_off: SpeakerSlashIcon,
  pause: PauseIcon,
  arrow_back_ios: ArrowLeftIcon,
  arrow_forward: ArrowRightIcon,
  arrow_forward_ios: CaretRightIcon,
  pin: PushPinIcon,
  pin_off: PushPinSlashIcon,
  schedule: ClockIcon,
};

export function Icon({ name, size = 24, fill = 0, color, style }: IconProps) {
  const Glyph = iconMap[name] ?? QuestionIcon;
  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      size={size}
      weight={fill ? 'fill' : 'regular'}
      color={color}
      style={{ flex: '0 0 auto', ...style }}
    />
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
      className="avatar"
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
