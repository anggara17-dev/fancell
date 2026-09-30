import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Plus, Edit2, Trash2, X, Check, CreditCard } from 'lucide-react'

export default function MetodeBayar() {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMethod, setEditingMethod] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'cash',
    admin_fee_percentage: 0,
    admin_fee_fixed: 0,
    is_active: true
  })
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadMethods()
  }, [])

  async function loadMethods() {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('name')
      
      if (!error) setMethods(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    try {
      if (editingMethod) {
        const { error } = await supabase
          .from('payment_methods')
          .update({
            name: formData.name,
            type: formData.type,
            admin_fee_percentage: formData.admin_fee_percentage,
            admin_fee_fixed: formData.admin_fee_fixed,
            is_active: formData.is_active
          })
          .eq('id', editingMethod.id)
        
        if (error) throw error
        setMessage({ type: 'success', text: 'Metode pembayaran berhasil diupdate' })
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert({
            name: formData.name,
            type: formData.type,
            admin_fee_percentage: formData.admin_fee_percentage,
            admin_fee_fixed: formData.admin_fee_fixed,
            is_active: formData.is_active
          })
        
        if (error) throw error
        setMessage({ type: 'success', text: 'Metode pembayaran berhasil ditambahkan' })
      }
      
      setShowForm(false)
      setEditingMethod(null)
      setFormData({ name: '', type: 'cash', admin_fee_percentage: 0, admin_fee_fixed: 0, is_active: true })
      loadMethods()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  async function deleteMethod(id) {
    if (!confirm('Yakin ingin menghapus metode pembayaran ini?')) return
    
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      setMessage({ type: 'success', text: 'Metode pembayaran berhasil dihapus' })
      loadMethods()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const typeBadge = (type) => {
    const colors = {
      cash: 'bg-green-100 text-green-700',
      bank_transfer: 'bg-blue-100 text-blue-700',
      qris: 'bg-purple-100 text-purple-700',
      ewallet: 'bg-orange-100 text-orange-700',
      credit_card: 'bg-red-100 text-red-700'
    }
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
        {type.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin-slow"></div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Metode Pembayaran</h2>
          <p className="text-sm text-gray-500 mt-0.5">Kelola metode pembayaran yang tersedia</p>
        </div>
        <button
          onClick={() => {
            setEditingMethod(null)
            setFormData({ name: '', type: 'cash', admin_fee_percentage: 0, admin_fee_fixed: 0, is_active: true })
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Tambah Metode</span>
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm animate-fade-in ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {editingMethod ? 'Edit Metode Pembayaran' : 'Tambah Metode Baru'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Metode</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] focus:border-transparent outline-none"
                  placeholder="Contoh: QRIS, GoPay, Transfer BCA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] focus:border-transparent outline-none bg-white"
                >
                  <option value="cash">Tunai (Cash)</option>
                  <option value="bank_transfer">Transfer Bank</option>
                  <option value="qris">QRIS</option>
                  <option value="ewallet">E-Wallet</option>
                  <option value="credit_card">Kartu Kredit/Debit</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Fee (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.admin_fee_percentage}
                    onChange={(e) => setFormData({ ...formData, admin_fee_percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] focus:border-transparent outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Fee Tetap (Rp)</label>
                  <input
                    type="number"
                    value={formData.admin_fee_fixed}
                    onChange={(e) => setFormData({ ...formData, admin_fee_fixed: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] focus:border-transparent outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#0058A3] rounded focus:ring-[#0058A3]"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">Aktif</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {editingMethod ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fee (%)</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fee Tetap</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {methods.map((method) => (
                <tr key={method.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-[#0058A3]" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{method.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">{typeBadge(method.type)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{method.admin_fee_percentage}%</td>
                  <td className="py-3 px-4 text-sm text-gray-600">Rp {method.admin_fee_fixed.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${method.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {method.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingMethod(method)
                          setFormData({
                            name: method.name,
                            type: method.type,
                            admin_fee_percentage: method.admin_fee_percentage,
                            admin_fee_fixed: method.admin_fee_fixed,
                            is_active: method.is_active
                          })
                          setShowForm(true)
                        }}
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-[#0058A3]"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMethod(method.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
