import { describe, expect, it } from 'vitest';
import { capabilityName, isSpecPath } from '../src/core/specPath';

describe('isSpecPath', () => {
  it.each([
    '/w/proj/openspec/specs/auth/spec.md',
    '/w/proj/openspec/specs/frontend/auth-shell/spec.md',
    '/w/proj/openspec/changes/my-change/specs/auth/spec.md',
    '/w/proj/openspec/changes/archive/2026-01-01-x/specs/a/b/spec.md',
    'C:\\w\\proj\\openspec\\specs\\auth\\spec.md',
  ])('accepts %s', (p) => expect(isSpecPath(p)).toBe(true));

  it.each([
    '/w/proj/README.md',
    '/w/proj/openspec/specs/auth/notes.md',
    '/w/proj/openspec/specs/spec.md',
    '/w/proj/openspec/changes/my-change/proposal.md',
    '/w/proj/openspec/changes/my-change/spec.md',
    '/w/proj/docs/specs/auth/spec.md',
  ])('rejects %s', (p) => expect(isSpecPath(p)).toBe(false));
});

describe('capabilityName', () => {
  it('extracts nested capability paths', () => {
    expect(capabilityName('/p/openspec/specs/frontend/auth-shell/spec.md')).toBe('frontend/auth-shell');
    expect(capabilityName('/p/openspec/changes/c/specs/auth/spec.md')).toBe('auth');
  });
  it('is undefined for other files', () => expect(capabilityName('/p/README.md')).toBeUndefined());
});
