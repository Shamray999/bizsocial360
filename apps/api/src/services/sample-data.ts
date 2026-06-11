import type {
  ContentInsight,
  EngagementMetrics,
  InsightRecommendation,
  PendingComment,
  PublishWindowRecommendation,
  SocialAccountSummary,
} from '@bizsocial360/shared';

/**
 * Deterministic sample data used to power the dashboard and public API
 * before live provider ingestion is wired up. Replace with service calls
 * backed by Prisma once accounts are connected (Phase 3).
 */

export const sampleAccounts: SocialAccountSummary[] = [
  {
    id: 'acc_fb_demo',
    platform: 'FACEBOOK',
    handle: 'bizsocial360',
    displayName: 'BizSocial360 (Demo Page)',
    followers: 18420,
    connected: true,
  },
  {
    id: 'acc_ig_demo',
    platform: 'INSTAGRAM',
    handle: 'bizsocial360',
    displayName: 'BizSocial360 (Demo)',
    followers: 26310,
    connected: true,
  },
  {
    id: 'acc_tt_demo',
    platform: 'TIKTOK',
    handle: 'bizsocial360',
    displayName: 'BizSocial360 (Preview)',
    followers: 0,
    connected: false,
  },
];

export const sampleContentInsights: ContentInsight[] = [
  {
    id: 'post_1',
    platform: 'INSTAGRAM',
    contentType: 'REEL',
    caption: 'Behind the scenes of our summer launch ☀️',
    permalink: 'https://instagram.com/p/demo1',
    publishedAt: '2026-06-08T17:00:00.000Z',
    metrics: {
      impressions: 42100,
      reach: 31200,
      views: 38800,
      likes: 2890,
      comments: 184,
      shares: 412,
      saves: 631,
      engagementRate: 0.135,
    },
  },
  {
    id: 'post_2',
    platform: 'FACEBOOK',
    contentType: 'POST',
    caption: 'Customer spotlight: how Acme grew 3x with us.',
    permalink: 'https://facebook.com/demo2',
    publishedAt: '2026-06-07T13:30:00.000Z',
    metrics: {
      impressions: 15600,
      reach: 12100,
      views: 0,
      likes: 540,
      comments: 73,
      shares: 96,
      saves: 0,
      engagementRate: 0.058,
    },
  },
  {
    id: 'post_3',
    platform: 'INSTAGRAM',
    contentType: 'STORY',
    caption: 'Flash poll: which feature next?',
    permalink: 'https://instagram.com/stories/demo3',
    publishedAt: '2026-06-09T09:15:00.000Z',
    metrics: {
      impressions: 9800,
      reach: 9100,
      views: 9100,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      engagementRate: 0.071,
    },
  },
];

export const samplePendingComments: PendingComment[] = [
  {
    id: 'cmt_1',
    platform: 'INSTAGRAM',
    author: '@jordan.makes',
    message: 'Do you ship to Canada? Been waiting to order!',
    receivedAt: '2026-06-11T08:42:00.000Z',
    status: 'NEW',
    waitingMinutes: 73,
  },
  {
    id: 'cmt_2',
    platform: 'FACEBOOK',
    author: 'Dana Levi',
    message: 'My order #4821 still says processing — can you check?',
    receivedAt: '2026-06-11T07:05:00.000Z',
    status: 'PENDING',
    waitingMinutes: 170,
  },
  {
    id: 'cmt_3',
    platform: 'INSTAGRAM',
    author: '@thecoffeenook',
    message: 'Loved the reel! Any chance of a tutorial?',
    receivedAt: '2026-06-11T09:30:00.000Z',
    status: 'NEW',
    waitingMinutes: 25,
  },
];

export const samplePublishWindows: PublishWindowRecommendation[] = [
  {
    platform: 'INSTAGRAM',
    contentType: 'REEL',
    dayOfWeek: 3,
    hourOfDay: 18,
    confidence: 0.82,
    expectedEngagementRate: 0.121,
  },
  {
    platform: 'FACEBOOK',
    contentType: 'POST',
    dayOfWeek: 2,
    hourOfDay: 12,
    confidence: 0.69,
    expectedEngagementRate: 0.061,
  },
  {
    platform: 'INSTAGRAM',
    contentType: 'STORY',
    dayOfWeek: 5,
    hourOfDay: 9,
    confidence: 0.74,
    expectedEngagementRate: 0.083,
  },
];

export const sampleRecommendations: InsightRecommendation[] = [
  {
    id: 'rec_1',
    title: 'Reels are outperforming static posts 2.3x',
    summary:
      'Instagram Reels drove a 13.5% engagement rate vs 5.8% for Facebook posts this week. Consider shifting two weekly static posts to short-form video.',
    confidence: 0.78,
    sources: ['post_1', 'post_2'],
    generatedAt: '2026-06-11T06:00:00.000Z',
  },
  {
    id: 'rec_2',
    title: '3 customer questions are past your 1-hour response target',
    summary:
      'Two Instagram and one Facebook comment have been waiting over 60 minutes. Prioritising shipping and order-status replies protects conversion.',
    confidence: 0.91,
    sources: ['cmt_1', 'cmt_2'],
    generatedAt: '2026-06-11T09:55:00.000Z',
  },
];

/** Aggregates a set of content insights into a single engagement summary. */
export function summarizeEngagement(insights: ContentInsight[]): EngagementMetrics {
  const totals = insights.reduce(
    (acc, item) => {
      acc.impressions += item.metrics.impressions;
      acc.reach += item.metrics.reach;
      acc.views += item.metrics.views;
      acc.likes += item.metrics.likes;
      acc.comments += item.metrics.comments;
      acc.shares += item.metrics.shares;
      acc.saves += item.metrics.saves;
      return acc;
    },
    {
      impressions: 0,
      reach: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    },
  );

  const interactions = totals.likes + totals.comments + totals.shares + totals.saves;
  const engagementRate = totals.reach > 0 ? interactions / totals.reach : 0;

  return { ...totals, engagementRate: Number(engagementRate.toFixed(4)) };
}
