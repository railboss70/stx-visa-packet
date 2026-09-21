import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStatementText } from "./parse-statement.ts";

const HEADER = `Statement Closing Date: August 4, 2026
xxxx-xxxx-xxxx-5935
MATTHEW PITSENBARGER
Previous Balance $1,234.56
New Balance $2,345.67
Credit Line $15,000.00
`;

test("strips trailing state after an Amazon-style order number", () => {
  const parsed = parseStatementText(
    `${HEADER}07/15 07/16 AMZN.COM/BILL WA 112-1234567-8901234 $45.67\n`,
  );
  assert.equal(parsed.charges.length, 1);
  assert.equal(parsed.charges[0].vendor, "Amzn.com/bill");
  assert.equal(parsed.charges[0].orderNo, "112-1234567-8901234");
  assert.equal(parsed.charges[0].amount, 45.67);
});

test("still reads charges that have no order number", () => {
  const parsed = parseStatementText(`${HEADER}07/18 07/19 DOLLAR GENERAL #18234 AL $12.34\n`);
  assert.equal(parsed.charges.length, 1);
  assert.equal(parsed.charges[0].vendor, "Dollar General #18234");
  assert.equal(parsed.charges[0].orderNo, "");
});

test("still pulls a long reference sitting between vendor and state", () => {
  const parsed = parseStatementText(`${HEADER}07/20 07/21 SHELL OIL 12345678901 GA $88.10\n`);
  assert.equal(parsed.charges.length, 1);
  assert.equal(parsed.charges[0].vendor, "Shell Oil");
  assert.equal(parsed.charges[0].orderNo, "12345678901");
});

test("reads a parenthesized credit instead of dropping the line", () => {
  const parsed = parseStatementText(
    `${HEADER}07/22 07/23 HOME DEPOT #1034 GA ($45.00)\n`,
  );
  assert.equal(parsed.charges.length, 1);
  assert.equal(parsed.charges[0].vendor, "Home Depot #1034");
  assert.equal(parsed.charges[0].amount, -45);
});

test("pulls a phone-style NNN-NNN-NNNN reference out of the vendor", () => {
  const parsed = parseStatementText(
    `${HEADER}07/24 07/25 TRACTOR SUPPLY #221 AL 256-555-1212 $19.99\n`,
  );
  assert.equal(parsed.charges.length, 1);
  assert.equal(parsed.charges[0].vendor, "Tractor Supply #221");
  assert.equal(parsed.charges[0].orderNo, "256-555-1212");
  assert.equal(parsed.charges[0].amount, 19.99);
});

test("reads comma amounts and ignores decoy dollar totals in the header", () => {
  const parsed = parseStatementText(
    `${HEADER}07/26 07/27 LOWES #0182 AL $1,234.56\n`,
  );
  assert.equal(parsed.charges.length, 1);
  assert.equal(parsed.charges[0].vendor, "Lowes #0182");
  assert.equal(parsed.charges[0].amount, 1234.56);
});

const FAKE_AUG_2026 = `SYNOVUS BANK
Account Number XXXX-XXXX-XXXX-5935
MATTHEW PITSENBARGER **N0002211
STX CORP
Previous Balance $612.40
Statement Closing Date August 28, 2026             Credits $45.00
Credit Line $10,000.00                             Purchases and Debits $2,145.87
New Balance $2,713.27
08/01
08/02
SHELL OIL 57443219 FAIRBURN GA
$45.12
08/03
08/04
AMAZON MKTPL*A1B2C3D4E AMZN.COM/BILL WA
111-1234567-1234567
$128.55
*************** MEMO ITEM ***************
08/05
08/06
LOWE'S #1234 PEACHTREE CITY GA
$89.99
08/06
08/07
TRACTOR SUPPLY #402 GRIFFIN GA
$34.10
08/06
08/07
MURPHY USA 1234 GRIFFIN GA
$28.75
08/10
08/11
AMAZON.COM REFUND AMZN.COM/BILL WA
($45.00)
08/12
08/13
O'REILLY AUTO PARTS #789 NEWNAN GA
$22.19
08/14
08/15
HOME DEPOT #4477 LOCUST GROVE GA
$316.44
08/18
08/19
UNITED RENTALS #4521 ATLANTA GA
$1,245.67
*************** MEMO ITEM ***************
08/22
08/23
RACETRAC 0501 MCDONOUGH GA
$61.02
08/24
08/25
CIRCLE K 09876 STOCKBRIDGE GA
$18.44
08/27
08/28
GRAINGER 855-123-4567 LAKE CITY GA
855-123-4567
$149.70
Total Purchases and Debits ....................... $2,145.87
Total Credits ..................................... $45.00
`;

test("fake Aug 2026 statement keeps all 12 charges and skips decoy totals", () => {
  const parsed = parseStatementText(FAKE_AUG_2026);
  assert.equal(parsed.last4, "5935");
  assert.equal(parsed.closingDate, "2026-08-28");
  assert.equal(parsed.charges.length, 12);

  const byAmount = Object.fromEntries(parsed.charges.map((c) => [c.amount.toFixed(2), c]));
  assert.equal(byAmount["45.12"]?.vendor.includes("Shell Oil"), true);
  assert.equal(byAmount["128.55"]?.orderNo, "111-1234567-1234567");
  assert.equal(byAmount["-45.00"]?.amount, -45);
  assert.equal(byAmount["1245.67"]?.vendor.includes("United Rentals"), true);
  assert.equal(byAmount["149.70"]?.orderNo, "855-123-4567");
  assert.equal(parsed.charges.filter((c) => c.transDate === "2026-08-06").length, 2);
  assert.ok(parsed.charges.some((c) => c.vendor.includes("Lowe's")));
  assert.ok(parsed.charges.some((c) => /o'reilly/i.test(c.vendor)));
});
