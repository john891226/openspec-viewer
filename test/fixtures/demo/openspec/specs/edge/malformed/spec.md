# Edge cases

## Purpose

Things the parser and diagram must survive: missing steps, no scenarios, steps in odd order, fenced code with fake headers, unicode and emoji.

## Requirements

### Requirement: Requirement without scenarios
This requirement has normative text but no scenario blocks, so its diagram is a single node.

### Requirement: Scenario missing THEN
The diagram SHALL still draw the condition.

#### Scenario: Only a WHEN
- **WHEN** something happens and nothing is specified as the outcome

### Requirement: Scenario missing WHEN
The diagram SHALL still draw the outcome.

#### Scenario: Only a THEN
- **THEN** the system does something unconditionally

### Requirement: Scenario with no steps
This scenario has only prose, which is ignored.

#### Scenario: Prose only
Nothing machine-readable here, just a sentence.

### Requirement: Unbolded and mixed keywords
Keywords without bold markers are accepted.

#### Scenario: Plain keywords
- WHEN the keywords are not bold
- AND neither is this one
- THEN they are still parsed

### Requirement: Unicode and emoji ✅
Labels SHALL keep non-ASCII text as written.

#### Scenario: Acentos y ñ
- **WHEN** el usuario escribe "¿Cómo estás, señor?" 🎉
- **THEN** se muestra "日本語のテキスト" sin errores

### Requirement: Code fence with fake headers
Headers inside fenced code blocks are not requirements.

#### Scenario: Example in a fence
- **WHEN** the docs include an example
- **THEN** it is shown as code

```markdown
### Requirement: This is only an example
#### Scenario: Not real
- **WHEN** ignored
- **THEN** ignored
```
