import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOAuthState, verifyOAuthState } from '../../src/security/oauth-state.js';

test('create → verify round-trips platform and organization', () => {
  const state = createOAuthState({ platform: 'FACEBOOK', organizationId: 'org_1' });
  const payload = verifyOAuthState(state);
  assert.equal(payload.platform, 'FACEBOOK');
  assert.equal(payload.organizationId, 'org_1');
});

test('tampered state signature is rejected', () => {
  const state = createOAuthState({ platform: 'INSTAGRAM' });
  const tampered = `${state.slice(0, -1)}${state.endsWith('A') ? 'B' : 'A'}`;
  assert.throws(() => verifyOAuthState(tampered));
});

test('expired state is rejected', () => {
  const state = createOAuthState({ platform: 'TIKTOK' });
  // A negative max-age forces the freshness check to fail deterministically.
  assert.throws(() => verifyOAuthState(state, -1));
});

test('malformed state is rejected', () => {
  assert.throws(() => verifyOAuthState('garbage-without-a-dot'));
});
