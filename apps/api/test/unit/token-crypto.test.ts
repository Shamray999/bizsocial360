import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decryptSecret,
  encryptSecret,
  isTokenEncryptionConfigured,
} from '../../src/security/token-crypto.js';

test('encrypt → decrypt round-trips the plaintext', () => {
  const secret = 'super-secret-access-token';
  const encrypted = encryptSecret(secret);
  assert.notEqual(encrypted, secret);
  assert.equal(decryptSecret(encrypted), secret);
});

test('encryption is non-deterministic (random IV per call)', () => {
  const a = encryptSecret('same-input');
  const b = encryptSecret('same-input');
  assert.notEqual(a, b);
  assert.equal(decryptSecret(a), 'same-input');
  assert.equal(decryptSecret(b), 'same-input');
});

test('tampered ciphertext fails authentication', () => {
  const encrypted = encryptSecret('value');
  const tampered = `${encrypted.slice(0, -2)}${encrypted.endsWith('a') ? 'bb' : 'aa'}`;
  assert.throws(() => decryptSecret(tampered));
});

test('malformed payloads are rejected', () => {
  assert.throws(() => decryptSecret('not-a-valid-payload'));
});

test('isTokenEncryptionConfigured reflects the configured key', () => {
  assert.equal(isTokenEncryptionConfigured(), true);
});
