import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ContentInsight } from '@bizsocial360/shared';
import { summarizeEngagement } from '../../src/services/sample-data.js';

function insight(overrides: Partial<ContentInsight['metrics']>): ContentInsight {
  return {
    id: 'x',
    platform: 'INSTAGRAM',
    contentType: 'POST',
    caption: '',
    permalink: '',
    publishedAt: '2026-01-01T00:00:00.000Z',
    metrics: {
      impressions: 0,
      reach: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      engagementRate: 0,
      ...overrides,
    },
  };
}

test('summarizeEngagement sums metrics and derives the engagement rate', () => {
  const summary = summarizeEngagement([
    insight({ impressions: 20, reach: 10, likes: 2, comments: 1, shares: 1 }),
    insight({ impressions: 30, reach: 10, likes: 3, saves: 2 }),
  ]);

  assert.equal(summary.impressions, 50);
  assert.equal(summary.reach, 20);
  assert.equal(summary.likes, 5);
  assert.equal(summary.comments, 1);
  assert.equal(summary.shares, 1);
  assert.equal(summary.saves, 2);
  // interactions = 5 + 1 + 1 + 2 = 9; 9 / 20 = 0.45
  assert.equal(summary.engagementRate, 0.45);
});

test('summarizeEngagement handles an empty set without dividing by zero', () => {
  const summary = summarizeEngagement([]);
  assert.equal(summary.impressions, 0);
  assert.equal(summary.engagementRate, 0);
});
