import { reportExportUrl } from '../../services/reports.service'

export default function ExportMenu({ reportType, filters }) {
  return (
    <div className="flex flex-wrap gap-2">
      {['csv', 'xlsx', 'pdf'].map(format => (
        <a
          key={format}
          href={reportExportUrl(reportType, format, filters)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Export {format.toUpperCase()}
        </a>
      ))}
    </div>
  )
}
