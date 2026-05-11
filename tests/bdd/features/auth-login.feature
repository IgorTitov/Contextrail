# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of auth-login in this repository.
# @sidecar auth-login.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: User authentication

  As a user of the application
  I want to log in and log out
  So that I can access protected features

  Scenario: Anonymous adapter is always authenticated
    Given the anonymous auth adapter is active
    Then the user is authenticated
    And the user display name is "Anonymous"

  Scenario: Login with the local password adapter
    Given the local password adapter is active
    When the user logs in with username "alice" and password "secret123"
    Then the login succeeds
    And the user display name is "alice"

  Scenario: Login with wrong credentials fails
    Given the local password adapter is active
    When the user logs in with username "alice" and password "wrong"
    Then the login fails

  Scenario: Logout resets authentication
    Given the local password adapter is active
    And the user is logged in as "alice"
    When the user logs out
    Then the user is not authenticated

  Scenario: Route guard allows public routes
    Given the anonymous auth adapter is active
    When the user navigates to a public route
    Then access is allowed

  Scenario: Route guard blocks unauthenticated access to protected routes
    Given the local password adapter is active
    And the user is not logged in
    When the user navigates to a protected route
    Then access is denied
    And the reason is "auth.guard.not_authenticated"

  Scenario: JWT adapter verifies a signed token and extracts user claims
    Given the JWT auth adapter is active with a valid key pair
    When the user logs in with a signed JWT for "alice" with role "admin"
    Then the login succeeds
    And the user display name is "alice"

  Scenario: JWT adapter rejects an invalid token
    Given the JWT auth adapter is active with a valid key pair
    When the user logs in with an invalid JWT
    Then the login fails
