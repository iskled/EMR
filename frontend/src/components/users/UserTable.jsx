import UserStatusBadge from './UserStatusBadge'

export default function UserTable({ users, onOpen, onEdit }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last login</th>
            <th className="px-4 py-3">Failed</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map(user => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <button type="button" onClick={() => onOpen(user)} className="font-semibold text-blue-700 hover:text-blue-900">{user.full_name}</button>
              </td>
              <td className="px-4 py-3">{user.email}</td>
              <td className="px-4 py-3 capitalize">{user.role}</td>
              <td className="px-4 py-3"><UserStatusBadge user={user} /></td>
              <td className="px-4 py-3">{user.last_login ? new Date(user.last_login).toLocaleString() : '-'}</td>
              <td className="px-4 py-3">{user.failed_login_count}</td>
              <td className="px-4 py-3 text-right">
                <button type="button" onClick={() => onEdit(user)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700">Edit</button>
              </td>
            </tr>
          ))}
          {!users.length && <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-500">No users found.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
