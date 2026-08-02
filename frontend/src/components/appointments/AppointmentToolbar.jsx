import Button from '../ui/Button'

export default function AppointmentToolbar({
  onNew,
  onRefresh,
  loading = false,
  lastUpdated,
}) {
  return (
    <div className="flex flex-col gap-3 bg-white rounded-lg border border-gray-200 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
        <p className="text-sm text-gray-500">
          Enterprise scheduling, availability, and waiting-list workflow
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {lastUpdated && (
          <span className="text-xs text-gray-500">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        <Button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="bg-gray-700 hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
        <Button type="button" onClick={onNew}>
          New Appointment
        </Button>
      </div>
    </div>
  )
}
