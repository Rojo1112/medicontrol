/**
 * Date & time utility helpers
 */

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Helper: Safely parses date input into local midnight/noon Date object.
 * Prevents JavaScript's default UTC parsing of "YYYY-MM-DD" from shifting
 * the date back by 1 day in western/negative UTC timezones (e.g. UTC-5).
 */
export function parseLocalDate(dateInput) {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return new Date(dateInput.getTime());

  if (typeof dateInput === 'string') {
    const cleanStr = dateInput.trim().split('T')[0];
    const match = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      const d = parseInt(match[3], 10);
      return new Date(y, m, d, 12, 0, 0); // 12:00 PM local time avoids DST and UTC shifts
    }
    const dObj = new Date(dateInput);
    if (!isNaN(dObj.getTime())) return dObj;
  }

  return new Date();
}

export function getDayName(index, full = false) {
  return full ? DAY_NAMES_FULL[index] : DAY_NAMES[index];
}

export function getMonthName(index) {
  return MONTH_NAMES[index];
}

export function formatDate(date) {
  const d = parseLocalDate(date);
  return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(date) {
  const d = parseLocalDate(date);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].substring(0, 3)}`;
}

export function formatDateISO(date) {
  const d = parseLocalDate(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export function formatTime24(time24) {
  if (!time24) return '';
  return time24.substring(0, 5);
}

export function getToday() {
  return formatDateISO(new Date());
}

export function getDayOfWeek(dateStr) {
  const d = parseLocalDate(dateStr);
  return d.getDay();
}

export function addDays(dateStr, days) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

export function isToday(dateStr) {
  return dateStr === getToday();
}

export function isPast(timeStr) {
  const now = new Date();
  const [h, m] = timeStr.split(':');
  const timeDate = new Date();
  timeDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  return now > timeDate;
}

export { DAY_NAMES, DAY_NAMES_FULL, MONTH_NAMES };

