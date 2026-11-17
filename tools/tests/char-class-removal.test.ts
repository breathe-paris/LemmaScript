import { test } from "node:test";
import assert from "node:assert/strict";
import { dafnyOf, provesAndBites } from "./support/verify-source.ts";

// `s.replace(/[…]/g, "")` with a plain character class removes every character
// of the class. Regular expressions were rejected outright; this one shape now
// lowers to `StringRemoveCharRanges` over the class's code bounds.
const removal = (cls: string) => `
export function strip(area: string): string {
  //@ verify
  //@ ensures \\result.length <= area.length
  return area.replace(/[${cls}]/g, '');
}`;

/** The [lo, hi] bounds the generated Dafny passes for a class. */
function bounds(cls: string): [number, number][] {
  const m = /StringRemoveCharRanges\(area, \[([\d, ]*)\]\)/.exec(dafnyOf(removal(cls)));
  assert.ok(m, `no removal emitted for [${cls}]`);
  const flat = m[1].split(",").map(Number);
  return flat.flatMap((lo, i) => (i % 2 === 0 ? [[lo, flat[i + 1]] as [number, number]] : []));
}

test("the emitted bounds match JavaScript's class on every BMP code unit", () => {
  for (const cls of ["\\s-", "\\d", "a-zA-Z_", "\\t\\-\\]\\\\", ".,;\\u00e9", "0-9\\s"]) {
    const re = new RegExp(`[${cls}]`);
    const ranges = bounds(cls);
    for (let code = 0; code <= 0xffff; code++) {
      const inModel = ranges.some(([lo, hi]) => lo <= code && code <= hi);
      assert.equal(inModel, re.test(String.fromCharCode(code)), `[${cls}] at U+${code.toString(16)}`);
    }
  }
});

test("other regular expressions stay outside the fragment", () => {
  for (const cls of ["^a", "\\w", "\\S", "\\b"]) {
    assert.throws(() => dafnyOf(removal(cls)), /Unsupported expression/, cls);
  }
  assert.throws(() => dafnyOf(removal("a").replace("/g,", "/,")), /Unsupported expression/);
  assert.throws(() => dafnyOf(removal("a").replace("/g,", "/gi,")), /Unsupported expression/);
  assert.throws(() => dafnyOf(removal("a").replace("''", "'x'")), /Unsupported expression/);
});

test("removal verifies and bites", () => {
  provesAndBites(removal("\\s-"), s => s.replace("\\result.length <= area.length", "\\result.length < area.length"));
});
