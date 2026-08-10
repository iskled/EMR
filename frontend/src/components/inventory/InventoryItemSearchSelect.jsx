import { useEffect, useState } from 'react'
import { getInventoryItems } from '../../services/inventory.service'

export function itemSummary(item) {
  if (!item) return ''
  return `${item.sku || '-'} - ${item.current_stock ?? '0'} ${item.unit_of_measure || 'units'} available`
}

export default function InventoryItemSearchSelect({ onSelect, excludedIds = [] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [highlighted, setHighlighted] = useState(0)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      setError('')
      return undefined
    }
    let active = true
    const timeout = setTimeout(async () => {
      try {
        setLoading(true)
        setError('')
        const data = await getInventoryItems({ search: query })
        if (active) {
          const excluded = new Set(excludedIds.map(String))
          setResults(data.filter(item => !excluded.has(String(item.id))))
          setHighlighted(0)
        }
      } catch {
        if (active) setError('Unable to search inventory items.')
      } finally {
        if (active) setLoading(false)
      }
    }, 300)
    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [query, excludedIds])

  function choose(item) {
    onSelect?.(item)
    setQuery('')
    setResults([])
  }

  function handleKeyDown(event) {
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted(index => Math.min(index + 1, results.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted(index => Math.max(index - 1, 0))
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      choose(results[highlighted])
    }
  }

  return (
    <div className="relative space-y-2">
      <label className="block text-base font-semibold text-gray-800">Inventory Item</label>
      <input
        value={query}
        onChange={event => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search by item name, code, category, or supplier"
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
      />
      {loading && <p className="text-sm text-gray-500">Searching inventory...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && query.trim().length >= 2 && !results.length && <p className="text-sm text-gray-500">No inventory items found.</p>}
      {results.length > 0 && (
        <div className="absolute z-20 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
          {results.map((item, index) => (
            <button
              type="button"
              key={item.id}
              onMouseDown={event => event.preventDefault()}
              onClick={() => choose(item)}
              className={`block w-full px-4 py-3 text-left text-sm ${index === highlighted ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <span className="block font-semibold text-gray-900">{item.name}</span>
              <span className="text-gray-500">{itemSummary(item)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
