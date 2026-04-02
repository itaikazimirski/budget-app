export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-pulse">
      {/* Month nav */}
      <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-xl w-64 mx-auto" />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 dark:bg-white/5 rounded-2xl" />
        ))}
      </div>

      {/* Bucket summary */}
      <div className="h-32 bg-slate-100 dark:bg-white/5 rounded-2xl" />

      {/* Category rows */}
      <div className="bg-slate-100 dark:bg-white/5 rounded-2xl overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="px-4 py-4 border-b border-slate-200 dark:border-white/5 last:border-0 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-32" />
              <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-20" />
            </div>
            <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full w-full" />
          </div>
        ))}
      </div>

      {/* Transaction table */}
      <div className="bg-slate-100 dark:bg-white/5 rounded-2xl overflow-hidden">
        <div className="px-4 py-5 border-b border-slate-200 dark:border-white/5 flex justify-between">
          <div className="h-8 bg-slate-200 dark:bg-white/10 rounded w-28" />
          <div className="h-8 bg-slate-200 dark:bg-white/10 rounded w-20" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-slate-200 dark:border-white/5 last:border-0 flex justify-between items-center gap-4">
            <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-36" />
            <div className="h-4 bg-slate-200 dark:bg-white/10 rounded flex-1" />
            <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
