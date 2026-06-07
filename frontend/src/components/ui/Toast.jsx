export default function Toast({
  message,
  type = 'success',
}) {
  return (
    <div
      className={`
        fixed top-6 right-6 z-50
        px-4 py-3 rounded-xl shadow-lg
        text-white font-medium
        animate-pulse

        ${type === 'success'
          ? 'bg-green-600'
          : 'bg-red-600'}
      `}
    >
      {message}
    </div>
  )
}