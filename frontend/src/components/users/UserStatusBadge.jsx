export default function UserStatusBadge({ user }) {
  const label = user.is_locked ? 'Locked' : user.is_active ? 'Active' : 'Inactive'
  const styles = user.is_locked
    ? 'bg-red-100 text-red-700'
    : user.is_active
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700'

  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles}`}>{label}</span>
}
