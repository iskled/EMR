import { useState } from "react";

import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";

import {
    createAppointment
} from "../../services/appointments.service";

export default function AppointmentModal({
    isOpen,
    onClose,
    onSaved
}) {

    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        patient: "",
        dentist: "",
        appointment_type: "",
        scheduled_date: "",
        start_time: "",
        duration: 30,
        notes: ""
    });

    function handleChange(e) {
        const { name, value } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {

            setLoading(true);

            await createAppointment(form);

            if (onSaved) {
                onSaved();
            }

            onClose();

        } catch (err) {

            console.error(err);

            alert("Unable to save appointment.");

        } finally {

            setLoading(false);

        }
    }

    return (

        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="New Appointment"
        >

            <form
                onSubmit={handleSubmit}
                className="space-y-4"
            >

                <Input
                    name="patient"
                    placeholder="Patient ID"
                    value={form.patient}
                    onChange={handleChange}
                />

                <Input
                    name="dentist"
                    placeholder="Dentist ID"
                    value={form.dentist}
                    onChange={handleChange}
                />

                <Input
                    name="appointment_type"
                    placeholder="Appointment Type"
                    value={form.appointment_type}
                    onChange={handleChange}
                />

                <Input
                    type="date"
                    name="scheduled_date"
                    value={form.scheduled_date}
                    onChange={handleChange}
                />

                <Input
                    type="time"
                    name="start_time"
                    value={form.start_time}
                    onChange={handleChange}
                />

                <Select
                    name="duration"
                    value={form.duration}
                    onChange={handleChange}
                >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                    <option value={90}>90 Minutes</option>
                </Select>

                <Input
                    name="notes"
                    placeholder="Notes"
                    value={form.notes}
                    onChange={handleChange}
                />

                <div className="flex justify-end gap-3">

                    <Button
                        type="button"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Save Appointment"}
                    </Button>

                </div>

            </form>

        </Modal>

    );

}