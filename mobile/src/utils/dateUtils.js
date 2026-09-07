/**
 * Local Date & Time Utility Functions
 * Ensures all date calculations use the user's local timezone (preventing UTC rollover bugs).
 */

/**
 * Returns a date formatted as YYYY-MM-DD in the local timezone.
 */
export function getLocalDateStr(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current local time formatted as "8:42 PM" or "10:15 AM".
 */
export function getLocalTimeString(dateInput = new Date()) {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (e) {
    return '';
  }
}

/**
 * Formats an ISO datetime string or timestamp into "8:42 PM".
 */
export function formatLoggedTime(timeVal) {
  if (!timeVal) return '';
  // If already formatted like "8:42 PM", return it directly
  if (typeof timeVal === 'string' && (timeVal.includes('AM') || timeVal.includes('PM'))) {
    return timeVal;
  }
  const d = new Date(timeVal);
  if (isNaN(d.getTime())) return String(timeVal);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Checks if a given date string (YYYY-MM-DD) is in the future compared to local today.
 */
export function isFutureDate(dateStr) {
  const todayStr = getLocalDateStr();
  return dateStr > todayStr;
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string in local timezone.
 */
export function addDaysToDateStr(dateStr, days) {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  d.setDate(d.getDate() + days);
  return getLocalDateStr(d);
}
