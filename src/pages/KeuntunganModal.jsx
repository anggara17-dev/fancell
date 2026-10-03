import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Modal, RupiahInput, useToast, rp } from '../components/ui'
import { Wallet, TrendingUp, TrendingDown, Plus, Check, Repeat, Users } from 'lucide-react'
export default function KeuntunganModal() {
  const toast = useToast()
  const [data, setData] = useState({ modal: 0, keuntungan: 0, prive: 0, saldo: 0 })
  const [cons, setCons] = useState([]); const [load, setLoad] = useState(true)
  const [showForm, setShowForm] = useState(false); const [fd, setFd] = useState({ type: 'capital_in', amount: 0, description: '' })
  useEffect(() => { run() }, [])
  async function run() {
    const [cap, tx, cs, ow] = await Promise.all([ supabase.from('capital_transactions').select('type, amount'), supabase.from('transactions').select('total_amount, transaction_items(hpp_at_sale,qty), payments(admin_fee)').eq('payment_status', 'paid'), supabase.from('consignment_settlements').select('owner_id, owner_share, store_share, product_name, sale_price'), supabase.from('consignment_owners').select('id, name') ])
    let modal = 0, prive = 0; (cap.data || []).forEach(c => { if (c.type === 'capital_in') modal += +c.amount || 0; else prive += +c.amount || 0 })
    let rev = 0, hpp = 0, fee = 0; (tx.data || []).forEach(t => { rev += +t.total_amount || 0; (t.transaction_items || []).forEach(i => hpp += (+i.hpp_at_sale || 0) * (i.qty || 1)); (t.payments || []).forEach(p => fee += +p.admin_fee || 0) })
    const keuntungan = rev - hpp - fee
    const nameMap = {}; (ow.data || []).forEach(o => nameMap[o.id] = o.name)
    const agg = {}; (cs.data || []).forEach(s => { const k = s.owner_id || 'unknown'; agg[k] = agg[k] || { name: nameMap[k] || '—', owner: 0, store: 0, unit: 0 }; agg[k].owner += +s.owner_share || 0; agg[k].store += +s.store_share || 0; agg[k].unit += 1 })
    setData({ modal, keuntungan, prive, saldo: modal + keuntungan - prive }); setCons(Object.values(agg)); setLoad(false)
  }
  async function submit(e) { e.preventDefault(); if (!fd.amount) return toast.error('Nominal wajib diisi'); try { const { error } = await supabase.from('capital_transactions').insert({ type: fd.type, amount: Number(fd.amount) || 0, description: fd.description, date: new Date().toISOString().slice(0, 10) }); if (error) throw error; toast.success('Tercatat'); setShowForm(false); setFd({ type: 'capital_in', amount: 0, description: '' }); run() } catch (err) { toast.error(err.message) } }
  const Box = ({ icon: I, label, val, color }) => (<div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><div className={`p-2.5 rounded-lg w-fit mb-3 ${color.bg}`}><I className={`w-5 h-5 ${color.txt}`}/></div><p className="text-xs text-gray-500 uppercase font-medium mb-1">{label}</p><p className={`text-2xl font-bold ${color.val}`}>{val}</p></div>)
  if (load) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <div className="p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6"><div><h2 className="text-2xl font-bold text-gray-900">Keuntungan & Modal</h2><p className="text-sm text-gray-500 mt-0.5">Tracking modal, keuntungan & bagi hasil konsinyasi</p></div><button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm"><Plus className="w-4 h-4"/><span className="text-sm font-medium">Catat Modal/Prive</span></button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Box icon={Wallet} label="Total Modal" val={rp(data.modal)} color={{ bg: 'bg-blue-50', txt: 'text-[#0058A3]', val: 'text-gray-900' }}/>
        <Box icon={TrendingUp} label="Keuntungan (Akumulasi)" val={rp(data.keuntungan)} color={{ bg: 'bg-green-50', txt: 'text-green-600', val: 'text-green-600' }}/>
        <Box icon={TrendingDown} label="Prive (Pengambilan)" val={rp(data.prive)} color={{ bg: 'bg-red-50', txt: 'text-red-600', val: 'text-red-600' }}/>
      </div>
      <div className="bg-gradient-to-br from-[#0058A3] to-[#004080] p-8 rounded-xl shadow-lg text-white mb-6"><p className="text-sm opacity-90 mb-2">Saldo Modal Berjalan</p><p className="text-4xl font-bold">{rp(data.saldo)}</p><p className="text-sm opacity-75 mt-2">Modal + Keuntungan - Prive</p></div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b flex items-center gap-2"><Repeat className="w-5 h-5 text-amber-600"/><h3 className="text-lg font-bold">Bagi Hasil Konsinyasi (per pemilik titipan)</h3></div>
        {!cons.length ? <p className="p-10 text-center text-gray-400 text-sm">Belum ada penjualan konsinyasi. Jual produk bertipe "Konsinyasi" di POS untuk mencatat bagi hasil otomatis.</p> :
        <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">Pemilik</th><th className="text-left p-3">Unit Terjual</th><th className="text-right p-3">Bagian Owner</th><th className="text-right p-3">Bagian Toko</th></tr></thead>
          <tbody className="divide-y">{cons.map((c, i) => (<tr key={i} className="hover:bg-gray-50"><td className="p-3 text-sm font-medium flex items-center gap-2"><Users className="w-4 h-4 text-gray-400"/>{c.name}</td><td className="p-3 text-sm text-gray-600">{c.unit} unit</td><td className="p-3 text-sm text-right text-amber-700 font-semibold">{rp(c.owner)}</td><td className="p-3 text-sm text-right text-[#0058A3] font-semibold">{rp(c.store)}</td></tr>))}</tbody></table></div>}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><h4 className="text-sm font-semibold text-[#0058A3] mb-2">Cara Kerja</h4><ul className="text-sm text-gray-700 space-y-1"><li>• <strong>Modal</strong>: setoran owner/investor</li><li>• <strong>Keuntungan</strong>: laba bersih otomatis dari semua transaksi (pendapatan - HPP - biaya admin)</li><li>• <strong>Prive</strong>: pengambilan owner untuk pribadi</li><li>• <strong>Konsinyasi</strong>: saat barang titipan terjual di POS, bagian owner & toko tercatat otomatis di tabel atas</li><li>• <strong>Saldo</strong> = Modal + Keuntungan - Prive</li></ul></div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Catat Modal / Prive" footer={<button form="capForm" type="submit" className="w-full py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4"/>Simpan</button>}>
        <form id="capForm" onSubmit={submit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Jenis</label><select value={fd.type} onChange={e => setFd({ ...fd, type: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg bg-white"><option value="capital_in">Setoran Modal (+)</option><option value="prive_out">Peng Prive (-)</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nominal (Rp)</label><RupiahInput value={fd.amount} onChange={x => setFd({ ...fd, amount: x })} className="w-full px-4 py-2.5 border rounded-lg outline-none text-right focus:ring-2 focus:ring-[#0058A3]" placeholder="0"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Keterangan</label><input value={fd.description} onChange={e => setFd({ ...fd, description: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder="Opsional"/></div>
        </form>
      </Modal>
    </div>
  )
}
