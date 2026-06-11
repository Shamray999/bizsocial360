import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ProviderNotConfiguredError,
  getProviderAdapter,
  providerRedirectUri,
  requireProviderAdapter,
} from '../../src/integrations/index.js';

test('getProviderAdapter returns the matching adapter per platform', () => {
  assert.equal(getProviderAdapter('FACEBOOK').platform, 'FACEBOOK');
  assert.equal(getProviderAdapter('INSTAGRAM').platform, 'INSTAGRAM');
  assert.equal(getProviderAdapter('TIKTOK').platform, 'TIKTOK');
});

test('providerRedirectUri builds the provider callback URL', () => {
  assert.equal(
    providerRedirectUri('FACEBOOK'),
    'http://localhost:4000/connect/facebook/callback',
  );
});

test('requireProviderAdapter throws when credentials are missing', () => {
  assert.throws(() => requireProviderAdapter('FACEBOOK'), ProviderNotConfiguredError);
});
