import { USER_ROLES } from '../../services/users.service'

export default function UserFilters({ filters, onChange, onReset }) {
  const update = event => onChange({ ...filters, [event.target.name]: event.target.value })
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <input name="search" value={filters.search} onChange={update} placeholder="Search staff" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select name="role" value={filters.role} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All roles</option>
          {USER_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
        </select>
        <select name="is_active" value={filters.is_active} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select name="locked" value={filters.locked} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Any lock</option>
          <option value="true">Locked</option>
          <option value="false">Unlocked</option>
        </select>
        <button type="button" onClick={onReset} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">Reset</button>
      </div>
    </div>
  )
}
