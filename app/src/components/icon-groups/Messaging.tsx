import {
  AtIcon, ArrowBendUpLeftIcon, BellSlashIcon, ChatCircleDotsIcon, ChatsCircleIcon,
  ChecksIcon, DotsThreeVerticalIcon, EnvelopeSimpleIcon, FileTextIcon, MicrophoneIcon,
  MicrophoneSlashIcon, PhoneIcon, PhoneDisconnectIcon, SmileyIcon, TimerIcon,
  UserPlusIcon, UsersThreeIcon, VideoCameraIcon, VideoCameraSlashIcon, CaretDownIcon,
  CaretUpIcon, DownloadSimpleIcon, ArrowRightIcon, PaperclipIcon,
} from '@phosphor-icons/react';
import { Glyph, type IconProps } from './Glyph';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

const icons: Record<string, PhosphorIcon> = {
  alternate_email: AtIcon,
  attach_file: PaperclipIcon,
  reply: ArrowBendUpLeftIcon,
  notifications_off: BellSlashIcon,
  chat_unread: ChatCircleDotsIcon,
  mark_chat_unread: ChatCircleDotsIcon,
  forum: ChatsCircleIcon,
  done_all: ChecksIcon,
  more_vert: DotsThreeVerticalIcon,
  mail: EnvelopeSimpleIcon,
  description: FileTextIcon,
  mic: MicrophoneIcon,
  mic_off: MicrophoneSlashIcon,
  call: PhoneIcon,
  call_end: PhoneDisconnectIcon,
  mood: SmileyIcon,
  timer: TimerIcon,
  group_add: UserPlusIcon,
  group: UsersThreeIcon,
  videocam: VideoCameraIcon,
  videocam_off: VideoCameraSlashIcon,
  keyboard_arrow_down: CaretDownIcon,
  keyboard_arrow_up: CaretUpIcon,
  download: DownloadSimpleIcon,
  forward: ArrowRightIcon,
};

export default function MessagingIcon(props: IconProps) {
  const GlyphComponent = icons[props.name];
  return GlyphComponent ? <Glyph Glyph={GlyphComponent} {...props} /> : null;
}
