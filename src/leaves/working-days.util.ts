/**
 * Изчисляване на работни дни според българския Кодекс на труда:
 * - изключват се събота и неделя
 * - изключват се официалните празници (чл. 154 КТ), вкл. подвижните
 *   великденски дни (Велики петък, Велика събота, Великден, Светли понеделник)
 * - прилага се правилото за пренасяне: ако официален празник (различен от
 *   Великденските) съвпада със събота/неделя, първият следващ работен ден е неработен
 */

function toKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function utc(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day));
}

/**
 * Православен Великден (Meeus, Юлиански алгоритъм → Григориански).
 * Връща неделята на Великден.
 */
function orthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3 = март, 4 = април (юлиански)
  const day = ((d + e + 114) % 31) + 1;

  // Юлианска дата → Григорианска (за 1900–2099 разликата е 13 дни)
  const julian = utc(year, month, day);
  julian.setUTCDate(julian.getUTCDate() + 13);
  return julian;
}

/**
 * Множество от ISO ключове (YYYY-MM-DD) на официалните празници за дадена година.
 */
export function getBulgarianHolidays(year: number): Set<string> {
  const set = new Set<string>();

  // Фиксирани празници с правило за пренасяне при уикенд
  const fixed: Array<[number, number]> = [
    [1, 1], // Нова година
    [3, 3], // Освобождение
    [5, 1], // Ден на труда
    [5, 6], // Гергьовден / Ден на храбростта
    [5, 24], // Ден на образованието и културата
    [9, 6], // Съединение
    [9, 22], // Независимост
    [12, 24], // Бъдни вечер
    [12, 25], // Коледа
    [12, 26], // Коледа
  ];

  for (const [m, d] of fixed) {
    const date = utc(year, m, d);
    set.add(toKey(date));
    // Пренасяне: събота/неделя → следващ работен ден
    const dow = date.getUTCDay();
    if (dow === 6 || dow === 0) {
      const shift = new Date(date);
      do {
        shift.setUTCDate(shift.getUTCDate() + 1);
      } while (
        shift.getUTCDay() === 6 ||
        shift.getUTCDay() === 0 ||
        set.has(toKey(shift))
      );
      set.add(toKey(shift));
    }
  }

  // Подвижни великденски дни (без правило за пренасяне)
  const easter = orthodoxEaster(year);
  const goodFriday = new Date(easter);
  goodFriday.setUTCDate(easter.getUTCDate() - 2);
  const holySaturday = new Date(easter);
  holySaturday.setUTCDate(easter.getUTCDate() - 1);
  const easterMonday = new Date(easter);
  easterMonday.setUTCDate(easter.getUTCDate() + 1);
  for (const d of [goodFriday, holySaturday, easter, easterMonday]) {
    set.add(toKey(d));
  }

  return set;
}

const holidayCache = new Map<number, Set<string>>();
function holidaysFor(year: number): Set<string> {
  let h = holidayCache.get(year);
  if (!h) {
    h = getBulgarianHolidays(year);
    holidayCache.set(year, h);
  }
  return h;
}

/** Дали дадена дата е работен ден (не уикенд и не официален празник). */
export function isWorkingDay(date: Date): boolean {
  const dow = date.getUTCDay();
  if (dow === 6 || dow === 0) return false;
  return !holidaysFor(date.getUTCFullYear()).has(toKey(date));
}

export interface WorkingDaysResult {
  total: number;
  byYear: Record<number, number>;
}

/**
 * Брой работни дни в интервала [start, end] включително,
 * с разбивка по години (за коректно отчитане при преходни отпуски).
 */
export function computeWorkingDays(start: Date, end: Date): WorkingDaysResult {
  const byYear: Record<number, number> = {};
  let total = 0;

  const cur = utc(
    start.getUTCFullYear(),
    start.getUTCMonth() + 1,
    start.getUTCDate(),
  );
  const last = utc(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate());

  while (cur <= last) {
    if (isWorkingDay(cur)) {
      const y = cur.getUTCFullYear();
      byYear[y] = (byYear[y] || 0) + 1;
      total += 1;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return { total, byYear };
}
