export default function DashboardWidgetError({ onRetry }) {
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">This panel could not be loaded. <button type="button" onClick={onRetry} className="font-semibold underline">Retry</button></div>
}
