/* =====================================================================
   calc.js  -  all billing maths lives here (no DOM, easy to test).
   Every money value is an INTEGER NUMBER OF PAISE to avoid floating-point
   errors (e.g. 1.1 * 12000 = 13200.000000000002 in JS).
   ===================================================================== */

const GST_HALF_RATE = 1.5; // % each for CGST and SGST (total 3%)

/* One line item.
   amount = rate x weight
   making = making% of amount   (making% is typed by the owner per item)
   total  = amount + making                                              */
function calcItem(weight, rate, makingPct) {
  const amount = Math.round(rate * weight * 100);
  const making = Math.round((amount * makingPct) / 100);
  return { amount, making, total: amount + making };
}

/* Whole bill.
   taxable = sum(item totals)           (amount + making charges)
   CGST    = 1.5% of taxable,  SGST = 1.5% of taxable
   gross   = taxable + CGST + SGST
   grand   = gross rounded to nearest rupee, roundOff = grand - gross
   remaining = grand - received                                          */
function calcBill(items, receivedRupees) {
  let amount = 0, making = 0;
  for (const it of items) { amount += it.amount; making += it.making; }

  const taxable = amount + making;
  const cgst = Math.round((taxable * GST_HALF_RATE) / 100);
  const sgst = Math.round((taxable * GST_HALF_RATE) / 100);
  const gross = taxable + cgst + sgst;
  const grand = Math.round(gross / 100) * 100;
  const roundOff = grand - gross;
  const received = Math.round((receivedRupees || 0) * 100);
  const remaining = grand - received; // negative => customer paid extra

  return { amount, making, taxable, cgst, sgst, gross, roundOff, grand, received, remaining };
}

/* paise -> "12,345.60" (Indian grouping) */
function fmt(paise) {
  return (paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

/* paise -> "+0.42" / "-0.42" */
function fmtSigned(paise) {
  return (paise < 0 ? "-" : "+") + fmt(Math.abs(paise));
}

/* Rupees (integer) -> words, Indian system. 15024 -> "Fifteen Thousand Twenty Four" */
function numberToWords(n) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function below1000(x) {
    const out = [];
    if (x >= 100) { out.push(ones[Math.floor(x / 100)], "Hundred"); x %= 100; }
    if (x >= 20) { out.push(tens[Math.floor(x / 10)]); x %= 10; }
    if (x > 0) out.push(ones[x]);
    return out;
  }

  n = Math.floor(Math.abs(n));
  if (n === 0) return "Zero";

  const parts = [];
  const units = [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"]];
  for (const [size, name] of units) {
    if (n >= size) {
      parts.push(...numberToWords(Math.floor(n / size)).split(" "), name);
      n %= size;
    }
  }
  parts.push(...below1000(n));
  return parts.join(" ");
}

if (typeof module !== "undefined") module.exports = { calcItem, calcBill, fmt, fmtSigned, numberToWords };
