import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

/**
 * Auth + connections flow against a real database. Skipped when DATABASE_URL is
 * not configured (e.g. the demo-mode unit/integration run); executed in CI with
 * a Postgres service and migrations applied, and locally when a .env points at
 * the dev database.
 */
const dbConfigured = Boolean(process.env.DATABASE_URL);
const json = { 'content-type': 'application/json' };

describe('auth + connections (requires DATABASE_URL)', { skip: !dbConfigured }, () => {
  let app: FastifyInstance;
  let token: string;
  const email = `owner+${Date.now()}@test.dev`;
  const password = 'supersecret123';

  before(async () => {
    app = await buildApp();
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  test('register issues a session token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: json,
      payload: JSON.stringify({ email, password, displayName: 'Test Owner' }),
    });
    assert.equal(res.statusCode, 201);
    const body = res.json().data;
    token = body.token;
    assert.ok(token, 'expected a token');
    assert.equal(body.user.email, email);
  });

  test('login returns a session token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: json,
      payload: JSON.stringify({ email, password }),
    });
    assert.equal(res.statusCode, 200);
    assert.ok(res.json().data.token);
  });

  test('GET /auth/me returns the current user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.email, email);
  });

  test('GET /connections is authorized and returns an array', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/connections',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.json().data));
  });

  test('POST /sync runs and returns totals', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sync',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const data = res.json().data;
    assert.ok(data.totals, 'expected sync totals');
    assert.equal(typeof data.totals.posts, 'number');
  });
});
