import { useEffect, useMemo, useState } from 'react'
import UserDrawer from '../components/users/UserDrawer'
import UserFilters from '../components/users/UserFilters'
import UserMetrics from '../components/users/UserMetrics'
import UserModal from '../components/users/UserModal'
import UserTable from '../components/users/UserTable'
import {
  activateUser,
  createUser,
  deactivateUser,
  forcePasswordChange,
  getUserAuditHistory,
  getUserMetrics,
  getUserPermissionMatrix,
  getUserSecurityHistory,
  getUsers,
  resetFailedLogins,
  resetUserPassword,
  revokeUserSessions,
  unlockUser,
  unwrapList,
  updateUser,
} from '../services/users.service'

const initialFilters = {
  search: '',
  role: '',
  is_active: '',
  locked: '',
}

export default function UserManagementPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [users, setUsers] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [matrix, setMatrix] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [securityHistory, setSecurityHistory] = useState(null)
  const [auditHistory, setAuditHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')), [filters])

  useEffect(() => {
    loadUsers()
  }, [params])

  useEffect(() => {
    getUserPermissionMatrix().then(setMatrix).catch(() => setMatrix([]))
  }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      setError('')
      const [userData, metricData] = await Promise.all([getUsers(params), getUserMetrics()])
      const userList = unwrapList(userData)
      setUsers(userList)
      setMetrics(metricData)
      if (selectedUser) {
        const refreshed = userList.find(user => user.id === selectedUser.id)
        setSelectedUser(refreshed || null)
      }
    } catch {
      setError('Unable to load users.')
    } finally {
      setLoading(false)
    }
  }

  async function openDrawer(user) {
    setSelectedUser(user)
    const [security, audit] = await Promise.all([
      getUserSecurityHistory(user.id),
      getUserAuditHistory(user.id),
    ])
    setSecurityHistory(security)
    setAuditHistory(audit)
  }

  function openCreate() {
    setEditingUser(null)
    setShowModal(true)
  }

  function openEdit(user) {
    setEditingUser(user)
    setShowModal(true)
  }

  async function saveUser(user, payload) {
    if (user) await updateUser(user.id, payload)
    else await createUser(payload)
    setShowModal(false)
    setEditingUser(null)
    await loadUsers()
  }

  async function runAction(user, action) {
    if (action === 'activate') await activateUser(user.id)
    if (action === 'deactivate') await deactivateUser(user.id)
    if (action === 'unlock') await unlockUser(user.id)
    if (action === 'resetFailed') await resetFailedLogins(user.id)
    if (action === 'forcePassword') await forcePasswordChange(user.id)
    if (action === 'revokeSessions') await revokeUserSessions(user.id)
    await loadUsers()
    const refreshed = users.find(item => item.id === user.id) || user
    await openDrawer(refreshed)
  }

  async function passwordReset(user, payload) {
    await resetUserPassword(user.id, payload)
    await loadUsers()
    await openDrawer(user)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Administration</h1>
          <p className="text-sm text-gray-500">Manage staff accounts, roles, lockouts, temporary passwords, and security history.</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">New user</button>
      </div>
      <UserMetrics metrics={metrics} />
      <UserFilters filters={filters} onChange={setFilters} onReset={() => setFilters(initialFilters)} />
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
      {loading ? <div className="rounded-lg border bg-white p-10 text-center text-gray-500">Loading users...</div> : <UserTable users={users} onOpen={openDrawer} onEdit={openEdit} />}
      {showModal && <UserModal user={editingUser} onClose={() => setShowModal(false)} onSave={saveUser} />}
      <UserDrawer
        user={selectedUser}
        matrix={matrix}
        securityHistory={securityHistory}
        auditHistory={auditHistory}
        onClose={() => setSelectedUser(null)}
        onEdit={openEdit}
        onAction={runAction}
        onPasswordReset={passwordReset}
      />
    </div>
  )
}
