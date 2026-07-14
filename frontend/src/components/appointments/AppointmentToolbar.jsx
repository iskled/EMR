export default function AppointmentToolbar({
    onNew,
    onRefresh,
    search,
    setSearch
}) {

    return (

        <div className="bg-white rounded-xl shadow p-4 flex justify-between items-center">

            <input
                className="border rounded-lg px-3 py-2 w-80"
                placeholder="Search patient..."
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
            />

            <div className="flex gap-3">

                <button
                    onClick={onRefresh}
                    className="bg-gray-200 px-4 py-2 rounded-lg"
                >
                    Refresh
                </button>

                <button
                    onClick={onNew}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg"
                >
                    New Appointment
                </button>

            </div>

        </div>

    )

}