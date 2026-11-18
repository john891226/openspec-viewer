# Spec Delta

## Purpose

Derives Mermaid flowchart definitions from a parsed spec so diagrams are always regenerated from scenarios and never stored or hand-edited.

## ADDED Requirements

### Requirement: One flowchart per requirement
The generator SHALL produce one Mermaid flowchart definition per requirement, with the requirement as the root node and one branch per scenario.

#### Scenario: Two requirements
- **WHEN** a spec has two requirements
- **THEN** two independent flowchart definitions are produced, in source order

#### Scenario: Scenario branch shape
- **WHEN** a requirement has a scenario with a WHEN and a THEN
- **THEN** the flowchart has an edge from the requirement to the scenario's condition and from the condition to its outcome

### Requirement: WHEN as condition, THEN as outcome
The generator SHALL render WHEN/GIVEN text as the condition node and THEN text as the outcome node, using the text as written, and SHALL extend the preceding node with AND lines.

#### Scenario: AND extends WHEN
- **WHEN** a scenario has `WHEN a` and `AND b`
- **THEN** the condition node shows both `a` and `b`

#### Scenario: AND extends THEN
- **WHEN** a scenario has `THEN x` and `AND y`
- **THEN** the outcome node shows both `x` and `y`

#### Scenario: Scenario missing a step
- **WHEN** a scenario has a WHEN but no THEN
- **THEN** the diagram still renders the condition without failing

### Requirement: Safe label rendering
The generator SHALL escape step and name text so that arbitrary characters (quotes, brackets, backticks, pipes, angle brackets) cannot break or inject into the Mermaid definition.

#### Scenario: Special characters
- **WHEN** step text contains `"`, `[`, `]`, `|`, `<` or `` ` ``
- **THEN** the generated definition is valid Mermaid and displays the characters

### Requirement: Delta labelling
The generator SHALL label each requirement's root node with its delta kind (ADDED, MODIFIED, REMOVED, RENAMED) when it has one, and SHALL visually distinguish the kinds.

#### Scenario: Modified requirement
- **WHEN** a requirement is under `## MODIFIED Requirements`
- **THEN** its root node text includes the label MODIFIED and a modified style class

#### Scenario: Removed requirement
- **WHEN** a requirement is under `## REMOVED Requirements`
- **THEN** its diagram shows the requirement labelled REMOVED with its reason when available

#### Scenario: Renamed requirement
- **WHEN** a RENAMED section maps an old name to a new name
- **THEN** a diagram shows the old name linked to the new name labelled RENAMED

### Requirement: Deterministic output
The generator SHALL produce identical output for identical input.

#### Scenario: Repeated generation
- **WHEN** the same parsed spec is converted twice
- **THEN** both outputs are identical
