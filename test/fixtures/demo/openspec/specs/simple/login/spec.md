# Login Specification

## Purpose

Simple case: two requirements, several scenarios, a GIVEN step and a few AND lines.

## Requirements

### Requirement: Password login
The system SHALL let a registered user sign in with email and password.

#### Scenario: Valid credentials
- **GIVEN** a registered user with a verified email
- **WHEN** they submit the correct email and password
- **THEN** a session is created
- **AND** they are redirected to the dashboard

#### Scenario: Wrong password
- **WHEN** they submit a wrong password
- **THEN** an error "Invalid credentials" is shown
- **AND** no session is created

### Requirement: Sign out
The system SHALL end the session when the user signs out.

#### Scenario: Explicit sign out
- **WHEN** a signed-in user clicks "Sign out"
- **THEN** the session is destroyed and the login page is shown
