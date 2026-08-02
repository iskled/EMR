export default function AccountLockoutPanel({ dashboard }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Account lockout</h2>
      <p className="mt-2 text-sm text-gray-600">Locked accounts in recent activity: <span className="font-semibold">{dashboard?.locked_accounts ?? 0}</span></p>
    </section>
  )
}
