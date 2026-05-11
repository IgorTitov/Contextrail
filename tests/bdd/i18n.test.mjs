/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of i18n-test in this repository.
 * @sidecar i18n.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for i18n.feature.
 * Proves user-visible internationalization behavior through the i18n module public API.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  interpolate,
  createPluralResolver,
  createMessageRegistry,
  buildFallbackChain,
  resolveWithFallback,
} from '../../modules/i18n/public-api.mjs';

const feature = readFileSync(new URL('./features/i18n.feature', import.meta.url), 'utf8');

describe('Feature: Internationalization', () => {
  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Internationalization'));
    assert.ok(feature.includes('Scenario: Translate a simple message key'));
    assert.ok(feature.includes('Scenario: Interpolate parameters into a message'));
    assert.ok(feature.includes('Scenario: Fall back to another locale when key is missing'));
    assert.ok(feature.includes('Scenario: Pluralize based on count for English'));
    assert.ok(feature.includes('Scenario: Pluralize multiple items for English'));
    assert.ok(feature.includes('Scenario: Register messages from multiple modules'));
  });

  test('Scenario: Translate a simple message key', () => {
    // Given the message "greeting" is registered as "Hello!" for locale "en"
    const registry = createMessageRegistry();
    registry.register('app', 'en', { greeting: 'Hello!' });

    // When the user requests translation for "greeting"
    const result = registry.resolve('en', 'greeting');

    // Then the displayed text is "Hello!"
    assert.equal(result, 'Hello!');
  });

  test('Scenario: Interpolate parameters into a message', () => {
    // Given a message template "Welcome, {name}!"
    const template = 'Welcome, {name}!';

    // When the system interpolates with name "Alice"
    const result = interpolate(template, { name: 'Alice' });

    // Then the displayed text is "Welcome, Alice!"
    assert.equal(result, 'Welcome, Alice!');
  });

  test('Scenario: Fall back to another locale when key is missing', () => {
    // Given the message "app.title" is registered as "My App" for locale "en"
    // And the message "app.title" is not registered for locale "fr"
    const registry = createMessageRegistry();
    registry.register('app', 'en', { 'app.title': 'My App' });

    // When the system resolves "app.title" with fallback chain "fr" then "en"
    const chain = buildFallbackChain('fr', 'en');
    const result = resolveWithFallback(chain, registry, 'app.title');

    // Then the displayed text is "My App"
    assert.equal(result, 'My App');
  });

  test('Scenario: Pluralize based on count for English', () => {
    // Given the plural resolver is set to locale "en"
    const resolver = createPluralResolver('en');

    // When the system pluralizes 1 with forms one "1 item" and other "{count} items"
    const result = resolver.resolve(1, { one: '1 item', other: '{count} items' });

    // Then the displayed text is "1 item"
    assert.equal(result, '1 item');
  });

  test('Scenario: Pluralize multiple items for English', () => {
    // Given the plural resolver is set to locale "en"
    const resolver = createPluralResolver('en');

    // When the system pluralizes 5 with forms one "1 item" and other "{count} items"
    const result = resolver.resolve(5, { one: '1 item', other: '{count} items' });

    // Then the displayed text is "{count} items"
    assert.equal(result, '{count} items');
  });

  test('Scenario: Register messages from multiple modules', () => {
    // Given the message registry is active
    const registry = createMessageRegistry();

    // When the "auth" module registers "auth.login" as "Log in" for locale "en"
    registry.register('auth', 'en', { 'auth.login': 'Log in' });

    // And the "nav" module registers "nav.home" as "Home" for locale "en"
    registry.register('nav', 'en', { 'nav.home': 'Home' });

    // Then the registry resolves "auth.login" for locale "en" as "Log in"
    assert.equal(registry.resolve('en', 'auth.login'), 'Log in');

    // And the registry resolves "nav.home" for locale "en" as "Home"
    assert.equal(registry.resolve('en', 'nav.home'), 'Home');
  });
});
