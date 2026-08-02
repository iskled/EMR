import AccountActionPanel from './AccountActionPanel'
import RolePermissionSummary from './RolePermissionSummary'
import UserSecurityTimeline from './UserSecurityTimeline'
import UserStatusBadge from './UserStatusBadge'

export default function UserDrawer({ user, matrix, securityHistory, auditHistory, onClose, onEdit, onAction, onPasswordReset }) {
  if (!user) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <aside className="h-full w-full max-w-4xl overflow-y-auto bg-gray-50 p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onEdit(user)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold">Edit</button>
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold">Close</button>
          </div>
        </div>
        <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div><span className="text-gray-500">Role</span><p className="font-semibold capitalize">{user.role}</p></div>
            <div><span className="text-gray-500">Status</span><p className="mt-1"><UserStatusBadge user={user} /></p></div>
            <div><span className="text-gray-500">Failed logins</span><p className="font-semibold">{user.failed_login_count}</p></div>
            <div><span className="text-gray-500">Forced password</span><p className="font-semibold">{user.must_change_password ? 'Yes' : 'No'}</p></div>
            <div><span className="text-gray-500">Last login</span><p className="font-semibold">{user.last_login ? new Date(user.last_login).toLocaleString() : '-'}</p></div>
            <div><span className="text-gray-500">Password changed</span><p className="font-semibold">{user.last_password_change ? new Date(user.last_password_change).toLocaleString() : '-'}</p></div>
            <div><span className="text-gray-500">Phone</span><p className="font-semibold">{user.phone || '-'}</p></div>
            <div><span className="text-gray-500">License</span><p className="font-semibold">{user.license_number || '-'}</p></div>
          </div>
        </section>
        <div className="space-y-4">
          <AccountActionPanel user={user} onAction={onAction} onPasswordReset={onPasswordReset} />
          <RolePermissionSummary user={user} matrix={matrix} />
          <UserSecurityTimeline securityHistory={securityHistory} auditHistory={auditHistory} />
        </div>
      </aside>
    </div>
  )
}
