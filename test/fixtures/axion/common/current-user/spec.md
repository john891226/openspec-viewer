# Spec Delta

## Purpose

Defines what the "current user" profile is, shared by every API and frontend capability that produces or consumes it.

## ADDED Requirements

### Requirement: Current user profile shape
The current user profile SHALL consist of exactly three fields: `id` (the user's unique identifier), `email` and `name`. `email` and `name` SHALL be `null` when the user has no value for them; fields MUST NOT be omitted.

#### Scenario: User with full profile
- **WHEN** the authenticated user has an email and a name
- **THEN** the profile contains their `id`, `email` and `name`

#### Scenario: User without a name
- **WHEN** the authenticated user has no name
- **THEN** the profile contains `name` as `null` and the other fields intact

### Requirement: Profile exposes no other data
The current user profile MUST NOT include credentials, tokens, provider metadata, identities or any field beyond the three above. Adding fields requires changing this capability.

#### Scenario: Extra data in the identity provider
- **WHEN** the identity provider holds additional data for the user
- **THEN** none of it appears in the profile
