import type { Platform } from './platforms';

/** Content formats we track engagement for. */
export type ContentType = 'POST' | 'STORY' | 'REEL' | 'VIDEO';

/** Lifecycle of a customer comment in the response queue. */
export type CommentStatus = 'NEW' | 'PENDING' | 'RESPONDED' | 'ARCHIVED';

/** Normalized engagement metrics, consistent across all providers. */
export interface EngagementMetrics {
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  /** Derived: total interactions / reach, expressed as a 0..1 ratio. */
  engagementRate: number;
}

/** A connected social account summary for the dashboard. */
export interface SocialAccountSummary {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  followers: number;
  connected: boolean;
}

/** A single tracked piece of content with its latest metrics. */
export interface ContentInsight {
  id: string;
  platform: Platform;
  contentType: ContentType;
  caption: string;
  permalink: string;
  publishedAt: string;
  metrics: EngagementMetrics;
}

/** A customer comment awaiting a response. */
export interface PendingComment {
  id: string;
  platform: Platform;
  author: string;
  message: string;
  receivedAt: string;
  status: CommentStatus;
  /** Minutes elapsed since the comment was received. */
  waitingMinutes: number;
}

/** A recommended publishing window derived from historical engagement. */
export interface PublishWindowRecommendation {
  platform: Platform;
  contentType: ContentType;
  /** 0 (Sunday) .. 6 (Saturday). */
  dayOfWeek: number;
  /** 0..23, local to the account's timezone. */
  hourOfDay: number;
  /** Confidence score 0..1 for this recommendation. */
  confidence: number;
  /** Average engagement rate observed in this window. */
  expectedEngagementRate: number;
}

/** AI-generated insight summary with provenance for traceability. */
export interface InsightRecommendation {
  id: string;
  title: string;
  summary: string;
  confidence: number;
  /** IDs of the content/metric records this insight was derived from. */
  sources: string[];
  generatedAt: string;
}

/** Role a user holds within an organization (mirrors the Prisma enum). */
export type MemberRole = 'OWNER' | 'ADMIN' | 'ANALYST' | 'VIEWER';

/** The authenticated user returned by the app-auth endpoints. */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  /** The organization the session is currently scoped to. */
  organizationId: string;
  role: MemberRole;
}

/** Response body for a successful register/login: a session token + user. */
export interface AuthSession {
  token: string;
  user: AuthUser;
}
