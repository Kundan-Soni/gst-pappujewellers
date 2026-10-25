const assert = require("assert");
const { calcItem, calcBill, fmt, fmtSigned, numberToWords } = require("./calc.js");

// ---- the exact example from the requirement ----
const it = calcItem(1.1, 12000, 10.5);
assert.strictEqual(it.amount, 1320000);   // 13200.00
assert.strictEqual(it.making, 138600);    // 1386.00
assert.strictEqual(it.total, 1458600);    // 14586.00
const b = calcBill([it], 10000);
assert.strictEqual(fmt(b.taxable), "14,586.00");
assert.strictEqual(fmt(b.cgst), "218.79");
assert.strictEqual(fmt(b.sgst), "218.79");
assert.strictEqual(fmtSigned(b.roundOff), "+0.42");
assert.strictEqual(fmt(b.grand), "15,024.00");
assert.strictEqual(fmt(b.remaining), "5,024.00");

// ---- extra cases ----
assert.strictEqual(calcItem(1.1, 12000, 0).making, 0);                 // no making charge
assert.strictEqual(calcBill([it], 20000).remaining, -497600);          // overpaid -> negative
assert.strictEqual(calcBill([], 0).grand, 0);                          // empty bill
const two = calcBill([calcItem(2.5, 7000, 8), calcItem(0.35, 95000, 12.25)], 0);
assert.strictEqual(two.grand % 100, 0);                                // always whole rupees
assert.ok(Math.abs(two.roundOff) <= 50);                               // round-off <= 50 paise

// ---- number to words ----
assert.strictEqual(numberToWords(15024), "Fifteen Thousand Twenty Four");
assert.strictEqual(numberToWords(100000), "One Lakh");
assert.strictEqual(numberToWords(1234567), "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven");
assert.strictEqual(numberToWords(0), "Zero");
assert.strictEqual(numberToWords(20000000), "Two Crore");
console.log("All tests passed");
