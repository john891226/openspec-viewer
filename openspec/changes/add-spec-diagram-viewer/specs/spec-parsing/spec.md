# Spec Delta

## Purpose

Parses OpenSpec `spec.md` files into a structured model of requirements and scenarios, as a pure library with no editor dependency so a CLI or AI command can reuse it.

## ADDED Requirements

### Requirement: Parse requirements and scenarios
The parser SHALL extract each `### Requirement: <name>` block with its normative text and each `#### Scenario: <name>` block beneath it, preserving document order.

#### Scenario: Requirement with multiple scenarios
- **WHEN** a spec contains one requirement followed by two scenario blocks
- **THEN** the result has one requirement with two scenarios in source order
- **AND** the requirement's description text is captured

#### Scenario: Requirement without scenarios
- **WHEN** a requirement header has no scenario blocks
- **THEN** the requirement is still returned with an empty scenario list

### Requirement: Parse scenario steps
The parser SHALL read scenario lines of the form `- **WHEN** ...`, `- **GIVEN** ...`, `- **THEN** ...` and `- **AND** ...` into ordered steps, keeping the text exactly as written.

#### Scenario: AND attaches to preceding step
- **WHEN** an `AND` line follows a `WHEN` line
- **THEN** it is recorded as an additional step of kind WHEN-continuation
- **AND** an `AND` line following a `THEN` line is recorded as a THEN-continuation

#### Scenario: No writing convention required
- **WHEN** step text contains backticks, punctuation or markdown
- **THEN** the text is preserved verbatim without interpretation

#### Scenario: Unrecognised lines
- **WHEN** a scenario contains lines that are not WHEN/GIVEN/THEN/AND bullets
- **THEN** they are ignored without causing an error

### Requirement: Parse delta sections
The parser SHALL recognise `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements` and `## RENAMED Requirements` sections and tag each requirement with its section.

#### Scenario: Delta spec
- **WHEN** a spec has requirements under `## ADDED Requirements` and `## MODIFIED Requirements`
- **THEN** each requirement carries the delta kind of its enclosing section

#### Scenario: Main spec without delta sections
- **WHEN** a spec has requirements under a plain `## Requirements` section or none
- **THEN** requirements have no delta kind

#### Scenario: Removed requirement without scenarios
- **WHEN** a REMOVED requirement has `**Reason**` and `**Migration**` lines instead of scenarios
- **THEN** it is returned with its text and no scenarios

#### Scenario: Renamed requirements
- **WHEN** a RENAMED section lists `FROM:` and `TO:` lines
- **THEN** each pair is returned as a rename entry with old and new names

### Requirement: Parse purpose
The parser SHALL capture the text of a `## Purpose` section when present.

#### Scenario: Purpose present
- **WHEN** a spec has a `## Purpose` section
- **THEN** its text is returned as the purpose

### Requirement: Tolerant of malformed input
The parser SHALL never throw on arbitrary text and SHALL return an empty requirement list when nothing parseable is found.

#### Scenario: Not a spec
- **WHEN** the input has no requirement headers
- **THEN** the result contains no requirements

#### Scenario: Headers inside code fences
- **WHEN** requirement-like headers appear inside a fenced code block
- **THEN** they are not treated as requirements
