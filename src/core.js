/**
 * ISO 8601 week date arithmetic without converting to ordinal (gregorian) dates.
 *
 * Representation: an object { isoYear, week, day } where
 *   - isoYear is the ISO week-numbering year (signed integer),
 *   - week   is the ISO week number 1..53 (depending on the year),
 *   - day    is the ISO day of week 1..7 (Monday=1 ... Sunday=7).
 *
 * A week date is considered valid if day is in 1..7 and week is in 1..weeksInIsoYear(isoYear).
 *
 * Why a flat object rather than a class: the arithmetic functions are pure transforms
 * over three small integers; a class would add ceremony without protecting anything,
 * since every field is already constrained by the validator.
 */

/**
 * Return 1 if the (proleptic Gregorian) year is a leap year, else 0.
 *
 * Reimplemented rather than reaching for Date so the arithmetic is fully self-contained
 * and has no dependence on the runtime's local time or Date semantics.
 *
 * @param {number} year
 * @returns {number}
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 1 : 0;
}

/**
 * Day-of-year numbers for Jan 1 and Dec 31 expressed as ISO weekday (Mon=1..Sun=7).
 *
 * ISO 8601 week years are anchored by the rule: week 1 is the week containing the first
 * Thursday of the (Gregorian) year, equivalently the week containing Jan 4. That single
 * rule determines everything below. Deriving the leap-week count from the Jan 1 / Dec 31
 * pair is the standard closed-form: a year has 53 weeks iff Jan 1 is Thursday, or (for
 * leap years) Dec 31 is Thursday.
 *
 * @param {number} year
 * @returns {{jan1: number, dec31: number}}
 */
function yearBoundaryWeekdays(year) {
  // Use a known reference: 2001-01-01 was a Monday (ISO day 1).
  // Count days from 2001-01-01 to Jan 1 of `year`, then mod 7.
  const refYear = 2001;
  let days = 0;
  if (year >= refYear) {
    for (let y = refYear; y < year; y++) {
      days += 365 + isLeapYear(y);
    }
  } else {
    for (let y = year; y < refYear; y++) {
      days -= 365 + isLeapYear(y);
    }
  }
  // days mod 7, handling negatives.
  const jan1 = (((days % 7) + 7) % 7) + 1;
  // Dec 31 is Jan 1 shifted by (yearLength - 1) days, mod 7.
  const dec31 = (((jan1 - 1 + 365 + isLeapYear(year) - 1) % 7) + 7) % 7 + 1;
  return { jan1, dec31 };
}

/**
 * Number of ISO weeks (52 or 53) in a given ISO week-numbering year.
 *
 * @param {number} isoYear
 * @returns {number}
 */
export function weeksInIsoYear(isoYear) {
  const { jan1, dec31 } = yearBoundaryWeekdays(isoYear);
  // 53-week year iff the year starts on Thursday, or (leap year) ends on Thursday.
  return jan1 === 4 || (isLeapYear(isoYear) === 1 && dec31 === 4) ? 53 : 52;
}

/**
 * Throw if {isoYear, week, day} is not a valid ISO week date.
 *
 * Errors are thrown rather than returning Option types: an invalid week date is a
 * programmer bug, and bugs should fail loudly at the boundary.
 *
 * @param {{isoYear: number, week: number, day: number}} date
 * @returns {{isoYear: number, week: number, day: number}}
 */
export function assertValid(date) {
  if (
    !date ||
    typeof date !== "object" ||
    !Number.isInteger(date.isoYear) ||
    !Number.isInteger(date.week) ||
    !Number.isInteger(date.day) ||
    date.day < 1 ||
    date.day > 7 ||
    date.week < 1 ||
    date.week > weeksInIsoYear(date.isoYear)
  ) {
    throw new RangeError(
      `Invalid ISO week date: { isoYear: ${date?.isoYear}, week: ${date?.week}, day: ${date?.day} }`,
    );
  }
  return date;
}

/**
 * Normalize an (isoYear, week, day) triple into a single canonical week date.
 *
 * Rolls week and day into the year boundaries, so e.g. week 0 of year Y is week 53 (or 52)
 * of Y-1, and week 54 of Y is week 1 (or 2) of Y+1. This is the central routine: every
 * add/subtract ultimately reduces to producing a (possibly out-of-range) triple and then
 * calling this to resettle it into the correct ISO year.
 *
 * @param {{isoYear: number, week: number, day: number}} date
 * @returns {{isoYear: number, week: number, day: number}}
 */
export function normalize(date) {
  let { isoYear, week, day } = date;

  // Days first: carry into the week number.
  while (day > 7) {
    day -= 7;
    week += 1;
  }
  while (day < 1) {
    day += 7;
    week -= 1;
  }

  // Weeks next: carry into the ISO year.
  // A loop rather than division/modulo keeps the logic obviously correct against the
  // variable 52/53 boundary; in practice it runs at most a handful of iterations.
  while (week > weeksInIsoYear(isoYear)) {
    week -= weeksInIsoYear(isoYear);
    isoYear += 1;
  }
  while (week < 1) {
    isoYear -= 1;
    week += weeksInIsoYear(isoYear);
  }

  return { isoYear, week, day };
}

/**
 * Add an integer number of weeks to a week date, returning a new valid week date.
 *
 * The day-of-week is preserved; only the (isoYear, week) pair moves. Working directly in
 * weeks is precisely what week dates exist for, so this never needs to touch ordinals.
 *
 * @param {{isoYear: number, week: number, day: number}} date
 * @param {number} weeks (may be negative)
 * @returns {{isoYear: number, week: number, day: number}}
 */
export function addWeeks(date, weeks) {
  assertValid(date);
  if (!Number.isInteger(weeks)) {
    throw new TypeError(`weeks must be an integer, got ${weeks}`);
  }
  return normalize({
    isoYear: date.isoYear,
    week: date.week + weeks,
    day: date.day,
  });
}

/**
 * Add an integer number of days to a week date, returning a new valid week date.
 *
 * Days stay inside the week arithmetic: we carry day overflow into the week number and
 * let normalize() push it across ISO-year boundaries. The week-of-day is not preserved in
 * general (as you'd expect when adding days), but the (isoYear, week) pair is always the
 * ISO week containing the resulting date.
 *
 * @param {{isoYear: number, week: number, day: number}} date
 * @param {number} days (may be negative)
 * @returns {{isoYear: number, week: number, day: number}}
 */
export function addDays(date, days) {
  assertValid(date);
  if (!Number.isInteger(days)) {
    throw new TypeError(`days must be an integer, got ${days}`);
  }
  return normalize({
    isoYear: date.isoYear,
    week: date.week,
    day: date.day + days,
  });
}

/**
 * Subtract an integer number of weeks from a week date.
 *
 * Thin wrapper over addWeeks(date, -weeks). Kept as a named export because subtraction
 * reads more clearly at call sites than negation does.
 *
 * @param {{isoYear: number, week: number, day: number}} date
 * @param {number} weeks
 * @returns {{isoYear: number, week: number, day: number}}
 */
export function subWeeks(date, weeks) {
  return addWeeks(date, -weeks);
}

/**
 * Subtract an integer number of days from a week date.
 *
 * @param {{isoYear: number, week: number, day: number}} date
 * @param {number} days
 * @returns {{isoYear: number, week: number, day: number}}
 */
export function subDays(date, days) {
  return addDays(date, -days);
}
