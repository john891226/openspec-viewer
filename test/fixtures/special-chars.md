## ADDED Requirements

### Requirement: Weird "quotes" & <tags> [brackets]
The system SHALL cope with `code` and | pipes.

#### Scenario: Odd text
- **WHEN** input is `a "b" [c] | <d> {e}` and #hash
- **AND** second line with (parens) and ; semicolons
- **THEN** output shows "ok" <br/> literally
- **AND** it does not break the diagram
