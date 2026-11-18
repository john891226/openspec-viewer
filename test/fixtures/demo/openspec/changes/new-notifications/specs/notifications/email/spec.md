# Spec Delta

## Purpose

New capability delivered as a change: sends transactional emails and respects opt-outs.

## ADDED Requirements

### Requirement: Order confirmation email
The system SHALL email the shopper a confirmation within one minute of a paid order.

#### Scenario: Paid order
- **WHEN** an order becomes `paid`
- **THEN** an email with the order number and total is sent

#### Scenario: Provider outage
- **WHEN** the email provider is unavailable
- **THEN** the email is retried with backoff
- **AND** after 5 failures an alert is raised

### Requirement: Marketing opt-out
The system MUST NOT send marketing emails to users who opted out.

#### Scenario: Opted-out user
- **GIVEN** a user with marketing emails disabled
- **WHEN** a campaign targets their segment
- **THEN** they are skipped and no email is sent
