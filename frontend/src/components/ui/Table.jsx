export default function Table({
  columns,
  data,
  renderRow,
}) {
  return (
    <div className="overflow-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="text-left px-4 py-3 font-semibold text-gray-600"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map(renderRow)}
        </tbody>
      </table>
    </div>
  )
}