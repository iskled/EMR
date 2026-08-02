import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Select from "../ui/Select";
import { updatePatient } from "../../services/patients.service";
const fields = [
  "patient_code",
  "first_name",
  "last_name",
  "date_of_birth",
  "gender",
  "phone_primary",
  "phone_secondary",
  "email",
  "address_line1",
  "address_line2",
  "city",
  "state_province",
  "postal_code",
  "emergency_contact_name",
  "emergency_contact_relationship",
  "emergency_contact_phone",
  "nationality",
  "occupation",
  "referral_source",
  "preferred_reminder_method",
  "is_active",
];
export default function PatientEditModal({
  patient,
  isOpen,
  onClose,
  onUpdated,
}) {
  const [form, setForm] = useState({}),
    [errors, setErrors] = useState({}),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    if (patient)
      setForm(
        Object.fromEntries(
          fields.map((k) => [k, patient[k] ?? (k === "is_active" ? true : "")]),
        ),
      );
  }, [patient, isOpen]);
  const change = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    setErrors((x) => ({ ...x, [name]: undefined }));
  };
  const err = (k) =>
    Array.isArray(errors[k]) ? errors[k].join(" ") : errors[k];
  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      const updated = await updatePatient(patient.id, form);
      await onUpdated(updated);
      onClose();
    } catch (x) {
      setErrors(
        x.response?.data || {
          non_field_errors: "Patient could not be updated.",
        },
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit patient information">
      <form
        onSubmit={submit}
        className="max-h-[75vh] space-y-5 overflow-y-auto"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Patient code"
            name="patient_code"
            value={form.patient_code || ""}
            disabled
            readOnly
          />
          <Input
            required
            label="First name"
            name="first_name"
            value={form.first_name || ""}
            onChange={change}
            error={err("first_name")}
          />
          <Input
            required
            label="Last name"
            name="last_name"
            value={form.last_name || ""}
            onChange={change}
            error={err("last_name")}
          />
          <Input
            required
            type="date"
            label="Date of birth"
            name="date_of_birth"
            value={form.date_of_birth || ""}
            onChange={change}
            error={err("date_of_birth")}
          />
          <Select
            required
            label="Sex"
            name="gender"
            value={form.gender || ""}
            onChange={change}
            error={err("gender")}
            options={[
              { value: "M", label: "Male" },
              { value: "F", label: "Female" },
              { value: "O", label: "Other" },
            ]}
          />
          {[
            "phone_primary",
            "phone_secondary",
            "email",
            "address_line1",
            "address_line2",
            "city",
            "state_province",
            "postal_code",
            "emergency_contact_name",
            "emergency_contact_relationship",
            "emergency_contact_phone",
            "nationality",
            "occupation",
          ].map((k) => (
            <Input
              key={k}
              required={k === "phone_primary"}
              label={k.replaceAll("_", " ")}
              name={k}
              value={form[k] || ""}
              onChange={change}
              error={err(k)}
            />
          ))}
          <Select
            label="Referral source"
            name="referral_source"
            value={form.referral_source || ""}
            onChange={change}
            options={[
              { value: "", label: "Not specified" },
              ...[
                "facebook",
                "passing_by",
                "instagram",
                "google",
                "friends",
                "others",
              ].map((x) => ({ value: x, label: x.replaceAll("_", " ") })),
            ]}
          />
          <Select
            label="Preferred communication"
            name="preferred_reminder_method"
            value={form.preferred_reminder_method || ""}
            onChange={change}
            options={[
              { value: "", label: "Not specified" },
              ...["sms", "whatsapp", "call", "email"].map((x) => ({
                value: x,
                label: x,
              })),
            ]}
          />
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              name="is_active"
              checked={!!form.is_active}
              onChange={change}
            />
            Active patient
          </label>
        </div>
        {err("non_field_errors") && (
          <p className="text-red-700">{err("non_field_errors")}</p>
        )}
        <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white py-4">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
