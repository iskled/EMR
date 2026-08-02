export default function SessionSettingsPanel() {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Session controls</h2>
      <ul className="mt-2 space-y-1 text-sm text-gray-600">
        <li>JWT refresh rotation enabled</li>
        <li>Refresh token blacklist enabled</li>
        <li>Concurrent refresh protection enabled in the shared axios client</li>
      </ul>
    </section>
  )
}
