import { test } from "node:test";
import assert from "node:assert/strict";
import { provesAndBites, run } from "./support/verify-source.ts";

// After an early return narrows `m.ref`, its uses read the payload. A use
// that fills a slot declared `string | null` (a record field, a parameter)
// still stands for the whole optional: it must be re-wrapped in `Some`, not
// passed bare (`expected Option<string>, found string`).
const source = `
interface Move { readonly ref: string | null }
type Action = { readonly action: "open"; readonly ref: string | null } | { readonly action: "ignore" };
function present(ref: string | null): boolean {
  //@ verify
  return ref !== null;
}
export function onMove(m: Move): Action {
  //@ verify
  //@ ensures m.ref === null ==> \\result.action === "ignore"
  //@ ensures m.ref !== null ==> \\result.action === "open" && \\result.ref === m.ref
  if (m.ref === null) return { action: "ignore" };
  return { action: "open", ref: m.ref };
}
export function known(m: Move): boolean {
  //@ verify
  //@ ensures \\result === (m.ref !== null)
  if (m.ref === null) return false;
  return present(m.ref);
}`;

test("the narrowed field passed on agrees with JavaScript", () => {
  assert.deepEqual(run(source, "onMove", { ref: "r" }), { action: "open", ref: "r" });
  assert.deepEqual(run(source, "onMove", { ref: null }), { action: "ignore" });
  assert.equal(run(source, "known", { ref: "r" }), true);
});

test("record field and parameter slots receive Some(payload), and the contracts are proved", () => {
  provesAndBites(source, s => s.replace('\\result.action === "open" &&', '\\result.action === "ignore" &&'));
});
