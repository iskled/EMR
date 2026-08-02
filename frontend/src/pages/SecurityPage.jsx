import { useEffect, useState } from 'react'
import AccountLockoutPanel from '../components/security/AccountLockoutPanel'
import LoginActivity from '../components/security/LoginActivity'
import PasswordPolicyPanel from '../components/security/PasswordPolicyPanel'
import RolePermissionMatrix from '../components/security/RolePermissionMatrix'
import SecurityAlerts from '../components/security/SecurityAlerts'
import SecurityDashboard from '../components/security/SecurityDashboard'
import SessionSettingsPanel from '../components/security/SessionSettingsPanel'
import { getLoginAttempts } from '../services/audit.service'
import {
  acknowledgeSecurityAlert,
  getPermissionMatrix,
  getSecurityAlerts,
  getSecurityDashboard,
  resolveSecurityAlert,
} from '../services/security.service'

export default function SecurityPage() {
  const [dashboard, setDashboard] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [attempts, setAttempts] = useState([])
  const [matrix, setMatrix] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSecurity()
  }, [])

  async function loadSecurity() {
    try {
      setLoading(true)
      setError('')
      const [dashboardData, alertsData, attemptsData, matrixData] = await Promise.all([
        getSecurityDashboard(),
        getSecurityAlerts({ status: 'open' }),
        getLoginAttempts(),
        getPermissionMatrix(),
      ])
      setDashboard(dashboardData)
      setAlerts(alertsData)
      setAttempts(attemptsData)
      setMatrix(matrixData)
    } catch {
      setError('Unable to load security dashboard.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAcknowledge(alert) {
    await acknowledgeSecurityAlert(alert.id)
    await loadSecurity()
  }

  async function handleResolve(alert) {
    await resolveSecurityAlert(alert.id)
    await loadSecurity()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Security</h1>
        <p className="text-sm text-gray-500">Authentication controls, alerts, login activity, and role permissions.</p>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
      {loading ? (
        <div className="rounded-lg border bg-white p-10 text-center text-gray-500">Loading security dashboard...</div>
      ) : (
        <>
          <SecurityDashboard data={dashboard} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <PasswordPolicyPanel />
            <SessionSettingsPanel />
            <AccountLockoutPanel dashboard={dashboard} />
          </div>
          <SecurityAlerts alerts={alerts} onAcknowledge={handleAcknowledge} onResolve={handleResolve} />
          <LoginActivity attempts={attempts} />
          <RolePermissionMatrix permissions={matrix} />
        </>
      )}
    </div>
  )
}
