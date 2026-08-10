import { useId } from 'react'

export default function Select({ label, options = [], error, required = false, className = '', id, ...props }) {
  const generatedId = useId()
  const controlId = id || generatedId
  return (<div className='space-y-2'>{label && <label htmlFor={controlId} className='block text-sm font-medium text-gray-700'>{label}{required && <span className='text-red-500 ml-1'>*</span>}</label>}<select id={controlId} className={`w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props}>{options.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}</select>{error && <p className='text-sm text-red-500'>{error}</p>}</div>)
}
