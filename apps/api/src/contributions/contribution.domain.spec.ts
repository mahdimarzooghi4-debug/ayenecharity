import assert from "node:assert/strict";
import test from "node:test";

import {
  InvalidRialAmountError,
  normalizeIranianMobile,
  normalizeLocalizedDigits,
  normalizeRialAmountInput,
  parsePositiveRialAmount,
} from "./contribution.domain";

test("localized Persian and Arabic digits normalize to ASCII digits", () => {
  assert.equal(normalizeLocalizedDigits("۱۲۳٤٥"), "12345");
});

test("Iranian mobile numbers normalize from local and international formats", () => {
  assert.equal(normalizeIranianMobile("0912 345 6789"), "09123456789");
  assert.equal(normalizeIranianMobile("+98 912 345 6789"), "09123456789");
  assert.equal(normalizeIranianMobile("0098-912-345-6789"), "09123456789");
});

test("rial amount input removes localized separators without changing the unit", () => {
  assert.equal(normalizeRialAmountInput("۱٬۲۵۰٬۰۰۰"), "1250000");
  assert.equal(parsePositiveRialAmount("1,250,000"), 1_250_000n);
});

test("rial amount must be positive and fit PostgreSQL bigint", () => {
  assert.throws(() => parsePositiveRialAmount("0"), InvalidRialAmountError);
  assert.throws(
    () => parsePositiveRialAmount("9223372036854775808"),
    InvalidRialAmountError,
  );
});
