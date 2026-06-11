import { PrismaClient } from '@prisma/client';

/**
 * Idempotent seed: creates a demo organization with connected accounts, posts,
 * metrics, and comments so the dashboard shows real Prisma-backed data (rather
 * than the in-memory sample fallback). Safe to run repeatedly.
 *
 *   npm run db:seed --workspace apps/api
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const org = await prisma.organization.upsert({
    where: { id: 'seed-org' },
    create: { id: 'seed-org', name: 'Demo Organization' },
    update: {},
  });

  const facebook = await prisma.socialAccount.upsert({
    where: { platform_externalId: { platform: 'FACEBOOK', externalId: 'seed-fb' } },
    create: {
      platform: 'FACEBOOK',
      externalId: 'seed-fb',
      handle: 'bizsocial360',
      displayName: 'BizSocial360 (Demo Page)',
      followers: 18420,
      connected: true,
      organizationId: org.id,
    },
    update: { followers: 18420, connected: true },
  });

  const instagram = await prisma.socialAccount.upsert({
    where: { platform_externalId: { platform: 'INSTAGRAM', externalId: 'seed-ig' } },
    create: {
      platform: 'INSTAGRAM',
      externalId: 'seed-ig',
      handle: 'bizsocial360',
      displayName: 'BizSocial360 (Demo)',
      followers: 26310,
      connected: true,
      organizationId: org.id,
    },
    update: { followers: 26310, connected: true },
  });

  const reel = await prisma.post.upsert({
    where: { accountId_externalId: { accountId: instagram.id, externalId: 'seed-post-1' } },
    create: {
      accountId: instagram.id,
      externalId: 'seed-post-1',
      contentType: 'REEL',
      caption: 'Behind the scenes of our summer launch ☀️',
      permalink: 'https://instagram.com/p/demo1',
      publishedAt: new Date('2026-06-08T17:00:00.000Z'),
    },
    update: {},
  });

  const fbPost = await prisma.post.upsert({
    where: { accountId_externalId: { accountId: facebook.id, externalId: 'seed-post-2' } },
    create: {
      accountId: facebook.id,
      externalId: 'seed-post-2',
      contentType: 'POST',
      caption: 'Customer spotlight: how Acme grew 3x with us.',
      permalink: 'https://facebook.com/demo2',
      publishedAt: new Date('2026-06-07T13:30:00.000Z'),
    },
    update: {},
  });

  // Replace metrics each run so re-seeding is deterministic (latest snapshot).
  await prisma.postMetric.deleteMany({ where: { postId: { in: [reel.id, fbPost.id] } } });
  await prisma.postMetric.createMany({
    data: [
      {
        postId: reel.id,
        impressions: 42100,
        reach: 31200,
        views: 38800,
        likes: 2890,
        comments: 184,
        shares: 412,
        saves: 631,
        engagementRate: 0.135,
      },
      {
        postId: fbPost.id,
        impressions: 15600,
        reach: 12100,
        views: 0,
        likes: 540,
        comments: 73,
        shares: 96,
        saves: 0,
        engagementRate: 0.058,
      },
    ],
  });

  await prisma.comment.upsert({
    where: { accountId_externalId: { accountId: instagram.id, externalId: 'seed-cmt-1' } },
    create: {
      accountId: instagram.id,
      postId: reel.id,
      externalId: 'seed-cmt-1',
      author: '@jordan.makes',
      message: 'Do you ship to Canada? Been waiting to order!',
      status: 'NEW',
      receivedAt: new Date('2026-06-11T08:42:00.000Z'),
    },
    update: {},
  });

  await prisma.comment.upsert({
    where: { accountId_externalId: { accountId: facebook.id, externalId: 'seed-cmt-2' } },
    create: {
      accountId: facebook.id,
      postId: fbPost.id,
      externalId: 'seed-cmt-2',
      author: 'Dana Levi',
      message: 'My order #4821 still says processing — can you check?',
      status: 'PENDING',
      receivedAt: new Date('2026-06-11T07:05:00.000Z'),
    },
    update: {},
  });

  console.log(`Seeded organization "${org.name}" with 2 accounts, 2 posts, 2 comments.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
