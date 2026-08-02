export default function LoginActivity({ attempts }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Login activity</h2>
      <div className="mt-4 overflow-hidden rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <tbody className="divide-y divide-gray-100">
            {attempts.map(item => (
              <tr key={item.id}>
                <td className="px-3 py-2">{new Date(item.created_at).toLocaleString()}</td>
                <td className="px-3 py-2">{item.email}</td>
                <td className={`px-3 py-2 font-semibold ${item.success ? 'text-green-700' : 'text-red-700'}`}>{item.success ? 'Success' : 'Failure'}</td>
                <td className="px-3 py-2">{item.failure_reason || '-'}</td>
              </tr>
            ))}
            {!attempts.length && <tr><td className="px-3 py-6 text-center text-gray-500">No login attempts recorded.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
