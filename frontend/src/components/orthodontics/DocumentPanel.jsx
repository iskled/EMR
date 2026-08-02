import { useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import DocumentViewer from './DocumentViewer'
import { uploadOrthodonticDocument, deleteOrthodonticDocument } from '../../services/orthodontics.service'

export default function DocumentPanel({ orthoCase, onChanged }) {
  const [form, setForm] = useState({ document_type: 'consent', title: '', version: 1, notes: '', file: null })
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!orthoCase || !form.file || !form.title || loading) return
    setLoading(true)
    try {
      await uploadOrthodonticDocument({ ...form, ortho_case: orthoCase.id })
      setForm({ document_type: 'consent', title: '', version: 1, notes: '', file: null })
      await onChanged?.()
    } finally {
      setLoading(false)
    }
  }

  async function remove(document) {
    await deleteOrthodonticDocument(document.id)
    await onChanged?.()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900">Orthodontic Documents</h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <Select label="Type" value={form.document_type} onChange={event => setForm({ ...form, document_type: event.target.value })} options={[
            { value: 'consent', label: 'Treatment Consent' }, { value: 'treatment_plan', label: 'Treatment Plan' },
            { value: 'referral', label: 'Referral Letter' }, { value: 'radiograph', label: 'Radiograph' },
            { value: 'study_model', label: 'Study Model' }, { value: 'cephalometric', label: 'Cephalometric Analysis' },
            { value: 'photograph', label: 'Photograph' }, { value: 'pdf', label: 'PDF' }, { value: 'other', label: 'Other' },
          ]} />
          <Input label="Title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} />
          <Input label="Version" type="number" min="1" value={form.version} onChange={event => setForm({ ...form, version: event.target.value })} />
          <Input label="File" type="file" onChange={event => setForm({ ...form, file: event.target.files?.[0] || null })} />
          <Input label="Notes" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={!orthoCase || loading}>{loading ? 'Uploading...' : 'Upload Document'}</Button>
        </div>
      </form>
      <DocumentViewer documents={orthoCase?.documents || []} onDelete={remove} />
    </div>
  )
}
