import { useEffect, useState } from 'react'
import { getClinicalTemplates } from '../services/clinical.service'

export default function SettingsPage() {
  const [templates, setTemplates] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadTemplates() {
    try {
      setLoading(true)
      const data = await getClinicalTemplates({ search })
      setTemplates(data)
    } catch (error) {
      console.error(error)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadTemplates, 300)

    return () => clearTimeout(timeout)
  }, [search])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <input
        className="border p-3 rounded w-full"
        placeholder="Search templates"
        value={search}
        onChange={event => setSearch(event.target.value)}
      />

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full bg-white shadow rounded">
          <thead>
            <tr className="border-b">
              <th className="p-3">Type</th>
              <th className="p-3">Label</th>
              <th className="p-3">Source</th>
              <th className="p-3">Usage</th>
            </tr>
          </thead>
          <tbody>
            {templates.map(template => (
              <tr key={template.id} className="border-b">
                <td className="p-3">{template.template_type}</td>
                <td className="p-3">{template.label}</td>
                <td className="p-3">{template.source}</td>
                <td className="p-3">{template.usage_count}</td>
              </tr>
            ))}

            {templates.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  No clinical templates found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
