import type { FreshnessStatus } from '../types';

export interface FreshnessInfo {
  status: FreshnessStatus;
  badgeLabel: string;
  badgeColor: string; // Tailwind class
  bannerText?: string;
  minutesAgo: number;
}

export function getFreshnessInfo(lastUpdatedIso: string): FreshnessInfo {
  if (!lastUpdatedIso) {
    return {
      status: 'UNKNOWN',
      badgeLabel: 'Unreported',
      badgeColor: 'bg-slate-100 text-slate-600 border-slate-300',
      bannerText: 'Availability has not yet been reported by hospital administration.',
      minutesAgo: 9999
    };
  }

  const now = new Date().getTime();
  const updateTime = new Date(lastUpdatedIso).getTime();
  const diffMinutes = Math.max(0, Math.floor((now - updateTime) / (1000 * 60)));

  if (diffMinutes < 30) {
    return {
      status: 'LIVE',
      badgeLabel: diffMinutes === 0 ? 'Verified Live (Just now)' : `Verified Live (${diffMinutes}m ago)`,
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      minutesAgo: diffMinutes
    };
  } else if (diffMinutes <= 120) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m ago` : `${mins}m ago`;
    return {
      status: 'RECENT',
      badgeLabel: `Reported (${timeStr})`,
      badgeColor: 'bg-sky-50 text-sky-800 border-sky-300',
      minutesAgo: diffMinutes
    };
  } else {
    const hours = Math.floor(diffMinutes / 60);
    return {
      status: 'STALE',
      badgeLabel: `Stale (${hours}h+ overdue)`,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
      bannerText: 'Availability data is older than 2 hours. Call hospital emergency desk to confirm live bed status.',
      minutesAgo: diffMinutes
    };
  }
}
