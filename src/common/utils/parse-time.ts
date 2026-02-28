/**
 * Parses Jira-like time string to decimal hours.
 * Supports: "1d 2h 30m", "3h", "45m", "2d", "1d 4h"
 * 1d = 8h (working day)
 */
export function parseTimeString(timeStr: string): number {
  const trimmed = timeStr.trim().toLowerCase();

  // Try plain number (backward compat)
  const asNumber = parseFloat(trimmed);
  if (!isNaN(asNumber) && trimmed === String(asNumber)) {
    return asNumber;
  }

  const regex =
    /(?:(\d+(?:\.\d+)?)\s*d)?\s*(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+(?:\.\d+)?)\s*m)?/i;
  const match = trimmed.match(regex);

  if (!match || (!match[1] && !match[2] && !match[3])) {
    throw new Error('Invalid time format');
  }

  const days = parseFloat(match[1] || '0');
  const hours = parseFloat(match[2] || '0');
  const minutes = parseFloat(match[3] || '0');

  const totalHours = days * 8 + hours + minutes / 60;

  if (totalHours <= 0) {
    throw new Error('Time must be greater than 0');
  }

  return Math.round(totalHours * 100) / 100;
}
