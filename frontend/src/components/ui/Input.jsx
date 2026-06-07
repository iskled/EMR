export default function Input({
  label,
  error,
  required = false,
  disabled = false,
  className = '',
  textarea = false,
  ...props
}) {

  const baseClasses =
    'w-full border rounded-xl px-4 py-3 transition focus:outline-none focus:ring-2'

  const normalClasses =
    'border-gray-300 focus:ring-blue-500'

  const errorClasses =
    'border-red-500 focus:ring-red-500'

  const disabledClasses =
    'bg-gray-100 cursor-not-allowed'

  const classes = `
    ${baseClasses}
    ${error ? errorClasses : normalClasses}
    ${disabled ? disabledClasses : ''}
    ${className}
  `

  return (
    <div className="space-y-2">

      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}

          {required && (
            <span className="text-red-500 ml-1">
              *
            </span>
          )}
        </label>
      )}

      {textarea ? (
        <textarea
          disabled={disabled}
          className={classes}
          {...props}
        />
      ) : (
        <input
          disabled={disabled}
          className={classes}
          {...props}
        />
      )}

      {error && (
        <p className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}