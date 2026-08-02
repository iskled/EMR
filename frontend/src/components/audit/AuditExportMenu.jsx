export default function AuditExportMenu({ onExport }) {
  return (
    <button type="button" onClick={onExport} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
      Export CSV
    </button>
  )
}
