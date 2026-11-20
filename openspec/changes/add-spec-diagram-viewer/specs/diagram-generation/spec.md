# Spec Delta

## Purpose

Derives Mermaid flowchart definitions from a parsed spec so diagrams are always regenerated from scenarios and never stored or hand-edited.

## ADDED Requirements

### Requirement: One flowchart per requirement
The generator SHALL produce one Mermaid flowchart definition per requirement, in source order, using the selected layout.

#### Scenario: Two requirements
- **WHEN** a spec has two requirements
- **THEN** two independent flowchart definitions are produced, in source order

#### Scenario: Requirement without scenarios
- **WHEN** a requirement has no scenarios
- **THEN** its flowchart is a single node labelled with the requirement name

### Requirement: Scenarios are the branches of one decision
The generator SHALL treat the scenarios of a requirement as alternative branches of a single decision, and SHALL draw a decision node only when the requirement has two or more scenarios.

#### Scenario: Several scenarios
- **WHEN** a requirement has two or more scenarios
- **THEN** the diagram has exactly one decision node, with one branch per scenario
- **AND** each branch is a single node showing the scenario name as its title and the WHEN text below it, with no separate WHEN node

#### Scenario: Single scenario
- **WHEN** a requirement has exactly one scenario
- **THEN** no decision node is drawn and the requirement leads straight to the scenario's node (name and WHEN)

### Requirement: Selectable layout
The generator SHALL support three layouts: `decision-diamond` (default), `options-box` and `scenario-flow`. Each scenario SHALL appear exactly once per diagram.

#### Scenario: Decision diamond
- **WHEN** the layout is `decision-diamond`
- **THEN** the requirement leads to one decision node whose branches are the scenarios, each shown as name plus WHEN in one node

#### Scenario: Options box
- **WHEN** the layout is `options-box`
- **THEN** the requirement is a single box listing its scenarios as numbered options, each showing the scenario name and its WHEN text, and each option leads to its outcome

#### Scenario: Scenario flow
- **WHEN** the layout is `scenario-flow`
- **THEN** the requirement leads to each scenario's condition via an edge labelled with the scenario name, with no decision node

#### Scenario: Default layout
- **WHEN** no layout is given
- **THEN** `decision-diamond` is used

### Requirement: WHEN as condition, THEN as outcome
The generator SHALL render WHEN/GIVEN text as conditions and THEN text as outcomes, using the text as written, with the keyword shown on each line.

#### Scenario: Scenario missing a step
- **WHEN** a scenario has a WHEN but no THEN, or a THEN but no WHEN
- **THEN** the diagram still renders the part that exists without failing

#### Scenario: Scenario with no steps
- **WHEN** a scenario has no recognised steps
- **THEN** the scenario is still shown with a "(no steps)" marker

### Requirement: Selectable AND style
The generator SHALL support two ways of showing AND lines: `chained` (default) and `list`. An AND SHALL NOT be drawn as a decision node, because the spec defines no alternative branch for it.

#### Scenario: Chained conditions
- **WHEN** the AND style is `chained` and a scenario has `WHEN a`, `AND b`, `AND c`, `THEN x`, `AND y`
- **THEN** `a` is the entry condition, `b` and `c` are distinct condition nodes (hexagons) in sequence, followed by outcome `x` and then `y`

#### Scenario: List
- **WHEN** the AND style is `list`
- **THEN** all conditions appear as lines in one condition node and all outcomes as lines in one outcome node

#### Scenario: Default AND style
- **WHEN** no AND style is given
- **THEN** `chained` is used

### Requirement: Selectable renderer
The generator SHALL support two renderers: `statechart` (default), a Mermaid state diagram in the style of a state machine, and `flowchart`. The layout and AND-style options SHALL apply only to the `flowchart` renderer.

#### Scenario: Statechart mapping
- **WHEN** the renderer is `statechart` and a scenario has `GIVEN g`, `WHEN w`, `AND c`, `THEN t`, `AND a`
- **THEN** `g` is the source state, `w` labels the transition together with the guard `[c]`, `t` is the target state, and `a` is listed inside the target state

#### Scenario: GIVEN states are reachable
- **WHEN** a scenario has a GIVEN
- **THEN** its source state is connected to the requirement's state, so no state is left without an incoming transition

#### Scenario: No GIVEN
- **WHEN** a scenario has no GIVEN
- **THEN** its transition starts from the state of the requirement itself

#### Scenario: States with identical text are shared
- **WHEN** two scenarios have the same GIVEN text, or the same first THEN text
- **THEN** they share one state in the diagram, so related scenarios connect

#### Scenario: Missing WHEN or THEN
- **WHEN** a scenario has no WHEN, or no THEN
- **THEN** the transition is labelled with the scenario name, or leads to a "(no outcome)" state, and the diagram still renders

#### Scenario: Delta labelling in statecharts
- **WHEN** a requirement belongs to a delta section and the renderer is `statechart`
- **THEN** its root state is labelled with the delta kind and styled like in the flowchart renderer

#### Scenario: Default renderer
- **WHEN** no renderer is given
- **THEN** `statechart` is used

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
