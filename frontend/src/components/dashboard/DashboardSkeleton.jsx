export default function DashboardSkeleton() {
  return <div aria-label="Loading dashboard" className="animate-pulse space-y-6"><div className="h-32 rounded-2xl bg-slate-200"/><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[1,2,3,4].map(x => <div key={x} className="h-28 rounded-xl bg-slate-200"/>)}</div><div className="h-72 rounded-2xl bg-slate-200"/></div>
}
