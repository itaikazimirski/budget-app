export default function Loading() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 animate-pulse">
      <div className="h-8 bg-slate-100 dark:bg-white/5 rounded-xl w-32" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-slate-100 dark:bg-white/5 rounded-2xl" />
      ))}
    </div>
  )
}
