const workDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function recentDates(days) {
  const parts = Object.fromEntries(workDate.formatToParts(new Date()).map(part => [part.type, part.value]));
  const end = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  return Array.from({ length: days }, (_, index) =>
    new Date(end - (days - index - 1) * 86400000).toISOString().slice(0, 10)
  );
}

export const dateLabel = (date, options) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...options }).format(new Date(date + 'T00:00:00Z'));

export const statusLabel = (status = '') => status.toLowerCase().replace(/_/g, ' ')
  .replace(/^\w/, letter => letter.toUpperCase());
