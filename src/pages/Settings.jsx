import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Users, Plus, Edit2, Trash2, Shield, X, Check } from 'lucide-react'

export default function Settings() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'kasir'
  })
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('username')
      
      if (!error) setUsers(data || [])
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
      if (editingUser) {
        // Update user
        const { error } = await supabase
          .from('users')
          .update({
            username: formData.username,
            email: formData.email,
            role: formData.role
          })
          .eq('id', editingUser.id)
        
        if (error) throw error
        setMessage({ type: 'success', text: 'User berhasil diupdate' })
      } else {
        // Create user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { username: formData.username, role: formData.role }
          }
        })
        
        if (authError) throw authError
        
        // Insert ke tabel users
        const { error: dbError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            username: formData.username,
            email: formData.email,
            role: formData.role,
            password_hash: 'hashed_by_supabase'
          })
        
        if (dbError) throw dbError
        setMessage({ type: 'success', text: 'User berhasil ditambahkan' })
      }
      
      setShowForm(false)
      setEditingUser(null)
      setFormData({ username: '', email: '', password: '', role: 'kasir' })
      loadUsers()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  async function deleteUser(userId) {
    if (!confirm('Yakin ingin menghapus user ini?')) return
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
      
      if (error) throw error
      setMessage({ type: 'success', text: 'User berhasil dihapus' })
      loadUsers()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  function handleEdit(user) {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role
    })
    setShowForm(true)
  }

  const roleBadge = (role) => {
    const colors = {
      owner: 'bg-[#0058A3] text-white',
      kasir: 'bg-blue-100 text-[#0058A3]',
      gudang: 'bg-gray-100 text-gray-700'
    }
    return (
      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${colors[role] || colors.kasir}`}>
        {role.toUpperCase()}
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
          <h2 className="text-2xl font-bold text-gray-900">Pengaturan</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manajemen user & hak akses</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null)
            setFormData({ username: '', email: '', password: '', role: 'kasir' })
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Tambah User</span>
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
                {editingUser ? 'Edit User' : 'Tambah User Baru'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] focus:border-transparent outline-none"
                  placeholder="Nama pengguna"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] focus:border-transparent outline-none"
                  placeholder="email@fancell.com"
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] focus:border-transparent outline-none"
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role / Hak Akses</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] focus:border-transparent outline-none bg-white"
                >
                  <option value="owner">Owner (Akses Penuh)</option>
                  <option value="kasir">Kasir (Transaksi & Stok)</option>
                  <option value="gudang">Gudang (Master Barang Saja)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.role === 'owner' && 'Akses semua modul termasuk Laba Rugi & Pengaturan'}
                  {formData.role === 'kasir' && 'Akses POS, Riwayat, Master Barang (tidak bisa lihat Laba Rugi)'}
                  {formData.role === 'gudang' && 'Hanya bisa kelola Master Barang & Stok'}
                </p>
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
                  {editingUser ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table User */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hak Akses</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-[#0058A3] to-[#004080] rounded-full flex items-center justify-center font-bold text-white text-sm">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{user.username}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                  <td className="py-3 px-4">{roleBadge(user.role)}</td>
                  <td className="py-3 px-4 text-xs text-gray-500">
                    {user.role === 'owner' && 'Semua modul'}
                    {user.role === 'kasir' && 'POS, Riwayat, Barang'}
                    {user.role === 'gudang' && 'Master Barang saja'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-[#0058A3]"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
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
