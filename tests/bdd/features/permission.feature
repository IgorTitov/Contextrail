# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of permission in this repository.
# @sidecar permission.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Role-based permissions

  As an application administrator
  I want to control what actions each role can perform
  So that users only access resources they are authorized for

  Scenario: Admin can perform an allowed action
    Given a permission adapter with role hierarchy admin > editor > viewer
    And the rule allows admin to "delete" resource "article"
    And the current user has role "admin"
    Then the user can "delete" resource "article"

  Scenario: Viewer cannot perform an admin-only action
    Given a permission adapter with role hierarchy admin > editor > viewer
    And the rule allows admin to "delete" resource "article"
    And the current user has role "viewer"
    Then the user cannot "delete" resource "article"

  Scenario: Editor inherits viewer permissions
    Given a permission adapter with role hierarchy admin > editor > viewer
    And the rule allows viewer to "read" resource "article"
    And the current user has role "editor"
    Then the user can "read" resource "article"

  Scenario: Default effect denies when no rule matches
    Given a permission adapter with default deny
    And the current user has role "viewer"
    Then the user cannot "write" resource "secret"

  Scenario: Grant a new permission at runtime
    Given a permission adapter with default deny
    And the current user has role "editor"
    When the system grants editor to "publish" resource "article"
    Then the user can "publish" resource "article"

  Scenario: Revoke a permission
    Given a permission adapter with default deny
    And the rule allows editor to "publish" resource "article"
    And the current user has role "editor"
    When the system revokes "publish" on resource "article" for editor
    Then the user cannot "publish" resource "article"
