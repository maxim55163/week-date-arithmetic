# week-date-arithmetic

Performs addition and subtraction directly on ISO 8601 week dates (an `{ isoYear, week, day }` triple), without converting to or from ordinal (gregorian) calendar dates.

```js
import { addWeeks, subDays, weeksInIsoYear } from "week-date-arithmetic";

// Add 10 weeks to Wednesday of ISO week 1, 2020.
const shifted = addWeeks({ isoYear: 2020, week: 1, day: 3 }, 10);
// -> { isoYear: 2020, week: 11, day: 3 }

// Step back 1 day from Monday of 2020-W01.
const prev = subDays({ isoYear: 2020, week: 1, day: 1 }, 1);
// -> { isoYear: 2019, week: 53, day: 7 }

weeksInIsoYear(2015); // 53 (a long ISO year)
weeksInIsoYear(2014); // 52
```

## Why

Tools that compute week dates by round-tripping through a gregorian Date pay for the conversion twice: once to translate in, once to translate out, and once more to paper over the locale and timezone sensitivity of the Date object. The translation is also where the off-by-one bugs live. This library does not own a Date; it carries weeks and days as integers and lets them carry across the ISO-year boundary explicitly.

The trade-off is scope: the library only does week arithmetic. It does not parse ISO 8601 strings, does not format them, and does not know about time. If you need those, call them in a layer above.

## Edge you will hit

The boundary between two ISO years is asymmetric: whether week 1 of year Y is preceded by week 52 or week 53 of year Y-1 depends on Y-1 alone. For example, week 1 of 2021 is preceded by week 52 of 2020 (not 53, though 2020 is itself a long year). The library handles this carry correctly; the tests pin it. Treat week 53 as valid only for years that actually have it: `assertValid` rejects `{ isoYear: 2014, week: 53, day: 7 }` while accepting the same triple for 2015.

## Exports

All functions are pure and return new objects; inputs are never mutated.

- `assertValid(date)` — throw a `RangeError` if `date` is not a valid `{ isoYear, week, day }`.
- `normalize(date)` — carry an out-of-range `{ isoYear, week, day }` (e.g. `{ isoYear: 2020, week: 158, day: 1 }`) into its canonical form.
- `addWeeks(date, weeks)` — return the week date `weeks` later; day-of-week preserved.
- `subWeeks(date, weeks)` — `addWeeks(date, -weeks)`.
- `addDays(date, days)` — return the week date `days` later; the day may change as weeks roll over.
- `subDays(date, days)` — `addDays(date, -days)`.
- `weeksInIsoYear(isoYear)` — `52` or `53`.
- `isLeapYear(year)` — `1` or `0` (gregorian, exposed because the 53-week rule depends on it).
