import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Project, ScriptTarget, ts } from "ts-morph";
import { extractModule } from "../../src/extract.ts";
import { resolveModule } from "../../src/resolve.ts";
import { narrowModule } from "../../src/narrow.ts";
import { transformModuleDafny } from "../../src/transform.ts";
import { emitDafnyFile } from "../../src/dafny-emit.ts";
import { DEFAULT_OPTIONS } from "../../src/config.ts";
import { peepholeModule } from "../../src/peephole.ts";

/** Dafny for one in-memory TS source, which must type-check under `strict`. */
export function dafnyOf(source: string): string {
  const project = new Project({ compilerOptions: { strict: true, target: ScriptTarget.ESNext,
    lib: ["lib.esnext.d.ts"], types: [], skipLibCheck: true } });
  const file = project.createSourceFile("source.ts", source);
  const diagnostics = project.getPreEmitDiagnostics();
  assert.equal(diagnostics.length, 0, project.formatDiagnosticsWithColorAndContext(diagnostics));
  const { typesFile, defFile } = transformModuleDafny(narrowModule(resolveModule(extractModule(file))));
  const output = peepholeModule({ ...defFile, decls: [...(typesFile?.decls ?? []), ...defFile.decls] }, "dafny");
  return emitDafnyFile(output, undefined, DEFAULT_OPTIONS);
}

/** `dafny verify` on generated text: exit status and the verifier's output. */
export function verifyDafny(text: string): { status: number | null; output: string } {
  const dir = mkdtempSync(join(tmpdir(), "lsc-verify-"));
  try {
    const path = join(dir, "source.dfy");
    writeFileSync(path, text);
    const result = spawnSync("dafny", ["verify", "--verification-time-limit=15", path],
      { encoding: "utf8", timeout: 120_000 });
    assert.ifError(result.error);
    return { status: result.status, output: result.stdout + result.stderr };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/** Run an exported function of the source as JavaScript. */
export function run(source: string, name: string, ...args: unknown[]): unknown {
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS,
  } });
  const exports: Record<string, (...args: unknown[]) => unknown> = {};
  new Function("exports", outputText)(exports);
  return exports[name]!(...args);
}

/** The source verifies, and the mutated source (a wrong contract) does not. */
export function provesAndBites(source: string, mutate: (s: string) => string): void {
  const good = verifyDafny(dafnyOf(source));
  assert.equal(good.status, 0, good.output);
  const mutated = mutate(source);
  assert.notEqual(mutated, source, "the mutation must change the source");
  const bad = verifyDafny(dafnyOf(mutated));
  assert.notEqual(bad.status, 0, "the mutated contract must not verify");
  assert.match(bad.output, /postcondition|assertion/, bad.output);
}
