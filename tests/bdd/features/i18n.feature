# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of i18n in this repository.
# @sidecar i18n.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Internationalization

  As a user of the application
  I want to see the interface in my preferred language
  So that I can understand and use the application comfortably

  Scenario: Translate a simple message key
    Given the locale is set to "en"
    And the message "greeting" is registered as "Hello!" for locale "en"
    When the user requests translation for "greeting"
    Then the displayed text is "Hello!"

  Scenario: Interpolate parameters into a message
    Given a message template "Welcome, {name}!"
    When the system interpolates with name "Alice"
    Then the displayed text is "Welcome, Alice!"

  Scenario: Fall back to another locale when key is missing
    Given the locale is set to "fr"
    And the message "app.title" is registered as "My App" for locale "en"
    And the message "app.title" is not registered for locale "fr"
    When the system resolves "app.title" with fallback chain "fr" then "en"
    Then the displayed text is "My App"

  Scenario: Pluralize based on count for English
    Given the plural resolver is set to locale "en"
    When the system pluralizes 1 with forms one "1 item" and other "{count} items"
    Then the displayed text is "1 item"

  Scenario: Pluralize multiple items for English
    Given the plural resolver is set to locale "en"
    When the system pluralizes 5 with forms one "1 item" and other "{count} items"
    Then the displayed text is "{count} items"

  Scenario: Register messages from multiple modules
    Given the message registry is active
    When the "auth" module registers "auth.login" as "Log in" for locale "en"
    And the "nav" module registers "nav.home" as "Home" for locale "en"
    Then the registry resolves "auth.login" for locale "en" as "Log in"
    And the registry resolves "nav.home" for locale "en" as "Home"
