export default function Modal({ isOpen, onClose, title, children, size = 'large' }) {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className={`bg-white rounded-2xl p-6 w-[92vw] ${size === 'compact' ? 'max-w-2xl' : 'max-w-6xl'}`}>
        <div className='flex justify-between mb-6'>
          <h2 className='text-xl font-bold'>{title}</h2>
          <button onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
