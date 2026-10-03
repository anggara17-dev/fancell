import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Confirm, Modal, RupiahInput, useToast, rp } from '../components/ui'
import { Plus, Edit2, Trash2, Check, CreditCard } from 'lucide-react'
const empty = { name:'', type:'cash', admin_fee_percentage:0, admin_fee_fixed:0, is_active:true }
const labels = { cash:'Tunai', bank_transfer:'Transfer Bank', qris:'QRIS', ewallet:'E-Wallet', credit_card:'Kartu Kredit/Debit' }
export default function MetodeBayar() {
  const toast = useToast()
  const [methods, setMethods] = useState([]); const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState(null); const [fd, setFd] = useState(empty)
  const [cf, setCf] = useState(null); const ask = (message, action) => setCf({ message, action })
  useEffect(() => { load() }, [])
  async function load() { const { data, error } = await supabase.from('payment_methods').select('*').order('name'); if (error) toast.error(error.message); setMethods(data || []); setLoading(false) }
  async function submit(e) {
    e.preventDefault(); const payload = { name: fd.name, type: fd.type, admin_fee_percentage: Number(fd.admin_fee_percentage) || 0, admin_fee_fixed: Number(fd.admin_fee_fixed) || 0, is_active: fd.is_active }
    try { if (editing) { const { error } = await supabase.from('payment_methods').update(payload).eq('id', editing.id); if (error) throw error; toast.success('Metode diupdate') } else { const { error } = await supabase.from('payment_methods').insert(payload); if (error) throw error; toast.success('Metode ditambahkan') } setShowForm(false); setEditing(null); setFd(empty); load() } catch (err) { toast.error(err.message) }
  }
  function del(id) { ask('Hapus metode pembayaran ini?', async () => { const { error } = await supabase.from('payment_methods').delete().eq('id', id); if (error) toast.error(error.message); else toast.success('Metode dihapus'); load() }) }
  function edit(m) { setEditing(m); setFd({ name: m.name, type: m.type, admin_fee_percentage: m.admin_fee_percentage, admin_fee_fixed: m.admin_fee_fixed, is_active: m.is_active }); setShowForm(true) }
  function add() { setEditing(null); setFd(empty); setShowForm(true) }
  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <div className="p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6"><div><h2 className="text-2xl font-bold text-gray-900">Metode Pembayaran</h2><p className="text-sm text-gray-500 mt-0.5">Kelola metode & biaya admin</p></div><button onClick={add} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm"><Plus className="w-4 h-4"/><span className="text-sm font-medium">Tambah Metode</span></button></div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Metode' : 'Tambah Metode Baru'} footer={
        <div className="flex gap-3"><button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Batal</button><button form="pmForm" type="submit" className="flex-1 px-4 py-2.5 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4"/>{editing ? 'Update' : 'Simpan'}</button></div>
      }>
        <form id="pmForm" onSubmit={submit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Metode</label><input type="text" required value={fd.name} onChange={e => setFd({ ...fd, name: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#0058A3] outline-none" placeholder="Contoh: QRIS, GoPay"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe</label><select value={fd.type} onChange={e => setFd({ ...fd, type: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg bg-white"><option value="cash">Tunai (Cash)</option><option value="bank_transfer">Transfer Bank</option><option value="qris">QRIS</option><option value="ewallet">E-Wallet</option><option value="credit_card">Kartu Kredit/Debit</option></select></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1.5">Fee (%)</label><input type="number" step="0.01" value={fd.admin_fee_percentage} onChange={e => setFd({ ...fd, admin_fee_percentage: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none" placeholder="0.00"/></div><div><label className="block text-sm font-medium text-gray-700 mb-1.5">Fee Tetap (Rp)</label><RupiahInput value={fd.admin_fee_fixed} onChange={x => setFd({ ...fd, admin_fee_fixed: x })} className="w-full px-4 py-2.5 border rounded-lg outline-none text-right" placeholder="0"/></div></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="act" checked={fd.is_active} onChange={e => setFd({ ...fd, is_active: e.target.checked })} className="w-4 h-4 accent-[#0058A3]"/><label htmlFor="act" className="text-sm text-gray-700">Aktif</label></div>
        </form>
      </Modal>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">Nama</th><th className="text-left p-3">Tipe</th><th className="text-left p-3">Fee (%)</th><th className="text-left p-3">Fee Tetap</th><th className="text-left p-3">Status</th><th className="text-right p-3">Aksi</th></tr></thead>
        <tbody className="divide-y">{methods.map(m => (<tr key={m.id} className="hover:bg-gray-50"><td className="p-3"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center"><CreditCard className="w-5 h-5 text-[#0058A3]"/></div><span className="text-sm font-medium">{m.name}</span></div></td><td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-gray-100">{labels[m.type] || m.type}</span></td><td className="p-3 text-sm text-gray-600">{m.admin_fee_percentage}%</td><td className="p-3 text-sm text-gray-600">{rp(m.admin_fee_fixed)}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{m.is_active ? 'Aktif' : 'Nonaktif'}</span></td><td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => edit(m)} className="p-1.5 hover:bg-blue-50 rounded text-[#0058A3]"><Edit2 className="w-4 h-4"/></button><button onClick={() => del(m.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4"/></button></div></td></tr>))}</tbody></table></div></div>
      <Confirm open={!!cf} danger message={cf?.message} confirmText="Ya, Hapus" onClose={() => setCf(null)} onConfirm={async () => { const a = cf.action; setCf(null); await a() }}/>
    </div>
  )
}
