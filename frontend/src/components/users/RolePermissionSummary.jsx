export default function RolePermissionSummary({ user, matrix }) {
  const permissions = matrix.filter(row => row[user?.role])
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900">Effective permissions</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {permissions.map(row => (
          <span key={row.permission} className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{row.permission}</span>
        ))}
        {!permissions.length && <p className="text-sm text-gray-500">No permissions for this role.</p>}
      </div>
    </section>
  )
}
