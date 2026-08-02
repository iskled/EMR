import { useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import PhotoGallery from './PhotoGallery'
import { uploadOrthodonticPhoto, deleteOrthodonticPhoto } from '../../services/orthodontics.service'

export default function ClinicalPhotos({ orthoCase, visits = [], onChanged }) {
  const [form, setForm] = useState({ photo_type: 'progress', caption: '', taken_at: '', visit: '', image: null })
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!orthoCase || !form.image || loading) return
    setLoading(true)
    try {
      await uploadOrthodonticPhoto({ ...form, ortho_case: orthoCase.id })
      setForm({ photo_type: 'progress', caption: '', taken_at: '', visit: '', image: null })
      await onChanged?.()
    } finally {
      setLoading(false)
    }
  }

  async function remove(photo) {
    await deleteOrthodonticPhoto(photo.id)
    await onChanged?.()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900">Clinical Photos</h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <Select label="Type" value={form.photo_type} onChange={event => setForm({ ...form, photo_type: event.target.value })} options={[
            { value: 'before', label: 'Before' }, { value: 'progress', label: 'Progress' }, { value: 'after', label: 'After' },
            { value: 'intraoral', label: 'Intraoral' }, { value: 'extraoral', label: 'Extraoral' }, { value: 'radiograph', label: 'Radiograph' },
          ]} />
          <Input label="Taken at" type="date" value={form.taken_at} onChange={event => setForm({ ...form, taken_at: event.target.value })} />
          <Select label="Visit" value={form.visit} onChange={event => setForm({ ...form, visit: event.target.value })} options={[{ value: '', label: 'No visit association' }, ...visits.map(visit => ({ value: visit.id, label: `${visit.visit_date} ${visit.visit_type}` }))]} />
          <Input label="Caption" value={form.caption} onChange={event => setForm({ ...form, caption: event.target.value })} />
          <Input label="Image" type="file" accept="image/*" onChange={event => setForm({ ...form, image: event.target.files?.[0] || null })} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={!orthoCase || loading}>{loading ? 'Uploading...' : 'Upload Photo'}</Button>
        </div>
      </form>
      <PhotoGallery photos={orthoCase?.photos || []} onDelete={remove} />
    </div>
  )
}
