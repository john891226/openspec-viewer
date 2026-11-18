# Spec Delta

## Purpose

Exposes the profile of the currently authenticated user so clients can load it right after login.

## ADDED Requirements

### Requirement: Current user endpoint
The API SHALL expose `GET /auth/me` that returns the authenticated user's profile (as defined by the common current-user profile) as JSON.

#### Scenario: Valid token
- **WHEN** a request to `GET /auth/me` carries a valid Supabase access token as a Bearer token
- **THEN** the response is 200 with that user's profile as the JSON body

### Requirement: Current user endpoint requires authentication
`GET /auth/me` SHALL NOT be public and MUST be rejected when the token is missing or invalid.

#### Scenario: Missing token
- **WHEN** a request to `GET /auth/me` has no Authorization header
- **THEN** the response is a 4xx error (403) and no user data is returned

#### Scenario: Invalid or expired token
- **WHEN** a request to `GET /auth/me` carries a token Supabase rejects
- **THEN** the response is 401 and no user data is returned

### Requirement: Documented contract
The endpoint SHALL be described in the Swagger document (bearer-authenticated, with a typed response schema) so the frontend client can be generated from it.

#### Scenario: Swagger lists the endpoint
- **WHEN** the Swagger JSON is requested
- **THEN** it contains `GET /auth/me` with a typed response schema for the profile
