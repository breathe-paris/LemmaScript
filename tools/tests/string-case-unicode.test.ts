import { test } from "node:test";
import assert from "node:assert/strict";
import { dafnyOf, verifyDafny, run } from "./support/verify-source.ts";

// JavaScript case mapping is Unicode: it maps non-ASCII letters and can change
// length. The model used to be the ASCII mapping on every string, which proved
// claims JavaScript refutes. It now holds only on ASCII-only strings.
const lengthClaim = `
export function upper(s: string): string {
  //@ verify
  //@ ensures \\result.length === s.length
  return s.toUpperCase();
}`;

const asciiClaim = `
export function upper(s: string): string {
  //@ verify
  //@ requires s === "a"
  //@ ensures \\result === "A"
  return s.toUpperCase();
}`;

test("JavaScript refutes the length claim", () => {
  assert.equal((run(lengthClaim, "upper", "ß") as string).length, 2);
  assert.equal(run(lengthClaim, "upper", "é"), "É");
});

test("the length claim no longer verifies", () => {
  const result = verifyDafny(dafnyOf(lengthClaim));
  assert.notEqual(result.status, 0, result.output);
});

test("the ASCII mapping still proves ASCII facts", () => {
  const result = verifyDafny(dafnyOf(asciiClaim));
  assert.equal(result.status, 0, result.output);
  const wrong = verifyDafny(dafnyOf(asciiClaim.replace('\\result === "A"', '\\result === "B"')));
  assert.notEqual(wrong.status, 0, wrong.output);
});
