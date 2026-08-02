import { useEffect, useState } from 'react'
import { USER_ROLES } from '../../services/users.service'

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  role: 'assistant',
  phone: '',
  specialization: '',
  license_number: '',
  temporary_password: '',
  force_password_change: true,
  is_active: true,
}

export default function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    setForm(user ? { ...emptyForm, ...user, force_password_change: user.must_change_password, temporary_password: '' } : emptyForm)
  }, [user])

  const update = event => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm({ ...form, [event.target.name]: value })
  }

  async function submit(event) {
    event.preventDefault()
    const payload = { ...form }
    if (user) {
      delete payload.email
      delete payload.temporary_password
    }
    await onSave(user, payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{user ? 'Edit user' : 'Create user'}</h2>
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold">Close</button>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <input name="first_name" value={form.first_name || ''} onChange={update} required placeholder="First name" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="last_name" value={form.last_name || ''} onChange={update} required placeholder="Last name" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="email" value={form.email || ''} onChange={update} required disabled={Boolean(user)} type="email" placeholder="Email" className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100" />
          <select name="role" value={form.role} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {USER_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <input name="phone" value={form.phone || ''} onChange={update} placeholder="Phone" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="specialization" value={form.specialization || ''} onChange={update} placeholder="Specialization" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="license_number" value={form.license_number || ''} onChange={update} placeholder="License number" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          {!user && <input name="temporary_password" value={form.temporary_password} onChange={update} required type="password" placeholder="Temporary password" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />}
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name="is_active" checked={form.is_active} onChange={update} /> Active</label>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name="force_password_change" checked={form.force_password_change} onChange={update} /> Force password change</label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold">Cancel</button>
          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save user</button>
        </div>
      </form>
    </div>
  )
}
