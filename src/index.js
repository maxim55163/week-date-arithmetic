/**
 * Public surface of week-date-arithmetic.
 *
 * Re-exports the core routines. Everything operates on plain { isoYear, week, day }
 * objects; there is no class to construct.
 */
export {
  assertValid,
  addDays,
  addWeeks,
  isLeapYear,
  normalize,
  subDays,
  subWeeks,
  weeksInIsoYear,
} from "./core.js";
