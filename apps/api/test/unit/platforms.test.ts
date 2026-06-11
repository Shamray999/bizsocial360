import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPlatform, isPlatformActive } from '@bizsocial360/shared';

test('isPlatform validates known platform strings', () => {
  assert.equal(isPlatform('FACEBOOK'), true);
  assert.equal(isPlatform('INSTAGRAM'), true);
  assert.equal(isPlatform('TIKTOK'), true);
  assert.equal(isPlatform('MYSPACE'), false);
  assert.equal(isPlatform(42), false);
});

test('isPlatformActive marks Facebook active and TikTok as preview', () => {
  assert.equal(isPlatformActive('FACEBOOK'), true);
  assert.equal(isPlatformActive('INSTAGRAM'), true);
  assert.equal(isPlatformActive('TIKTOK'), false);
});
