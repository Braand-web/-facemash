import {
  ArchiveIcon, BellRingingIcon, DeviceMobileIcon, FlagIcon, LinkSimpleIcon,
  LockOpenIcon, MegaphoneIcon, ProhibitIcon, ShieldCheckIcon, SignOutIcon, UserCheckIcon,
  UserIcon, UserMinusIcon, UserPlusIcon, WarningCircleIcon, GlobeIcon, PencilSimpleIcon,
  PencilSimpleLineIcon, ExportIcon, PushPinIcon, PushPinSlashIcon,
} from '@phosphor-icons/react';
import { Glyph, type IconProps } from './Glyph';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

const icons: Record<string, PhosphorIcon> = {
  archive: ArchiveIcon,
  block: ProhibitIcon,
  campaign: MegaphoneIcon,
  flag: FlagIcon,
  device_mobile: DeviceMobileIcon,
  install_mobile: DeviceMobileIcon,
  language: GlobeIcon,
  link: LinkSimpleIcon,
  lock_open: LockOpenIcon,
  logout: SignOutIcon,
  person: UserIcon,
  person_add: UserPlusIcon,
  person_alert: BellRingingIcon,
  person_remove: UserMinusIcon,
  person_check: UserCheckIcon,
  shield_person: ShieldCheckIcon,
  notifications_active: BellRingingIcon,
  edit: PencilSimpleIcon,
  edit_square: PencilSimpleLineIcon,
  error: WarningCircleIcon,
  keep: PushPinIcon,
  keep_off: PushPinSlashIcon,
  ios_share: ExportIcon,
};

export default function AccountIcon(props: IconProps) {
  const GlyphComponent = icons[props.name];
  return GlyphComponent ? <Glyph Glyph={GlyphComponent} {...props} /> : null;
}
