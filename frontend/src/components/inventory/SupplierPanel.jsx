import { useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { createInventoryCategory, createInventoryLocation, createSupplier } from '../../services/inventory.service'

export default function SupplierPanel({ suppliers = [], categories = [], locations = [], onChanged }) {
  const [supplier, setSupplier] = useState({ name: '', phone: '', email: '', contact_person: '' })
  const [category, setCategory] = useState({ name: '', code: '' })
  const [location, setLocation] = useState({ name: '', code: '' })

  async function addSupplier(event) {
    event.preventDefault()
    if (!supplier.name) return
    await createSupplier(supplier)
    setSupplier({ name: '', phone: '', email: '', contact_person: '' })
    await onChanged?.()
  }

  async function addCategory(event) {
    event.preventDefault()
    if (!category.name || !category.code) return
    await createInventoryCategory(category)
    setCategory({ name: '', code: '' })
    await onChanged?.()
  }

  async function addLocation(event) {
    event.preventDefault()
    if (!location.name || !location.code) return
    await createInventoryLocation(location)
    setLocation({ name: '', code: '' })
    await onChanged?.()
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <form onSubmit={addSupplier} className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="font-semibold">Suppliers</h3>
        <div className="mt-3 space-y-3">
          <Input label="Supplier name" value={supplier.name} onChange={e => setSupplier({ ...supplier, name: e.target.value })} />
          <Input label="Contact person" value={supplier.contact_person} onChange={e => setSupplier({ ...supplier, contact_person: e.target.value })} />
          <Input label="Phone" value={supplier.phone} onChange={e => setSupplier({ ...supplier, phone: e.target.value })} />
          <Input label="Email" value={supplier.email} onChange={e => setSupplier({ ...supplier, email: e.target.value })} />
          <Button type="submit">Add Supplier</Button>
          <p className="text-sm text-gray-500">{suppliers.length} suppliers</p>
        </div>
      </form>
      <form onSubmit={addCategory} className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="font-semibold">Categories</h3>
        <div className="mt-3 space-y-3">
          <Input label="Name" value={category.name} onChange={e => setCategory({ ...category, name: e.target.value })} />
          <Input label="Code" value={category.code} onChange={e => setCategory({ ...category, code: e.target.value })} />
          <Button type="submit">Add Category</Button>
          <p className="text-sm text-gray-500">{categories.length} categories</p>
        </div>
      </form>
      <form onSubmit={addLocation} className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="font-semibold">Locations</h3>
        <div className="mt-3 space-y-3">
          <Input label="Name" value={location.name} onChange={e => setLocation({ ...location, name: e.target.value })} />
          <Input label="Code" value={location.code} onChange={e => setLocation({ ...location, code: e.target.value })} />
          <Button type="submit">Add Location</Button>
          <p className="text-sm text-gray-500">{locations.length} locations</p>
        </div>
      </form>
    </div>
  )
}
