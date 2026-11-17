import { test } from "node:test";
import assert from "node:assert/strict";
import { provesAndBites, run } from "./support/verify-source.ts";

// `x !== undefined && a && b` parses as `(x !== undefined && a) && b`: the
// presence test must narrow the whole chain, `b` included. Narrowing the inner
// conjunction alone left `xs` optional in `xs[0]`.
const source = `
export function firstAbove(xs: number[] | undefined, t: number): boolean {
  //@ verify
  //@ ensures \\result ==> xs !== undefined && xs.length > 0 && xs[0] > t
  //@ ensures xs === undefined ==> !\\result
  return xs !== undefined && xs.length > 0 && xs[0] > t;
}`;

test("the chain agrees with JavaScript", () => {
  assert.equal(run(source, "firstAbove", undefined, 0), false);
  assert.equal(run(source, "firstAbove", [], 0), false);
  assert.equal(run(source, "firstAbove", [3], 2), true);
});

test("every conjunct reads the payload, and the contract is proved", () => {
  provesAndBites(source, s => s.replace("xs[0] > t\n", "xs[0] < t\n"));
});
