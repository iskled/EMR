import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import { createPatient } from "../../services/patients.service";

const emptyForm = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "",
  phone_primary: "",
  phone_secondary: "",
  email: "",
  address_line1: "",
  nationality: "Nigerian",
  occupation: "",
  emergency_contact_name: "",
  emergency_contact_relationship: "",
  emergency_contact_phone: "",
  referral_source: "",
  preferred_reminder_method: "",
};

export default function PatientIntakeModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState(emptyForm),
    [errors, setErrors] = useState({}),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setErrors({});
    }
  }, [isOpen]);
  const update = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({
      ...current,
      [name]: undefined,
      non_field_errors: undefined,
    }));
  };
  const message = (name) =>
    Array.isArray(errors[name]) ? errors[name].join(" ") : errors[name];
  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setErrors({});
    setSaving(true);
    try {
      const patient = await createPatient(form);
      await onSuccess?.(patient);
      onClose();
    } catch (error) {
      const detail = error.response?.data;
      setErrors(
        detail && typeof detail === "object"
          ? detail
          : {
              non_field_errors: [
                "Patient could not be created. Please try again.",
              ],
            },
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? undefined : onClose}
      title="Register Patient"
    >
      <form
        onSubmit={submit}
        className="max-h-[75vh] space-y-5 overflow-y-auto pr-1"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Date of birth"
            required
            type="date"
            name="date_of_birth"
            value={form.date_of_birth}
            onChange={update}
            error={message("date_of_birth")}
          />
          <Input
            label="First name"
            required
            name="first_name"
            value={form.first_name}
            onChange={update}
            error={message("first_name")}
          />
          <Input
            label="Last name"
            required
            name="last_name"
            value={form.last_name}
            onChange={update}
            error={message("last_name")}
          />
          <Select
            label="Gender"
            required
            name="gender"
            value={form.gender}
            onChange={update}
            error={message("gender")}
            options={[
              { value: "", label: "Select gender" },
              { value: "M", label: "Male" },
              { value: "F", label: "Female" },
              { value: "O", label: "Other" },
            ]}
          />
          <Input
            label="Phone"
            required
            name="phone_primary"
            value={form.phone_primary}
            onChange={update}
            error={message("phone_primary")}
          />
          <Input
            label="Email"
            type="email"
            name="email"
            value={form.email}
            onChange={update}
            error={message("email")}
          />
          <Input label="Secondary phone" name="phone_secondary" value={form.phone_secondary} onChange={update}/>
          <Input
            label="Address"
            name="address_line1"
            value={form.address_line1}
            onChange={update}
          />
          <Input
            label="Nationality"
            name="nationality"
            value={form.nationality}
            onChange={update}
          />
          <Input
            label="Occupation"
            name="occupation"
            value={form.occupation}
            onChange={update}
          />
          <Input
            label="Emergency contact"
            name="emergency_contact_name"
            value={form.emergency_contact_name}
            onChange={update}
          />
          <Input
            label="Emergency phone"
            name="emergency_contact_phone"
            value={form.emergency_contact_phone}
            onChange={update}
          />
          <Input label="Emergency relationship" name="emergency_contact_relationship" value={form.emergency_contact_relationship} onChange={update}/>
          <Select label="Referral source" name="referral_source" value={form.referral_source} onChange={update} options={[{value:'',label:'Not specified'},...['facebook','passing_by','instagram','google','friends','others'].map(value=>({value,label:value.replaceAll('_',' ')}))]}/>
          <Select label="Preferred communication" name="preferred_reminder_method" value={form.preferred_reminder_method} onChange={update} options={[{value:'',label:'Not specified'},...['sms','whatsapp','call','email'].map(value=>({value,label:value}))]}/>
        </div>
        {message("non_field_errors") && (
          <p
            role="alert"
            className="rounded bg-red-50 p-3 text-sm text-red-700"
          >
            {message("non_field_errors")}
          </p>
        )}
        <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white pt-4">
          <Button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Registering…" : "Register Patient"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
