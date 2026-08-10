import { useEffect, useMemo, useRef, useState } from 'react'
import {
  archiveDentist,
  createDentistAccount,
  deactivateDentist,
  getDentistAccounts,
  getDentistDependencies,
  reactivateDentist,
  resetDentistPassword,
  updateDentistAccount,
} from '../services/dentistAccounts.service'

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  license_number: '',
  specialization: '',
  is_active: true,
  temporary_password: '',
}

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
]

function fullName(dentist) {
  return dentist?.full_name || `${dentist?.first_name || ''} ${dentist?.last_name || ''}`.trim() || dentist?.email || 'Dentist'
}

function statusLabel(dentist) {
  if (dentist.archived_at) return 'Archived'
  return dentist.is_active ? 'Active' : 'Inactive'
}

function statusClass(dentist) {
  if (dentist.archived_at) return 'bg-slate-100 text-slate-700'
  return dentist.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
}

function formatDate(value) {
  if (!value) return 'Never'
  return new Date(value).toLocaleDateString()
}

function fieldError(data, fallback) {
  if (!data) return fallback
  if (typeof data === 'string') return data
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length) return value[0]
    if (typeof value === 'string') return value
  }
  return fallback
}

function FormField({ id, label, children, required = false }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {label}{required && <span className="text-rose-600"> *</span>}
      </label>
      {children}
    </div>
  )
}

