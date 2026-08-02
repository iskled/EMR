import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardMetrics from "../components/dashboard/DashboardMetrics";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton";
import DashboardWidgetError from "../components/dashboard/DashboardWidgetError";
import QuickActions from "../components/dashboard/QuickActions";
import RoleDashboard from "../components/dashboard/RoleDashboard";
import PatientIntakeModal from "../components/patients/PatientIntakeModal";
import AppointmentModal from "../components/appointments/AppointmentModal";
import StockUsageModal from "../components/inventory/StockUsageModal";
import TaskModal from "../components/tasks/TaskModal";
import { hasPermission } from "../permissions/permissions";
import { getDashboard } from "../services/dashboard.service";
import { getPatients } from "../services/patients.service";
import {
  getAppointmentTypes,
  getDentists,
} from "../services/appointments.service";
import {
  getInventoryBatches,
  getInventoryItems,
} from "../services/inventory.service";
import { createTask } from "../services/tasks.service";
import { getUsers } from "../services/users.service";
const permissions = [
  "patients.write",
  "appointments.write",
  "inventory.usage",
  "tasks.write",
];
export default function DashboardPage() {
  const { user, initializing = true } = useAuth() || {},
    [data, setData] = useState(null),
    [error, setError] = useState(false),
    [refreshing, setRefreshing] = useState(true),
    [action, setAction] = useState(null),
    [refs, setRefs] = useState({
      patients: [],
      dentists: [],
      types: [],
      items: [],
      batches: [],
      staff: [],
    });
  const load = useCallback(async () => {
    setRefreshing(true);
    setError(false);
    try {
      setData(await getDashboard());
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    if (!initializing && user) load();
  }, [initializing, user, load]);
  async function openAction(next) {
    setAction(next);
    try {
      const [p, d, t, i, b, s] = await Promise.all([
        getPatients(),
        getDentists(),
        getAppointmentTypes(),
        getInventoryItems(),
        getInventoryBatches(),
        getUsers(),
      ]);
      setRefs({
        patients: p.results || p || [],
        dentists: d,
        types: t,
        items: i.results || i || [],
        batches: b.results || b || [],
        staff: s.results || s || [],
      });
    } catch {}
  }
  const close = () => setAction(null);
  if (initializing || (!data && refreshing)) return <DashboardSkeleton />;
  if (!data && error) return <DashboardWidgetError onRetry={load} />;
  if (!user || !data)
    return (
      <div className="rounded-xl bg-white p-8">
        Dashboard data is unavailable.
      </div>
    );
  const capabilities =
    data.capabilities ||
    Object.fromEntries(permissions.map((p) => [p, hasPermission(user, p)]));
  const dashboard = {
    ...data,
    capabilities,
    metrics: data.metrics || {},
    appointments: data.appointments || { total: 0, statuses: {}, items: [] },
    tasks: data.tasks || { items: [], open: 0 },
    recent_activity: data.recent_activity || [],
    widget_errors: data.widget_errors || {},
  };
  return (
    <div className="space-y-6">
      <DashboardHeader
        user={user}
        data={dashboard}
        refreshing={refreshing}
        onRefresh={load}
      />
      {error && <DashboardWidgetError onRetry={load} />}
      <QuickActions capabilities={capabilities} onAction={openAction} />
      <DashboardMetrics metrics={dashboard.metrics} />
      <RoleDashboard data={dashboard} onRetry={load} />
      <PatientIntakeModal
        isOpen={action === "patient"}
        onClose={close}
        onSuccess={async () => {
          close();
          await load();
        }}
      />
      <AppointmentModal
        isOpen={action === "appointment"}
        onClose={close}
        onSaved={async () => {
          close();
          await load();
        }}
        patients={refs.patients}
        dentists={refs.dentists}
        appointmentTypes={refs.types}
      />
      {action === "inventory" && (
          <StockUsageModal
            open
            item={refs.items[0]}
            items={refs.items}
            batches={refs.batches}
          onClose={close}
          onSaved={load}
        />
      )}{" "}
      {action === "task" && (
        <TaskModal
          task={null}
          staff={refs.staff}
          onClose={close}
          onSave={async (_, payload) => {
            await createTask(payload);
            close();
            await load();
          }}
        />
      )}
    </div>
  );
}
