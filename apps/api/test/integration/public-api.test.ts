import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

/**
 * Mode-invariant integration tests over the built Fastify app via in-process
 * injection. Assertions hold in both demo mode (no DATABASE_URL → sample data)
 * and connected mode (DATABASE_URL set → Prisma data), so they are safe to run
 * locally and in CI regardless of whether a database is attached.
 */
let app: FastifyInstance;

before(async () => {
  app = await buildApp();
  await app.ready();
});

after(async () => {
  await app.close();
});

test('GET /health reports liveness', async () => {
  const res = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().status, 'ok');
});

test('GET /ready reports a database status', async () => {
  const res = await app.inject({ method: 'GET', url: '/ready' });
  assert.equal(res.statusCode, 200);
  assert.ok(['configured', 'not-configured'].includes(res.json().database));
});

test('GET /api/v1/accounts returns a list of accounts', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/v1/accounts' });
  assert.equal(res.statusCode, 200);
  const data = res.json().data;
  assert.ok(Array.isArray(data));
  for (const account of data) {
    assert.ok(typeof account.platform === 'string');
    assert.ok(typeof account.handle === 'string');
  }
});

test('GET /api/v1/insights/summary returns numeric engagement', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/v1/insights/summary' });
  assert.equal(res.statusCode, 200);
  assert.equal(typeof res.json().data.engagementRate, 'number');
});

test('GET /api/v1/comments returns a list', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/v1/comments' });
  assert.equal(res.statusCode, 200);
  assert.ok(Array.isArray(res.json().data));
});

test('GET /connections requires authentication', async () => {
  const res = await app.inject({ method: 'GET', url: '/connections' });
  assert.equal(res.statusCode, 401);
});

test('POST /sync requires authentication', async () => {
  const res = await app.inject({ method: 'POST', url: '/sync' });
  assert.equal(res.statusCode, 401);
});
