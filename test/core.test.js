import { test } from "node:test";
import * as assert from "node:assert/strict";

import {
  addDays,
  addWeeks,
  assertValid,
  isLeapYear,
  normalize,
  subDays,
  subWeeks,
  weeksInIsoYear,
} from "../src/core.js";

/**
 * Construct a week date; the constructor lives only in tests so that test fixtures are
 * checked at the test boundary rather than at the production call sites.
 */
function W(isoYear, week, day) {
  return assertValid({ isoYear, week, day });
}

test("isLeapYear matches the Gregorian rule", () => {
  assert.equal(isLeapYear(2000), 1);
  assert.equal(isLeapYear(1900), 0);
  assert.equal(isLeapYear(1996), 1);
  assert.equal(isLeapYear(1997), 0);
  assert.equal(isLeapYear(2100), 0);
});

test("weeksInIsoYear gives 53 for the canonical long years", () => {
  // 2015 starts on Thursday -> 53 weeks.
  assert.equal(weeksInIsoYear(2015), 53);
  // 2020 is a leap year ending on Thursday -> 53 weeks.
  assert.equal(weeksInIsoYear(2020), 53);
  // 2014 and 2021 are the boring 52-week cases.
  assert.equal(weeksInIsoYear(2014), 52);
  assert.equal(weeksInIsoYear(2021), 52);
});

test("assertValid rejects out-of-range weeks and days", () => {
  assert.throws(() => assertValid({ isoYear: 2020, week: 54, day: 1 }), RangeError);
  assert.throws(() => assertValid({ isoYear: 2020, week: 0, day: 1 }), RangeError);
  assert.throws(() => assertValid({ isoYear: 2020, week: 1, day: 0 }), RangeError);
  assert.throws(() => assertValid({ isoYear: 2020, week: 1, day: 8 }), RangeError);
  assert.throws(() => assertValid({ isoYear: 2020, week: 1, day: 1.5 }), RangeError);
  // Week 53 is valid in 2015 but not in 2014.
  assert.doesNotThrow(() => assertValid({ isoYear: 2015, week: 53, day: 7 }));
  assert.throws(() => assertValid({ isoYear: 2014, week: 53, day: 7 }), RangeError);
});

test("addWeeks preserves the day-of-week and rolls the week", () => {
  // 2020-W01-3 (Wed) + 10 weeks -> 2020-W11-3.
  assert.deepEqual(addWeeks(W(2020, 1, 3), 10), { isoYear: 2020, week: 11, day: 3 });
});

test("addWeeks crosses the ISO year boundary forward", () => {
  // 2020-W53-5 + 2 weeks -> 2021-W02-5. 2020 has 53 weeks.
  assert.deepEqual(addWeeks(W(2020, 53, 5), 2), { isoYear: 2021, week: 2, day: 5 });
});

test("addWeeks crosses the ISO year boundary backward", () => {
  // 2021-W01-1 - 2 weeks -> 2020-W52-1. 2020 has 53 weeks, so week 1 of 2021 minus 2 is
  // week 52 of 2020 (not week 53).
  assert.deepEqual(addWeeks(W(2021, 1, 1), -2), { isoYear: 2020, week: 52, day: 1 });
});

test("subWeeks mirrors addWeeks with negated argument", () => {
  const base = W(2018, 10, 4);
  assert.deepEqual(subWeeks(base, 3), addWeeks(base, -3));
});

test("addDays carries day overflow into the week", () => {
  // 2020-W01-7 (Sun) + 1 day -> 2020-W02-1 (Mon).
  assert.deepEqual(addDays(W(2020, 1, 7), 1), { isoYear: 2020, week: 2, day: 1 });
});

test("addDays carries day underflow into the previous week", () => {
  // 2020-W01-1 (Mon) - 1 day -> 2019-W52-7 (Sun). 2019 has 52 weeks.
  assert.deepEqual(addDays(W(2020, 1, 1), -1), { isoYear: 2019, week: 52, day: 7 });
});

test("addDays spanning a full ISO year lands in the right week", () => {
  // 2015-W53-7 + 8 days crosses W53 -> W01 of 2016 -> W02. Each week is 7 days, so
  // 7 days takes us to 2016-W01-7 and one more day to 2016-W02-1.
  assert.deepEqual(addDays(W(2015, 53, 7), 8), { isoYear: 2016, week: 2, day: 1 });
});

test("subDays mirrors addDays with negated argument", () => {
  const base = W(2017, 5, 2);
  assert.deepEqual(subDays(base, 4), addDays(base, -4));
});

test("normalize handles multi-year week overflow", () => {
  // 2015-W52-1 + (53+52+1) weeks should reach 2018-W01-1. Using normalize directly:
  // 52 + 106 = 158 weeks; 2015 has 53 weeks, 2016 has 52, 2017 has 52.
  // 158 - 53 = 105; 105 - 52 = 53; 53 - 52 = 1 -> 2018-W01-1.
  assert.deepEqual(normalize({ isoYear: 2015, week: 158, day: 1 }), {
    isoYear: 2018,
    week: 1,
    day: 1,
  });
});

test("normalize handles multi-year week underflow", () => {
  // Symmetric to the above: 2018-W01-1 minus 106 weeks -> 2015-W52-1.
  assert.deepEqual(normalize({ isoYear: 2018, week: -105, day: 1 }), {
    isoYear: 2015,
    week: 52,
    day: 1,
  });
});

test("addWeeks with zero is the identity", () => {
  const base = W(2019, 23, 5);
  assert.deepEqual(addWeeks(base, 0), base);
});

test("addDays with zero is the identity", () => {
  const base = W(2019, 23, 5);
  assert.deepEqual(addDays(base, 0), base);
});

test("addWeeks rejects non-integer inputs", () => {
  assert.throws(() => addWeeks(W(2020, 1, 1), 1.5), TypeError);
});

test("addDays rejects non-integer inputs", () => {
  assert.throws(() => addDays(W(2020, 1, 1), 0.5), TypeError);
});

test("adding a full leap week (53 weeks) in a 53-week year", () => {
  // 2015 is a 53-week year. W01-4 + 53 weeks should give W01-4 of 2016 (since 2015 has 53
  // weeks, the next ISO year starts 53 weeks later, plus one carries us 1 week into 2016).
  // That is: 1 + 53 = 54; 54 - 53 = 1 -> 2016-W01-4.
  assert.deepEqual(addWeeks(W(2015, 1, 4), 53), { isoYear: 2016, week: 1, day: 4 });
});
