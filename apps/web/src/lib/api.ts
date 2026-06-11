import type {
  ContentInsight,
  EngagementMetrics,
  InsightRecommendation,
  PendingComment,
  PublishWindowRecommendation,
  SocialAccountSummary,
} from '@bizsocial360/shared';
import {
  fallbackAccounts,
  fallbackComments,
  fallbackContent,
  fallbackPublishWindows,
  fallbackRecommendations,
  fallbackSummary,
} from './fallback';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export interface DashboardData {
  accounts: SocialAccountSummary[];
  summary: EngagementMetrics;
  content: ContentInsight[];
  comments: PendingComment[];
  publishWindows: PublishWindowRecommendation[];
  recommendations: InsightRecommendation[];
  /** True when data was served live from the API, false when using fallback. */
  live: boolean;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with ${response.status}`);
  }
  const body = (await response.json()) as { data: T };
  return body.data;
}

/**
 * Loads everything the dashboard needs in parallel. If the API is unreachable,
 * gracefully falls back to local sample data and flags `live: false`.
 */
export async function getDashboardData(): Promise<DashboardData> {
  try {
    const [accounts, summary, content, comments, publishWindows, recommendations] =
      await Promise.all([
        getJson<SocialAccountSummary[]>('/api/v1/accounts'),
        getJson<EngagementMetrics>('/api/v1/insights/summary'),
        getJson<ContentInsight[]>('/api/v1/insights/content'),
        getJson<PendingComment[]>('/api/v1/comments'),
        getJson<PublishWindowRecommendation[]>('/api/v1/insights/publish-windows'),
        getJson<InsightRecommendation[]>('/api/v1/insights/recommendations'),
      ]);

    return { accounts, summary, content, comments, publishWindows, recommendations, live: true };
  } catch {
    return {
      accounts: fallbackAccounts,
      summary: fallbackSummary,
      content: fallbackContent,
      comments: fallbackComments,
      publishWindows: fallbackPublishWindows,
      recommendations: fallbackRecommendations,
      live: false,
    };
  }
}
