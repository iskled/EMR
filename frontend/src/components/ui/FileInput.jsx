export default function FileInput({
  label,
  error,
  ...props
}) {
  return (
    <div className="space-y-2">

      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <input
        type="file"
        className="
          w-full border border-gray-300
          rounded-xl px-4 py-3 bg-white
        "
        {...props}
      />

      {error && (
        <p className="text-sm text-red-500">
          {error}
        </p>
      )}

    </div>
  )
}