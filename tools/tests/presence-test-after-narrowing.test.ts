import { test } from "node:test";
import assert from "node:assert/strict";
import { dafnyOf, provesAndBites, run } from "./support/verify-source.ts";

// `x !== null && x !== undefined`: once the first test has narrowed `x`, the
// second compares a present value with undefined. It used to emit a string
// compared with `None` (`arguments must have comparable types`); a value the
// type says is present is never null or undefined, so the test is constant.
const source = `
export function size(x: string | null | undefined): number {
  //@ verify
  //@ ensures x !== null && x !== undefined ==> \\result === x.length
  //@ ensures (x === null || x === undefined) ==> \\result === -1
  return x !== null && x !== undefined ? x.length : -1;
}`;

test("both presence tests agree with JavaScript", () => {
  assert.equal(run(source, "size", "ab"), 2);
  assert.equal(run(source, "size", null), -1);
  assert.equal(run(source, "size", undefined), -1);
});

test("the redundant presence test folds, and the contract is proved", () => {
  assert.doesNotMatch(dafnyOf(source), /!= None/);
  provesAndBites(source, s => s.replace("\\result === -1", "\\result === 0"));
});
