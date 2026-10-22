export function sidebarUsageSummary(data) {
  const windows = data?.limits?.find(group => group.id === 'codex')?.windows || [];
  const window = minutes => windows.find(value => value.windowDurationMins === minutes);
  const remaining = minutes => {
    const value = window(minutes)?.remainingPercent;
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
  };
  const percent = value => value === null ? '—' : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  const reset = minutes => {
    const seconds = window(minutes)?.resetsAt;
    if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '—';
    const date = new Date(seconds * 1000);
    return Number.isFinite(date.getTime()) ? date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '—';
  };
  const fiveHourValue = remaining(300), weeklyValue = remaining(10080);
  const date = data?.updatedAt ? new Date(data.updatedAt) : null;
  return {
    fiveHour: percent(fiveHourValue), weekly: percent(weeklyValue), fiveHourValue, weeklyValue,
    fiveHourReset: reset(300), weeklyReset: reset(10080),
    updated: date && Number.isFinite(date.getTime()) ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }) : '—',
  };
}
