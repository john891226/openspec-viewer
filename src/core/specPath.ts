/** Spec-file location rules, kept free of editor dependencies so they are unit-testable. */

const MAIN_SPEC = /\/openspec\/specs\/(.+)\/spec\.md$/;
const DELTA_SPEC = /\/openspec\/changes\/(?:archive\/)?[^/]+\/specs\/(.+)\/spec\.md$/;

const normalize = (path: string) => path.replace(/\\/g, '/');

/** True for `openspec/specs/<capability>/spec.md` and `openspec/changes/<name>/specs/<capability>/spec.md`. */
export function isSpecPath(path: string): boolean {
  const p = normalize(path);
  return MAIN_SPEC.test(p) || DELTA_SPEC.test(p);
}

/** Capability path (e.g. `frontend/auth-shell`) for a spec path, or undefined when not a spec file. */
export function capabilityName(path: string): string | undefined {
  const p = normalize(path);
  return (DELTA_SPEC.exec(p) ?? MAIN_SPEC.exec(p))?.[1];
}
