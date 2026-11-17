import { test } from "node:test";
import assert from "node:assert/strict";
import { dafnyOf, provesAndBites, run } from "./support/verify-source.ts";

// `x !== null && f(x)` as a value (returned here): the left conjunct narrows
// `x` for the right one. Only the if, ternary and statement forms narrowed;
// the value form passed the whole optional to a string parameter.
const source = `
const INBOX = new Set(["inbox"]);
export function isInbox(folder: string | null): boolean {
  //@ verify
  //@ ensures folder === null ==> !\\result
  //@ ensures folder !== null ==> \\result === INBOX.has(folder.toLowerCase())
  return folder !== null && INBOX.has(folder.toLowerCase());
}`;

test("the narrowing conjunction agrees with JavaScript", () => {
  assert.equal(run(source, "isInbox", null), false);
  assert.equal(run(source, "isInbox", "INBOX"), true);
  assert.equal(run(source, "isInbox", "sent"), false);
});

test("the right conjunct reads the payload, and the contract is proved", () => {
  assert.match(dafnyOf(source), /case Some\(\w+\) =>/);
  provesAndBites(source, s => s.replace("\\result === INBOX.has", "\\result !== INBOX.has"));
});
