import { MetricCard } from '@/components/MetricCard';
import { PlatformBadge } from '@/components/PlatformBadge';
import { getDashboardData } from '@/lib/api';
import { formatNumber, formatPercent, formatWaiting, formatWindow } from '@/lib/format';

// Always render fresh data on each request.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">BizSocial360</h1>
          <p className="text-sm text-slate-500">
            Engagement insights across Facebook, Instagram &amp; TikTok
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
            data.live ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${data.live ? 'bg-green-500' : 'bg-amber-500'}`}
          />
          {data.live ? 'Live data' : 'Demo data — start the API for live results'}
        </span>
      </header>

      {/* Connected accounts */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Connected accounts
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={account.platform} />
                  {!account.connected ? (
                    <span className="text-xs font-medium text-slate-400">Not connected</span>
                  ) : null}
                </div>
                <p className="mt-2 font-medium text-slate-900">@{account.handle}</p>
                <p className="text-xs text-slate-400">{account.displayName}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-slate-900">
                  {formatNumber(account.followers)}
                </p>
                <p className="text-xs text-slate-400">followers</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Engagement summary */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Engagement summary
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Impressions" value={formatNumber(data.summary.impressions)} />
          <MetricCard label="Reach" value={formatNumber(data.summary.reach)} />
          <MetricCard
            label="Engagement rate"
            value={formatPercent(data.summary.engagementRate)}
            hint="interactions / reach"
          />
          <MetricCard
            label="Interactions"
            value={formatNumber(
              data.summary.likes + data.summary.comments + data.summary.shares + data.summary.saves,
            )}
            hint="likes + comments + shares + saves"
          />
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top content */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Top content</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.content.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={item.platform} />
                    <span className="text-xs font-medium uppercase text-slate-400">
                      {item.contentType}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-700">{item.caption}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatPercent(item.metrics.engagementRate)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatNumber(item.metrics.reach)} reach
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Comment response queue */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Awaiting response</h2>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {data.comments.length} pending
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.comments.map((comment) => (
              <li key={comment.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={comment.platform} />
                    <span className="text-sm font-medium text-slate-700">{comment.author}</span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      comment.waitingMinutes >= 60 ? 'text-red-600' : 'text-slate-400'
                    }`}
                  >
                    {formatWaiting(comment.waitingMinutes)} waiting
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{comment.message}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Best times to publish */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Best times to publish</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.publishWindows.map((slot, index) => (
              <li
                key={`${slot.platform}-${slot.contentType}-${index}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={slot.platform} />
                  <span className="text-xs font-medium uppercase text-slate-400">
                    {slot.contentType}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatWindow(slot.dayOfWeek, slot.hourOfDay)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatPercent(slot.confidence)} confidence
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* AI recommendations */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Insights &amp; recommendations</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.recommendations.map((rec) => (
              <li key={rec.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">{rec.title}</p>
                  <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {formatPercent(rec.confidence)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{rec.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        BizSocial360 · Phase 1 scaffold · Facebook &amp; Instagram active · TikTok preview
      </footer>
    </main>
  );
}
