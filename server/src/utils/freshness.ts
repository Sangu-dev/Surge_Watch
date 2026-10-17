export type FreshnessStatus = 'LIVE' | 'RECENT' | 'STALE' | 'UNKNOWN';

export interface FreshnessResult {
  status: FreshnessStatus;
  label: string;
  minutesAgo: number;
  isStaleWarning: boolean;
}

export function computeDataFreshness(lastUpdated: Date | string | null): FreshnessResult {
  if (!lastUpdated) {
    return {
      status: 'UNKNOWN',
      label: 'Unreported',
      minutesAgo: 999999,
      isStaleWarning: true,
    };
  }

  const now = Date.now();
  const updateTime = new Date(lastUpdated).getTime();
  const diffMinutes = Math.max(0, Math.floor((now - updateTime) / (1000 * 60)));

  if (diffMinutes < 30) {
    return {
      status: 'LIVE',
      label: diffMinutes === 0 ? 'Verified Live (Just now)' : `Verified Live (${diffMinutes}m ago)`,
      minutesAgo: diffMinutes,
      isStaleWarning: false,
    };
  } else if (diffMinutes <= 120) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m ago` : `${mins}m ago`;
    return {
      status: 'RECENT',
      label: `Reported (${timeStr})`,
      minutesAgo: diffMinutes,
      isStaleWarning: false,
    };
  } else {
    const hours = Math.floor(diffMinutes / 60);
    return {
      status: 'STALE',
      label: `Stale (${hours}h+ overdue)`,
      minutesAgo: diffMinutes,
      isStaleWarning: true,
    };
  }
}
