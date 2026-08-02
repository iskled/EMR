import { useState } from 'react'

export default function AccountActionPanel({ user, onAction, onPasswordReset }) {
  const [password, setPassword] = useState('')

  async function resetPassword(event) {
    event.preventDefault()
    if (!password.trim()) return
    await onPasswordReset(user, { temporary_password: password, force_password_change: true })
    setPassword('')
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900">Account actions</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onAction(user, user.is_active ? 'deactivate' : 'activate')} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold">
          {user.is_active ? 'Deactivate' : 'Activate'}
        </button>
        <button type="button" onClick={() => onAction(user, 'unlock')} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold">Unlock</button>
        <button type="button" onClick={() => onAction(user, 'resetFailed')} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold">Reset failed logins</button>
        <button type="button" onClick={() => onAction(user, 'forcePassword')} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold">Force password change</button>
        <button type="button" onClick={() => onAction(user, 'revokeSessions')} className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700">Revoke sessions</button>
      </div>
      <form onSubmit={resetPassword} className="mt-4 flex gap-2">
        <input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="Temporary password" className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Issue temporary password</button>
      </form>
    </section>
  )
}
