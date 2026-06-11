// Test environment defaults, loaded via `node --import ./test/setup.ts` before
// any application module. Config validation (src/config/env.ts) requires these
// secrets to be present. Values are set with `??=` so a local .env or CI job
// environment still takes precedence.
process.env.NODE_ENV ??= 'test';
// 64 hex chars = 32 bytes, the AES-256 key size expected by token-crypto.
process.env.TOKEN_ENCRYPTION_KEY ??=
  '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
process.env.OAUTH_STATE_SECRET ??= 'test-oauth-state-secret';
process.env.JWT_SECRET ??= 'test-jwt-secret';