function DentistAccountForm({ dentist, onClose, onSaved }) {
  const [form, setForm] = useState(dentist ? { ...emptyForm, ...dentist, temporary_password: '' } : emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(name, value) {
    setForm(current => ({ ...current, [name]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, role: 'dentist' }
      if (dentist) delete payload.temporary_password
      const saved = dentist
        ? await updateDentistAccount(dentist.id, payload)
        : await createDentistAccount(payload)
      onSaved(saved)
    } catch (err) {
      setError(fieldError(err.response?.data, 'Unable to save dentist account.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">{dentist ? 'Edit Dentist' : 'New Dentist'}</h2>
            <p className="mt-1 text-sm text-slate-500">Role is securely fixed to Dentist.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            Close
          </button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FormField id="dentist-first-name" label="First Name" required>
            <input id="dentist-first-name" required value={form.first_name || ''} onChange={event => update('first_name', event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </FormField>
          <FormField id="dentist-last-name" label="Last Name" required>
            <input id="dentist-last-name" required value={form.last_name || ''} onChange={event => update('last_name', event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </FormField>
          <FormField id="dentist-email" label="Email" required>
            <input id="dentist-email" required type="email" value={form.email || ''} onChange={event => update('email', event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </FormField>
          <FormField id="dentist-phone" label="Phone">
            <input id="dentist-phone" value={form.phone || ''} onChange={event => update('phone', event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </FormField>
          <FormField id="dentist-registration" label="Professional Registration Number">
            <input id="dentist-registration" value={form.license_number || ''} onChange={event => update('license_number', event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </FormField>
          <FormField id="dentist-specialty" label="Specialty">
            <input id="dentist-specialty" value={form.specialization || ''} onChange={event => update('specialization', event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </FormField>
          {!dentist && (
            <FormField id="dentist-temporary-password" label="Secure Temporary Password" required>
              <input id="dentist-temporary-password" required type="password" value={form.temporary_password || ''} onChange={event => update('temporary_password', event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
              <p className="mt-1 text-xs text-slate-500">The dentist must change this password at first login.</p>
            </FormField>
          )}
          <label className="flex items-center gap-2 self-end rounded-md border border-slate-200 p-3 text-sm font-semibold text-slate-800">
            <input type="checkbox" checked={Boolean(form.is_active)} onChange={event => update('is_active', event.target.checked)} />
            Active account
          </label>
        </div>

        <div className="mt-6 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
          This specialised workflow can only create and edit Dentist accounts. It never exposes password hashes, tokens, superuser flags, or global permissions.
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700">Cancel</button>
          <button disabled={saving} className="rounded-md bg-blue-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300">
            {saving ? 'Saving...' : 'Save Dentist'}
          </button>
        </div>
      </form>
    </div>
  )
}

function DependencySummary({ dependencies }) {
  if (!dependencies) return <p className="mt-4 text-sm text-slate-500">Loading dependency summary...</p>
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
      {Object.entries(dependencies.counts || {}).map(([key, value]) => (
        <div key={key} className="rounded-md bg-slate-50 p-3">
          <span className="block text-xs uppercase text-slate-500">{key.replaceAll('_', ' ')}</span>
          <strong className="text-lg text-slate-950">{value}</strong>
        </div>
      ))}
    </div>
  )
}

function ActionDialog({ dentist, type, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [dependencies, setDependencies] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    getDentistDependencies(dentist.id)
      .then(data => { if (mounted) setDependencies(data) })
      .catch(() => { if (mounted) setError('Unable to load dependency summary.') })
    return () => { mounted = false }
  }, [dentist.id])

  const isReset = type === 'reset'
  const isReactivate = type === 'reactivate'
  const isArchive = type === 'archive'
  const title = {
    deactivate: `Deactivate Dr ${fullName(dentist)}?`,
    reactivate: `Reactivate Dr ${fullName(dentist)}?`,
    archive: `Archive Dr ${fullName(dentist)}?`,
    reset: `Reset access for Dr ${fullName(dentist)}?`,
  }[type]

  async function act() {
    setBusy(true)
    setError('')
    try {
      if (type === 'deactivate') await deactivateDentist(dentist.id, reason)
      if (type === 'reactivate') await reactivateDentist(dentist.id, reason)
      if (type === 'archive') await archiveDentist(dentist.id, reason)
      if (type === 'reset') await resetDentistPassword(dentist.id, reason)
      onDone()
    } catch (err) {
      setError(fieldError(err.response?.data, 'Unable to complete account action.'))
    } finally {
      setBusy(false)
    }
  }

  const confirmationRequired = !isReactivate
  const canSubmit = !busy && dependencies && (!confirmationRequired || reason.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isReset
                ? 'Temporary access is reset using the existing password policy and forced password change.'
                : 'Historical records, clinical attribution, appointments, orthodontic visits, tasks, and audit events are preserved.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Close</button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <DependencySummary dependencies={dependencies} />

        {isArchive && dependencies?.has_dependencies && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            This dentist has historical clinical records and cannot be permanently deleted. The account can be archived instead.
          </p>
        )}

        <FormField id="dentist-action-reason" label={isReset ? 'Secure Temporary Password' : isReactivate ? 'Reason (Optional)' : 'Reason'} required={!isReactivate}>
          {isReset ? (
            <input id="dentist-action-reason" type="password" value={reason} onChange={event => setReason(event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          ) : (
            <textarea id="dentist-action-reason" value={reason} onChange={event => setReason(event.target.value)} rows={4} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          )}
        </FormField>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700">Cancel</button>
          <button type="button" disabled={!canSubmit} onClick={act} className="rounded-md bg-blue-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300">
            {busy ? 'Working...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DentistAccountsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [action, setAction] = useState(null)
  const searchRef = useRef(null)

  const params = useMemo(() => {
    const next = {}
    if (search.trim()) next.search = search.trim()
    if (status === 'active') next.is_active = true
    if (status === 'inactive') next.is_active = false
    if (status === 'archived') next.archived = true
    return next
  }, [search, status])

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRows(await getDentistAccounts(params))
    } catch {
      setError('Unable to load dentist accounts.')
    } finally {
      setLoading(false)
      if (document.activeElement === searchRef.current) searchRef.current?.focus()
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [params])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Dentist Accounts</h1>
          <p className="text-sm text-slate-500">Manage dentist access and clinician profiles.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="rounded-md bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">
          + New Dentist
        </button>
      </header>

      <section className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input
          ref={searchRef}
          aria-label="Search dentists"
          placeholder="Search name, email, phone or registration"
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="min-w-72 flex-1 rounded-md border border-slate-300 px-3 py-2"
        />
        <select aria-label="Account status" value={status} onChange={event => setStatus(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2">
          {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </section>

      {loading && <p className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">Loading dentist accounts...</p>}
      {!loading && error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800">{error} <button type="button" onClick={load} className="font-semibold underline">Retry</button></div>}
      {!loading && !error && rows.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">No dentist accounts match these filters.</p>}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Full Name', 'Email', 'Phone', 'Registration', 'Role', 'Account Status', 'Last Login', 'Date Created', 'Actions'].map(heading => (
                  <th key={heading} className="p-3 text-left font-semibold text-slate-700">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(dentist => (
                <tr key={dentist.id} className="border-t border-slate-200">
                  <td className="p-3 font-semibold text-slate-950">Dr {fullName(dentist)}</td>
                  <td className="p-3 text-slate-700">{dentist.email}</td>
                  <td className="p-3 text-slate-700">{dentist.phone || '-'}</td>
                  <td className="p-3 text-slate-700">{dentist.license_number || '-'}</td>
                  <td className="p-3 capitalize text-slate-700">{dentist.role}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(dentist)}`}>{statusLabel(dentist)}</span></td>
                  <td className="p-3 text-slate-700">{formatDate(dentist.last_login)}</td>
                  <td className="p-3 text-slate-700">{formatDate(dentist.date_joined)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setEditing(dentist)} className="rounded-md border border-blue-200 px-3 py-1 font-semibold text-blue-700">Edit</button>
                      {dentist.is_active ? (
                        <button type="button" onClick={() => setAction({ dentist, type: 'deactivate' })} className="rounded-md border border-rose-200 px-3 py-1 font-semibold text-rose-700">Deactivate</button>
                      ) : (
                        <button type="button" onClick={() => setAction({ dentist, type: 'reactivate' })} className="rounded-md border border-emerald-200 px-3 py-1 font-semibold text-emerald-700">Reactivate</button>
                      )}
                      <button type="button" onClick={() => setAction({ dentist, type: 'reset' })} className="rounded-md border border-slate-200 px-3 py-1 font-semibold text-slate-700">Reset Password</button>
                      <button type="button" onClick={() => setAction({ dentist, type: 'archive' })} className="rounded-md border border-amber-200 px-3 py-1 font-semibold text-amber-700">Archive</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <DentistAccountForm
          dentist={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}
      {action && (
        <ActionDialog
          {...action}
          onClose={() => setAction(null)}
          onDone={() => { setAction(null); load() }}
        />
      )}
    </div>
  )
}
