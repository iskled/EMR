import { formatLabel } from '../../services/orthodontics.service'

export default function DocumentViewer({ documents = [], onDelete }) {
  return (
    <div className="space-y-3">
      {documents.map(document => (
        <div key={document.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">{document.title}</p>
              <p className="text-sm text-gray-500">{formatLabel(document.document_type)} · Version {document.version}</p>
              {document.notes && <p className="mt-2 text-sm text-gray-600">{document.notes}</p>}
            </div>
            <div className="flex gap-3">
              {document.file_url && (
                <a className="text-sm font-semibold text-blue-700 hover:underline" href={document.file_url} target="_blank" rel="noreferrer">
                  Preview / Download
                </a>
              )}
              <button type="button" onClick={() => onDelete?.(document)} className="text-sm font-semibold text-rose-700 hover:underline">
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
      {!documents.length && (
        <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No orthodontic documents uploaded.
        </p>
      )}
    </div>
  )
}
