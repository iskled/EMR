export default function AuditFilters({ filters, onChange, onReset }) {
  const update = event => onChange({ ...filters, [event.target.name]: event.target.value })
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <input name="search" value={filters.search} onChange={update} placeholder="Search" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input name="start_date" value={filters.start_date} onChange={update} type="date" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input name="end_date" value={filters.end_date} onChange={update} type="date" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input name="user_role" value={filters.user_role} onChange={update} placeholder="Role" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input name="action" value={filters.action} onChange={update} placeholder="Action" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input name="source_module" value={filters.source_module} onChange={update} placeholder="Module" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input name="resource_type" value={filters.resource_type} onChange={update} placeholder="Resource" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select name="success" value={filters.success} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Any status</option>
          <option value="true">Success</option>
          <option value="false">Failure</option>
        </select>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={onReset} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">Reset</button>
      </div>
    </div>
  )
}
