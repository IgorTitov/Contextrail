# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of user-preferences in this repository.
# @sidecar user-preferences.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: User preferences management

  As a user of the application
  I want my preferences to be saved and restored consistently
  So that that the application remembers my locale and theme choices

  Scenario: Default preferences provide sensible values
    Given no preferences have been set
    When default preferences are loaded
    Then locale is "en" and theme is "system"

  Scenario: Merge preferences updates selected fields
    Given default preferences
    When the user sets theme to "dark"
    Then the merged result has theme "dark" and locale "en"

  Scenario: Invalid theme values are rejected
    Given default preferences
    When the user sets theme to "neon"
    Then the theme remains unchanged

  Scenario: Preferences round-trip through storage
    Given the memory storage adapter is active
    When the user saves preferences and loads them back
    Then the loaded preferences match the saved ones

  Scenario: Validation rejects malformed preferences
    Given a preferences object with missing fields
    When isValidPreferences is called
    Then the result is false
