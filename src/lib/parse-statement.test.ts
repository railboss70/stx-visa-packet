import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStatementText } from "./parse-statement.ts";

const HEADER = `Statement Closing Date: August 4, 2026
xxxx-xxxx-xxxx-5935
MATTHEW PITSENBARGER
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
