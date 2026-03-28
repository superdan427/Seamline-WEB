/**
 * Shared opening hours utilities.
 *
 * parseOpeningHours — splits a raw opening hours string into [{day, time}] rows.
 *   Identical to the original parser in app/place/[id]/page.js, moved here so
 *   list, search and modal can share it without duplication.
 *
 * getOpenStatus — returns 'open' | 'closed' | null.
 *   null means "no parseable hours data — don't show any indicator".
 */

export function parseOpeningHours(raw) {
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const rows = [];
  lines.forEach((line, index) => {
    const parts = line.split(/\t+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      rows.push({ day: parts[0], time: parts.slice(1).join(' ') });
      return;
    }
    if (index + 1 < lines.length && !/\d/.test(line)) {
      const next = lines[index + 1]?.trim();
      if (next && /\d/.test(next)) {
        rows.push({ day: line, time: next });
        lines[index + 1] = '';
        return;
      }
    }
    rows.push({ day: line, time: '' });
  });
  return rows;
}

export function getOpenStatus(openingHours) {
  if (!openingHours) return null;
  const rows = parseOpeningHours(openingHours);
  if (!rows.length) return null;

  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = dayNames[now.getDay()].slice(0, 3); // 'mon', 'tue', …

  const todayRow = rows.find(({ day }) =>
    day?.toLowerCase().trim().startsWith(todayKey)
  );
  if (!todayRow || !todayRow.time) return null;

  const timeStr = todayRow.time.trim().toLowerCase();

  // Explicit closed
  if (/^clos(ed|e)?$/.test(timeStr) || timeStr === 'n/a') return 'closed';
  // Always open
  if (timeStr.includes('24 hour') || timeStr === '24/7') return 'open';

  // Match a time range: "9am-5pm", "09:00-17:00", "9 AM - 5 PM", "9:00am – 6:00pm"
  const match = timeStr.match(
    /(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i
  );
  if (!match) return null;

  function parseTimeMins(s) {
    s = s.trim().toLowerCase();
    const isPm = s.includes('pm');
    const isAm = s.includes('am');
    s = s.replace(/[apm\s]/g, '');
    const [h, m = '0'] = s.split(':');
    let hours = parseInt(h, 10);
    const mins = parseInt(m, 10);
    if (isNaN(hours) || isNaN(mins)) return NaN;
    if (isPm && hours < 12) hours += 12;
    if (isAm && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  const openMins = parseTimeMins(match[1]);
  const closeMins = parseTimeMins(match[2]);
  const nowMins = now.getHours() * 60 + now.getMinutes();

  if (isNaN(openMins) || isNaN(closeMins)) return null;
  return nowMins >= openMins && nowMins < closeMins ? 'open' : 'closed';
}
