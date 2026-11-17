import { test } from "node:test";
import assert from "node:assert/strict";
import { provesAndBites, run } from "./support/verify-source.ts";

// `xs[0] ?? null` is null on an empty array: the result stays optional. It
// was typed as the element, so the bounds conditional kept `None` in its else
// arm and the whole was wrapped once more (`Some(if … then xs[0] else None)`).
const source = `
export function first(xs: number[]): number | null {
  //@ verify
  //@ ensures xs.length === 0 ==> \\result === null
  //@ ensures xs.length > 0 ==> \\result === xs[0]
  return xs[0] ?? null;
}`;

test("`xs[0] ?? null` agrees with JavaScript", () => {
  assert.equal(run(source, "first", []), null);
  assert.equal(run(source, "first", [4, 5]), 4);
});

test("`xs[0] ?? null` is optional, and the contract is proved", () => {
  provesAndBites(source, s => s.replace("\\result === xs[0]", "\\result === xs[1]"));
});
