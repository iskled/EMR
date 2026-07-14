import { useMemo } from "react";

const DAYS = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
];

export default function AppointmentCalendar({
    appointments = [],
    selectedDate,
    onDateChange,
    onAppointmentClick
}) {

    const today = useMemo(() => new Date(), []);

    const currentMonth = today.toLocaleString("default", {
        month: "long"
    });

    const currentYear = today.getFullYear();

    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    function appointmentsForDay(day) {

        return appointments.filter(a => {

            if (!a.scheduled_date) return false;

            return Number(a.scheduled_date.split("-")[2]) === day;

        });

    }

    return (

        <div className="bg-white rounded-xl shadow">

            <div className="flex justify-between items-center border-b p-5">

                <h2 className="text-xl font-semibold">

                    {currentMonth} {currentYear}

                </h2>

                <button
                    className="border rounded-lg px-4 py-2"
                    onClick={() => onDateChange?.(today)}
                >
                    Today
                </button>

            </div>

            <div className="grid grid-cols-7 border-b">

                {DAYS.map(day => (

                    <div
                        key={day}
                        className="text-center font-semibold py-3 bg-gray-50"
                    >
                        {day}
                    </div>

                ))}

            </div>

            <div className="grid grid-cols-7">

                {days.map(day => {

                    const dayAppointments = appointmentsForDay(day);

                    return (

                        <div
                            key={day}
                            className="
                                min-h-[140px]
                                border
                                p-2
                                hover:bg-blue-50
                            "
                        >

                            <div className="font-semibold mb-2">

                                {day}

                            </div>

                            <div className="space-y-1">

                                {dayAppointments.map(appt => (

                                    <button
                                        key={appt.id}
                                        onClick={() =>
                                            onAppointmentClick?.(appt)
                                        }
                                        className="
                                            w-full
                                            text-left
                                            text-xs
                                            rounded
                                            bg-blue-100
                                            px-2
                                            py-1
                                            hover:bg-blue-200
                                        "
                                    >

                                        {appt.start_time}

                                        <br />

                                        {appt.patient_name}

                                    </button>

                                ))}

                            </div>

                        </div>

                    );

                })}

            </div>

        </div>

    );

}