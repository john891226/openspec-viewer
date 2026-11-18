# Spec Delta

## Purpose

Defines how the frontend obtains and holds the current user's profile from the API during app bootstrap.

## ADDED Requirements

### Requirement: Authenticated API calls
Every API request made while a session exists SHALL carry the session's current Supabase access token as a Bearer token.

#### Scenario: Request while logged in
- **WHEN** the frontend calls the API with an active session
- **THEN** the request includes `Authorization: Bearer <access token>`

### Requirement: Load current user on bootstrap
When the app starts and a Supabase session exists, the frontend SHALL load `/auth/me` and store the resulting profile before rendering protected content. When no session exists, it MUST NOT call `/auth/me`.

#### Scenario: Reload with existing session
- **WHEN** the app boots with a restored session and `/auth/me` succeeds
- **THEN** the current user is available in the store before the SystemUser layout renders

#### Scenario: No session
- **WHEN** the app boots without a session
- **THEN** `/auth/me` is not called and the current user is empty

#### Scenario: `/auth/me` rejected
- **WHEN** `/auth/me` responds 401
- **THEN** the session is cleared and the user is sent to the login layout

### Requirement: Current user cleared on logout
The stored current user SHALL be cleared when the session ends.

#### Scenario: Sign out
- **WHEN** the user signs out
- **THEN** the stored user is empty and the login layout is shown
