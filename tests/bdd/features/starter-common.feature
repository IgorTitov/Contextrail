# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of starter-common in this repository.
# @sidecar starter-common.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Starter template common features

  @TPL-005 @TPL-006
  Scenario: User preferences persist across sessions
    Given the application loads with default preferences
    When the user changes a preference setting
    Then the preference is saved to storage
    And on the next visit the preference is restored

  @TPL-005 @TPL-007
  Scenario: Language picker switches locale
    Given the application displays content in English
    When the user selects Russian from the language picker
    Then all visible copy re-renders in Russian
    And the locale preference persists across sessions

  @TPL-005 @TPL-008
  Scenario: Theme toggle switches appearance
    Given the application uses the system default theme
    When the user toggles the theme to dark
    Then the application applies dark color tokens immediately
    And the theme preference persists across sessions

  @TPL-005 @TPL-009
  Scenario: Layout adapts to viewport
    Given the application renders in a mobile viewport
    When the viewport widens to desktop size
    Then the layout adapts from single-column to multi-region grid
    And no horizontal scrolling occurs

  @TPL-005 @TPL-010
  Scenario: Navigation is keyboard accessible
    Given the application is loaded
    When the user presses Tab
    Then a skip-to-content link becomes visible
    And activating it moves focus to the main content area

  @TPL-005 @TPL-011
  Scenario: Toast notifications appear and auto-dismiss
    Given the notification system is active
    When an application event triggers a toast notification
    Then the toast appears in an ARIA live region
    And the toast auto-dismisses after the configured duration

  @TPL-005 @TPL-012
  Scenario: Loading skeletons display during async work
    Given the application starts an asynchronous operation
    When the loading state is active
    Then skeleton placeholders with shimmer animation are visible
    And the loading container has aria-busy set to true

  @TPL-005 @TPL-013
  Scenario: Error boundary catches and displays fallback
    Given the application is running normally
    When an unexpected error occurs
    Then the error boundary catches it
    And a fallback UI with a retry action replaces the main content
