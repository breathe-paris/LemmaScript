import { test } from "node:test";
import { provesAndBites } from "./support/verify-source.ts";

// `Readonly<Record<K, V>>`, `ReadonlyMap` and `ReadonlySet` restrict writes at
// compile time only: they hold the same values as their mutable forms. They
// were emitted as unknown Dafny types (`Readonly<Record<string, string>>`).
const source = `
export function lookup(m: Readonly<Record<string, number>>, k: string): number {
  //@ verify
  //@ ensures !(k in m) ==> \\result === 0
  //@ ensures k in m ==> \\result === m[k]
  const v = m[k];
  return v === undefined ? 0 : v;
}
export function count(s: ReadonlySet<string>, m: ReadonlyMap<string, number>, k: string): number {
  //@ verify
  //@ ensures !s.has(k) ==> \\result === 0
  return s.has(k) ? 1 : 0;
}`;

test("readonly wrappers verify as their mutable forms", () => {
  provesAndBites(source, s => s.replace("!(k in m) ==> \\result === 0", "!(k in m) ==> \\result === 1"));
});
