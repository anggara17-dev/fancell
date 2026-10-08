import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import { Confirm, Modal, RupiahInput, useToast, rp } from '../components/ui'
import { Wallet, TrendingUp, TrendingDown, Plus, Check, History, Edit2, Trash2 } from 'lucide-react'
export default function KeuntunganModal() {
  const toast = useToast()
  const [data, setData] = useState({ modal: 0, keuntungan: 0, prive: 0, saldo: 0 })
  const [rows, setRows] = useState([]); const [load, setLoad] = useState(true)
  const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState(null)
  const [fd, setFd] = useState({ type: 'capital_in', amount: 0, description: '', date: new Date().toISOString().slice(0, 10) })
  const [cf, setCf] = useState(null); const ask = (message, action) => setCf({ message, action })
  useEffect(() => { run() }, [])
  async function run() {
    const [cap, tx] = await Promise.all([
      supabase.from('capital_transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('transactions').select('total_amount, transaction_items(hpp_at_sale,qty), payments(admin_fee)').eq('payment_status', 'paid')
    ])
    let modal = 0, prive = 0; (cap.data || []).forEach(c => { if (c.type === 'capital_in') modal += +c.amount || 0; else prive += +c.amount || 0 })
    let rev = 0, hpp = 0, fee = 0; (tx.data || []).forEach(t => { rev += +t.total_amount || 0; (t.transaction_items || []).forEach(i => hpp += (+i.hpp_at_sale || 0) * (i.qty || 1)); (t.payments || []).forEach(p => fee += +p.admin_fee || 0) })
    // HPP barang konsinyasi sudah mencakup harga titipan ke mitra — laba otomatis benar
    const keuntungan = rev - hpp - fee
    setData({ modal, keuntungan, prive, saldo: modal + keuntungan - prive })
    setRows(cap.data || []); setLoad(false)
  }
  function add() { setEditing(null); setFd({ type: 'capital_in', amount: 0, description: '', date: new Date().toISOString().slice(0, 10) }); setShowForm(true) }
  function editRow(c) { setEditing(c); setFd({ type: c.type, amount: +c.amount || 0, description: c.description || '', date: c.date || new Date().toISOString().slice(0, 10) }); setShowForm(true) }
  async function submit(e) {
    e.preventDefault(); if (!fd.amount) return toast.error('Nominal wajib diisi')
    try {
      const payload = { type: fd.type, amount: Number(fd.amount) || 0, description: fd.description, date: fd.date }
      if (editing) { const { error } = await supabase.from('capital_transactions').update(payload).eq('id', editing.id); if (error) throw error; toast.success('Catatan diupdate') }
      else { const { error } = await supabase.from('capital_transactions').insert(payload); if (error) throw error; toast.success('Tercatat') }
      setShowForm(false); setEditing(null); run()
    } catch (err) { toast.error(err.message) }
  }
  function del(c) { ask(`Hapus catatan ${c.type === 'capital_in' ? 'modal' : 'prive'} ini? Saldo akan dihitung ulang otomatis.`, async () => { const { error } = await supabase.from('capital_transactions').delete().eq('id', c.id); if (error) toast.error(error.message); else toast.success('Catatan dihapus'); run() }) }
  const Box = ({ icon: I, label, val, color }) => (<div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><div className={`p-2.5 rounded-lg w-fit mb-3 ${color.bg}`}><I className={`w-5 h-5 ${color.txt}`}/></div><p className="text-xs text-gray-500 uppercase font-medium mb-1">{label}</p><p className={`text-2xl font-bold ${color.val}`}>{val}</p></div>)
  if (load) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  const actions = (<button onClick={add} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm text-sm font-medium"><Plus className="w-4 h-4"/><span>Catat Modal/Prive</span></button>)
  return (
    <div className="p-6 lg:p-8">
      <PageHeader subtitle="Tracking modal, keuntungan & prive" actions={actions} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Box icon={Wallet} label="Total Modal" val={rp(data.modal)} color={{ bg: 'bg-blue-50', txt: 'text-[#0058A3]', val: 'text-gray-900' }}/>
        <Box icon={TrendingUp} label="Keuntungan (Akumulasi)" val={rp(data.keuntungan)} color={{ bg: 'bg-green-50', txt: 'text-green-600', val: 'text-green-600' }}/>
        <Box icon={TrendingDown} label="Prive (Pengambilan)" val={rp(data.prive)} color={{ bg: 'bg-red-50', txt: 'text-red-600', val: 'text-red-600' }}/>
      </div>
      <div className="bg-gradient-to-br from-[#0058A3] to-[#004080] p-8 rounded-xl shadow-lg text-white mb-6"><p className="text-sm opacity-90 mb-2">Saldo Modal Berjalan</p><p className="text-4xl font-bold">{rp(data.saldo)}</p><p className="text-sm opacity-75 mt-2">Modal + Keuntungan - Prive</p></div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b flex items-center gap-2"><History className="w-5 h-5 text-[#0058A3]"/><h3 className="text-lg font-bold">Riwayat Modal & Prive</h3><span className="text-sm text-gray-400">({rows.length} catatan)</span></div>
        {!rows.length ? <p className="p-10 text-center text-gray-400 text-sm">Belum ada catatan modal/prive. Klik "Catat Modal/Prive" untuk menambah.</p> :
        <div className="overflow-x-auto"><table className="w-full">
          <thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">Tanggal</th><th className="text-left p-3">Jenis</th><th className="text-right p-3">Nominal</th><th className="text-left p-3">Keterangan</th><th className="text-right p-3">Aksi</th></tr></thead>
          <tbody className="divide-y">{rows.map(c => (<tr key={c.id} className="hover:bg-gray-50">
            <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{c.date ? new Date(c.date + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
            <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${c.type === 'capital_in' ? 'bg-blue-100 text-[#0058A3]' : 'bg-red-100 text-red-600'}`}>{c.type === 'capital_in' ? 'MODAL (+)' : 'PRIVE (-)'}</span></td>
            <td className={`p-3 text-sm text-right font-semibold ${c.type === 'capital_in' ? 'text-green-600' : 'text-red-600'}`}>{rp(c.amount)}</td>
            <td className="p-3 text-sm text-gray-600 max-w-[240px] truncate">{c.description || '—'}</td>
            <td className="p-3 text-right"><div className="flex justify-end gap-1"><button onClick={() => editRow(c)} className="p-1.5 hover:bg-blue-50 rounded text-[#0058A3]"><Edit2 className="w-4 h-4"/></button><button onClick={() => del(c)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4"/></button></div></td>
          </tr>))}</tbody>
        </table></div>}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><h4 className="text-sm font-semibold text-[#0058A3] mb-2">Cara Kerja</h4><ul className="text-sm text-gray-700 space-y-1"><li>• <strong>Modal</strong>: setoran owner/investor</li><li>• <strong>Keuntungan</strong>: laba bersih otomatis (pendapatan - HPP - biaya admin). HPP barang titipan sudah termasuk harga titipan ke mitra</li><li>• <strong>Prive</strong>: pengambilan owner untuk pribadi — bisa diedit/dihapus lewat tabel Riwayat</li><li>• <strong>Hutang konsinyasi</strong>: dikelola di halaman Konsinyasi (terbentuk otomatis saat barang titipan masuk lewat Stok Masuk/Keluar)</li><li>• <strong>Saldo</strong> = Modal + Keuntungan - Prive</li></ul></div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Catatan Modal/Prive' : 'Catat Modal / Prive'} footer={<button form="capForm" type="submit" className="w-full py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4"/>Simpan</button>}>
        <form id="capForm" onSubmit={submit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Jenis</label><select value={fd.type} onChange={e => setFd({ ...fd, type: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg bg-white"><option value="capital_in">Setoran Modal (+)</option><option value="prive_out">Peng Prive (-)</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nominal (Rp)</label><RupiahInput value={fd.amount} onChange={x => setFd({ ...fd, amount: x })} className="w-full px-4 py-2.5 border rounded-lg outline-none text-right focus:ring-2 focus:ring-[#0058A3]" placeholder="0"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal</label><input type="date" value={fd.date} onChange={e => setFd({ ...fd, date: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Keterangan</label><input value={fd.description} onChange={e => setFd({ ...fd, description: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder="Opsional"/></div>
        </form>
      </Modal>
      <Confirm open={!!cf} danger message={cf?.message} confirmText="Ya, Hapus" onClose={() => setCf(null)} onConfirm={async () => { const a = cf.action; setCf(null); await a() }}/>
    </div>
  )
}
