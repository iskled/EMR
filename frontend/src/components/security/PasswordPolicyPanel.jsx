export default function PasswordPolicyPanel() {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Password policy</h2>
      <ul className="mt-2 space-y-1 text-sm text-gray-600">
        <li>Minimum length: 10 characters</li>
        <li>Django password validators enforced</li>
        <li>Password history recorded</li>
        <li>Temporary password change flag supported</li>
      </ul>
    </section>
  )
}
