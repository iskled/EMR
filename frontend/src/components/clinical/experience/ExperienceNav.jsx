export const EXPERIENCE_TABS = [
  ['overview', 'Overview'],
  ['chart', 'Chart'],
  ['note', 'Clinical Note'],
  ['recall', 'Recall'],
  ['images', 'Images'],
  ['timeline', 'Timeline'],
]

export default function ExperienceNav({ active, onChange }) {
  return (
    <nav aria-label="Clinical workspace" className="overflow-x-auto">
      <div className="flex min-w-max items-center gap-1 rounded-full bg-slate-100 p-1">
        {EXPERIENCE_TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-current={active === value ? 'page' : undefined}
            onClick={() => onChange(value)}
            className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 ${
              active === value
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:bg-white/60 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
