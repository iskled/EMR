export default function EmptyState({
  title = 'No data available',
}) {
  return (
    <div className="text-center py-12 text-gray-500">
      <p>{title}</p>
    </div>
  )
}