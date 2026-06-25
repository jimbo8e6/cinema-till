import { useState } from 'react'
import { useConcessionStore, useBasketStore, useSettingsStore } from '../store'
import { useConcessions } from '../hooks/useConcessions'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/utils'
import type { ConcessionItem } from '../types'

const CATEGORIES = ['Drinks', 'Snacks', 'Combos', 'Hot Food', 'Ice Cream', 'Other']

export function ConcessionsTab() {
  const { items, loading } = useConcessionStore()
  const addConcession = useBasketStore((s) => s.addConcession)
  const syncCode = useSettingsStore((s) => s.syncCode)
  const { reload } = useConcessions()
  const [managementMode, setManagementMode] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<ConcessionItem> | null>(null)
  const [saving, setSaving] = useState(false)

  const availableItems = managementMode ? items : items.filter((i) => i.is_available)
  const grouped = CATEGORIES.reduce<Record<string, ConcessionItem[]>>((acc, cat) => {
    const catItems = availableItems.filter((i) => i.category === cat)
    if (catItems.length) acc[cat] = catItems
    return acc
  }, {})
  // Any uncategorised items
  const otherCats = availableItems.filter((i) => !CATEGORIES.includes(i.category))
  if (otherCats.length) {
    grouped['Other'] = [...(grouped['Other'] ?? []), ...otherCats]
  }

  const saveItem = async () => {
    if (!editingItem?.name || !syncCode) return
    setSaving(true)
    if (editingItem.id) {
      await supabase
        .from('concession_items')
        .update({
          name: editingItem.name,
          price: editingItem.price ?? 0,
          category: editingItem.category ?? 'Other',
          is_available: editingItem.is_available ?? true,
        })
        .eq('id', editingItem.id)
    } else {
      await supabase.from('concession_items').insert({
        cinema_id: syncCode,
        name: editingItem.name,
        price: editingItem.price ?? 0,
        category: editingItem.category ?? 'Other',
        is_available: true,
      })
    }
    await reload()
    setSaving(false)
    setEditingItem(null)
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Remove this item?')) return
    await supabase.from('concession_items').delete().eq('id', id)
    await reload()
  }

  const toggleAvailable = async (item: ConcessionItem) => {
    await supabase
      .from('concession_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id)
    await reload()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading concessions...
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-gray-300 font-medium text-sm">
          {managementMode ? 'Management Mode' : 'Concessions'}
        </h2>
        <div className="flex gap-2">
          {managementMode && (
            <button
              onClick={() =>
                setEditingItem({ category: 'Snacks', is_available: true, price: 0 })
              }
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 rounded-lg"
            >
              + Add Item
            </button>
          )}
          <button
            onClick={() => setManagementMode((v) => !v)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              managementMode
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {managementMode ? 'Done' : 'Manage'}
          </button>
        </div>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2">
          <span className="text-3xl">🍿</span>
          <p className="text-sm">No concession items yet</p>
          <button
            onClick={() => {
              setManagementMode(true)
              setEditingItem({ category: 'Snacks', is_available: true, price: 0 })
            }}
            className="text-blue-400 text-sm underline"
          >
            Add your first item
          </button>
        </div>
      )}

      {Object.entries(grouped).map(([category, catItems]) => (
        <div key={category} className="mb-6">
          <h3 className="text-gray-500 text-xs uppercase tracking-wider mb-2 font-medium">
            {category}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {catItems.map((item) => (
              <div
                key={item.id}
                className={`relative bg-gray-800 border rounded-xl p-3 transition-all ${
                  item.is_available
                    ? 'border-gray-700 hover:border-blue-500 cursor-pointer active:bg-gray-700'
                    : 'border-gray-800 opacity-50'
                }`}
                onClick={() => {
                  if (managementMode) {
                    setEditingItem({ ...item })
                  } else if (item.is_available) {
                    addConcession(item, 1)
                  }
                }}
              >
                <p className="text-white text-sm font-medium leading-tight">{item.name}</p>
                <p className="text-blue-400 text-sm font-semibold mt-1">
                  {formatPrice(item.price)}
                </p>
                {managementMode && (
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleAvailable(item)
                      }}
                      className={`text-xs px-2 py-0.5 rounded ${
                        item.is_available
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-gray-700 text-gray-500'
                      }`}
                    >
                      {item.is_available ? 'Available' : 'Hidden'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteItem(item.id)
                      }}
                      className="text-xs px-2 py-0.5 rounded bg-red-900/40 text-red-400"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Edit/Add modal */}
      {editingItem && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setEditingItem(null)}
        >
          <div className="bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-5">
            <h3 className="text-white font-bold text-lg mb-4">
              {editingItem.id ? 'Edit Item' : 'Add Item'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Name</label>
                <input
                  type="text"
                  value={editingItem.name ?? ''}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev!, name: e.target.value }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Item name"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Price (£)</label>
                <input
                  type="number"
                  min="0"
                  step="0.10"
                  value={editingItem.price ?? ''}
                  onChange={(e) =>
                    setEditingItem((prev) => ({
                      ...prev!,
                      price: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Category</label>
                <select
                  value={editingItem.category ?? 'Other'}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev!, category: e.target.value }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2.5 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveItem}
                disabled={saving || !editingItem.name}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-2.5 rounded-lg"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
