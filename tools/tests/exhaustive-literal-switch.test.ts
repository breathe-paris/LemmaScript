import { test } from "node:test";
import assert from "node:assert/strict";
import { dafnyOf, provesAndBites, run } from "./support/verify-source.ts";

// A switch over an inline literal-union field with a case per member is
// exhaustive in TypeScript. The field widened to `string`, so Dafny refused
// the match (`missing case`). The field now keeps its members, and the last
// case also takes the strings no well-typed caller can pass.
const source = `
interface Move { readonly kind: "arrived" | "moved" | "read" }
export function weight(m: Move): number {
  //@ verify
  //@ ensures m.kind === "arrived" ==> \\result === 1
  //@ ensures m.kind === "read" ==> \\result === 3
  switch (m.kind) {
    case "arrived": return 1;
    case "moved": return 2;
    case "read": return 3;
  }
}
export function label(kind: "a" | "b"): number {
  //@ verify
  //@ ensures kind === "a" ==> \\result === 10
  let out = 0;
  switch (kind) {
    case "a": out = 10; break;
    case "b": out = 20; break;
  }
  return out;
}`;

test("the switches agree with JavaScript", () => {
  assert.equal(run(source, "weight", { kind: "moved" }), 2);
  assert.equal(run(source, "label", "b"), 20);
});

test("an exhaustive literal switch closes its match, and the contracts are proved", () => {
  assert.match(dafnyOf(source), /case _ =>/);
  provesAndBites(source, s => s.replace('m.kind === "read" ==> \\result === 3', 'm.kind === "read" ==> \\result === 2'));
});

test("a switch that misses a member stays non-exhaustive", () => {
  const partial = source.replace('    case "read": return 3;\n', "").replace(/\n  \/\/@ ensures m.kind === "read".*/, "")
    .replace("export function weight(m: Move): number {", "export function weight(m: Move): number | undefined {");
  assert.doesNotMatch(dafnyOf(partial).split("method label")[0], /case _ =>/);
});
