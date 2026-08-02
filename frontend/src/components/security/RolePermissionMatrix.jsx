const roles = ['admin', 'dentist', 'assistant', 'receptionist']

export default function RolePermissionMatrix({ permissions }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Role permission matrix</h2>
      <div className="mt-4 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Permission</th>
              {roles.map(role => <th key={role} className="px-3 py-2 capitalize">{role}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {permissions.map(row => (
              <tr key={row.permission}>
                <td className="px-3 py-2 font-medium">{row.permission}</td>
                {roles.map(role => <td key={role} className="px-3 py-2">{row[role] ? 'Allowed' : '-'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
