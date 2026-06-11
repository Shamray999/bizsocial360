import type { Platform } from '@bizsocial360/shared';
import { PLATFORM_LABELS } from '@bizsocial360/shared';

const STYLES: Record<Platform, string> = {
  FACEBOOK: 'bg-blue-100 text-blue-700',
  INSTAGRAM: 'bg-pink-100 text-pink-700',
  TIKTOK: 'bg-slate-200 text-slate-700',
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[platform]}`}
    >
      {PLATFORM_LABELS[platform]}
    </span>
  );
}
