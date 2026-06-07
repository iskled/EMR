import React from 'react'

const teeth = [
  'UR8','UR7','UR6','UR5','UR4','UR3','UR2','UR1',
  'UL1','UL2','UL3','UL4','UL5','UL6','UL7','UL8',
  'LR8','LR7','LR6','LR5','LR4','LR3','LR2','LR1',
  'LL1','LL2','LL3','LL4','LL5','LL6','LL7','LL8',
]

export default function Odontogram({
  selectedTooth,
  onSelect,
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-4">
        Dental Chart
      </h3>

      <div className="grid grid-cols-8 gap-2">
        {teeth.map((tooth) => (
          <button
            key={tooth}
            onClick={() => onSelect(tooth)}
            className={`
              border rounded-lg p-3 text-sm
              ${
                selectedTooth === tooth
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50'
              }
            `}
          >
            {tooth}
          </button>
        ))}
      </div>
    </div>
  )
}