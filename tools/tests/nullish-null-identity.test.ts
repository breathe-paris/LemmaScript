import { test } from "node:test";
import assert from "node:assert/strict";
import { dafnyOf, provesAndBites, run } from "./support/verify-source.ts";

// `x ?? null` on an optional is the identity: null and undefined are one
// model (None). It used to unwrap the Some arm and keep a bare `None` in the
// other, which Dafny rejects (`type of case bodies do not agree`). `x!` after
// the test then reads the narrowed payload.
const source = `
interface Ctx { readonly closed?: string | null }
export function pick(c: Ctx): string {
  //@ verify
  //@ ensures c.closed !== null && c.closed !== undefined ==> \\result === c.closed
  //@ ensures (c.closed === null || c.closed === undefined) ==> \\result === ""
  if ((c.closed ?? null) !== null) return c.closed!;
  return "";
}`;

test("`x ?? null` agrees with JavaScript", () => {
  assert.equal(run(source, "pick", { closed: "a" }), "a");
  assert.equal(run(source, "pick", { closed: null }), "");
  assert.equal(run(source, "pick", {}), "");
});

test("`x ?? null` lowers to the optional itself, and the contract is proved", () => {
  assert.doesNotMatch(dafnyOf(source), /case None => None/);
  provesAndBites(source, s => s.replace('\\result === ""', '\\result === "x"'));
});
