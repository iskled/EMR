import { useEffect, useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import { issueStock } from "../../services/inventory.service";

export default function StockUsageModal({
  open,
  item,
  items = [],
  batches = [],
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  useEffect(() => {
    if (open)
      setForm({
        item: item?.id || "",
        batch: "",
        quantity: 1,
        patient_id: "",
        appointment_id: "",
        clinical_note_id: "",
        orthodontic_visit_id: "",
        reason: "",
      });
  }, [open, item]);
  if (!open) return null;
  async function submit(event) {
    event.preventDefault();
    try {
      await issueStock({
        ...form,
        batch: form.batch || null,
        patient_id: form.patient_id || null,
        appointment_id: form.appointment_id || null,
        clinical_note_id: form.clinical_note_id || null,
        orthodontic_visit_id: form.orthodontic_visit_id || null,
      });
      await onSaved?.();
      onClose?.();
    } catch {
      setError("Unable to issue stock. Check stock level and required reason.");
    }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4">
      <div className="mx-auto max-h-[92vh] w-[92vw] max-w-6xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
        <div className="mb-4 flex justify-between">
          <h2 className="text-xl font-bold">Record Stock Usage</h2>
          <button onClick={onClose}>x</button>
        </div>
        {error && (
          <p className="mb-3 rounded bg-red-50 p-3 text-red-800">{error}</p>
        )}
        <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
          {items.length > 0 && (
            <Select
              label="Inventory item"
              value={form.item || ""}
              onChange={(e) =>
                setForm({ ...form, item: e.target.value, batch: "" })
              }
              options={[
                { value: "", label: "Select inventory item" },
                ...items.map((entry) => ({
                  value: entry.id,
                  label: entry.name,
                })),
              ]}
              required
            />
          )}
          <Select
            label="Batch"
            value={form.batch || ""}
            onChange={(e) => setForm({ ...form, batch: e.target.value })}
            options={[
              { value: "", label: "Auto-select FEFO" },
              ...batches
                .filter((b) => String(b.item) === String(form.item))
                .map((b) => ({
                  value: b.id,
                  label: `${b.batch_number} (${b.quantity_remaining})`,
                })),
            ]}
          />
          <Input
            label="Quantity"
            type="number"
            value={form.quantity || ""}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            required
          />
          <Input
            label="Patient ID"
            value={form.patient_id || ""}
            onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
          />
          <Input
            label="Appointment ID"
            value={form.appointment_id || ""}
            onChange={(e) =>
              setForm({ ...form, appointment_id: e.target.value })
            }
          />
          <Input
            label="Clinical note ID"
            value={form.clinical_note_id || ""}
            onChange={(e) =>
              setForm({ ...form, clinical_note_id: e.target.value })
            }
          />
          <Input
            label="Orthodontic visit ID"
            value={form.orthodontic_visit_id || ""}
            onChange={(e) =>
              setForm({ ...form, orthodontic_visit_id: e.target.value })
            }
          />
          <Input
            label="Reason"
            textarea
            rows={2}
            value={form.reason || ""}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            required
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button type="submit">Record Usage</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
