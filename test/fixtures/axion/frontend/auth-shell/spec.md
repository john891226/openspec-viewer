# Spec Delta

## Purpose

Defines the login layout, the authenticated SystemUser layout and the routing rules that choose between them from session state.

## ADDED Requirements

### Requirement: Login layout for anonymous users
When there is no session, the frontend SHALL show the Login layout containing an email and password form, and MUST NOT render the SystemUser layout.

#### Scenario: Anonymous visit
- **WHEN** an anonymous user opens any app route
- **THEN** they are redirected to the login route and see the Login layout

#### Scenario: Invalid credentials
- **WHEN** the user submits credentials Supabase rejects
- **THEN** an error message is shown and the user stays on the Login layout

#### Scenario: Validation
- **WHEN** the user submits with an empty or malformed email, or empty password
- **THEN** field errors are shown and no login request is made

### Requirement: Redirect to SystemUser layout after login
After a successful login the frontend SHALL load the current user and redirect to the SystemUser layout. The SystemUser layout SHALL be an empty shell for now (layout container with a content outlet).

#### Scenario: Successful login
- **WHEN** the user submits valid credentials
- **THEN** the current user is loaded and the app navigates to the SystemUser layout

#### Scenario: Logged-in user visits login
- **WHEN** a logged-in user opens the login route
- **THEN** they are redirected to the SystemUser layout

### Requirement: Session changes drive navigation
The frontend SHALL react to Supabase auth state changes.

#### Scenario: Session expires or sign-out elsewhere
- **WHEN** the session ends while the app is open
- **THEN** the user is redirected to the login route
