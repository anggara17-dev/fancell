import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Confirm, Modal, RupiahInput, useToast, rp } from '../components/ui'
import { DollarSign, Package, TrendingUp, TrendingDown, Receipt, Percent, Plus, Trash2, Check, Repeat } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { id } from 'date-fns/locale'
const isoFrom = d => new Date(d + 'T00:00:00').toISOString()
const isoTo = d => new Date(d + 'T23:59:59.999').toISOString()
export default function LabaRugi() {
  const toast = useToast()
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [to, setTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [d, setD] = useState({ rev: 0, hpp: 0, gross: 0, fee: 0, opex: 0, ownerShare: 0, net: 0 })
  const [opexList, setOpexList] = useState([]); const [load, setLoad] = useState(true)
  const [showAdd, setShowAdd] = useState(false); const [nf, setNf] = useState({ category:'', description:'', amount:0, date: format(new Date(), 'yyyy-MM-dd') })
  const [cf, setCf] = useState(null); const ask = (message, action) => setCf({ message, action })
  useEffect(() => { run() }, [from, to])
  async function run() {
    setLoad(true)
    const [tx, op] = await Promise.all([ supabase.from('transactions').select('id, total_amount, transaction_items(hpp_at_sale,qty), payments(admin_fee)').gte('created_at', isoFrom(from)).lte('created_at', isoTo(to)).eq('payment_status', 'paid'), supabase.from('operational_costs').select('*').gte('date', from).lte('date', to).order('date', { ascending: false }) ])
    if (tx.error) toast.error('Gagal ambil transaksi: ' + tx.error.message)
    if (op.error) toast.error('Gagal ambil pengeluaran: ' + op.error.message)
    let rev = 0, hpp = 0, fee = 0
    ;(tx.data || []).forEach(t => { rev += +t.total_amount || 0; (t.transaction_items || []).forEach(i => hpp += (+i.hpp_at_sale || 0) * (i.qty || 1)); (t.payments || []).forEach(p => fee += +p.admin_fee || 0) })
    // FIX: bagian owner barang titipan ikut dipotong dari laba (hpp barang titipan = 0)
    const txIds = (tx.data || []).map(t => t.id)
    let ownerShare = 0
    if (txIds.length) {
      const { data: cons } = await supabase.from('consignment_settlements').select('owner_share').not('owner_share', 'is', null).in('transaction_id', txIds)
      ownerShare = (cons || []).reduce((a, c) => a + (+c.owner_share || 0), 0)
    }
    const list = op.data || []; const opex = list.reduce((a, c) => a + (+c.amount || 0), 0); const gross = rev - hpp
    setOpexList(list); setD({ rev, hpp, gross, fee, opex, ownerShare, net: gross - fee - opex - ownerShare }); setLoad(false)
  }
  async function addOpex(e) { e.preventDefault(); if (!nf.category.trim()) return toast.error('Kategori wajib diisi'); if (!+nf.amount) return toast.error('Nominal harus > 0'); try { const { error } = await supabase.from('operational_costs').insert({ category: nf.category.trim(), description: nf.description, amount: Number(nf.amount) || 0, date: nf.date }); if (error) throw error; toast.success('Pengeluaran dicatat'); setShowAdd(false); setNf({ category:'', description:'', amount:0, date: format(new Date(), 'yyyy-MM-dd') }); run() } catch (err) { toast.error('Gagal simpan: ' + err.message) } }
  function delOpex(id) { ask('Hapus catatan pengeluaran ini?', async () => { const { error } = await supabase.from('operational_costs').delete().eq('id', id); if (error) toast.error(error.message); else toast.success('Pengeluaran dihapus'); run() }) }
  const Box = ({ icon: I, label, val, color }) => (<div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><div className={`p-2.5 rounded-lg w-fit mb-3 ${color.bg}`}><I className={`w-5 h-5 ${color.txt}`}/></div><p className="text-xs text-gray-500 uppercase font-medium mb-1">{label}</p><p className={`text-2xl font-bold ${color.val}`}>{val}</p></div>)
  if (load) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <div className="p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Laba Rugi</h2><p className="text-sm text-gray-500 mt-0.5">{format(new Date(from + 'T00:00:00'), 'dd MMM yyyy', { locale: id })} — {format(new Date(to + 'T00:00:00'), 'dd MMM yyyy', { locale: id })}</p></div>
        <div className="flex items-center gap-2 bg-gray-50 border rounded-lg p-1"><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="text-sm bg-transparent px-2 outline-none"/><span className="text-gray-400">-</span><input type="date" value={to} onChange={e => setTo(e.target.value)} className="text-sm bg-transparent px-2 outline-none"/></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Box icon={DollarSign} label="Pendapatan" val={rp(d.rev)} color={{ bg: 'bg-blue-50', txt: 'text-[#0058A3]', val: 'text-gray-900' }}/>
        <Box icon={Package} label="HPP" val={rp(d.hpp)} color={{ bg: 'bg-orange-50', txt: 'text-orange-600', val: 'text-gray-900' }}/>
        <Box icon={TrendingUp} label="Laba Kotor" val={rp(d.gross)} color={{ bg: 'bg-green-50', txt: 'text-green-600', val: 'text-green-600' }}/>
        <Box icon={d.net >= 0 ? TrendingUp : TrendingDown} label="Laba Bersih" val={rp(d.net)} color={{ bg: d.net >= 0 ? 'bg-green-50' : 'bg-red-50', txt: d.net >= 0 ? 'text-green-600' : 'text-red-600', val: d.net >= 0 ? 'text-green-600' : 'text-red-600' }}/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b"><h3 className="text-lg font-bold">Detail Perhitungan</h3></div>
          <div className="p-6 space-y-3 text-sm">
            <Line l="Total Pendapatan (Penjualan)" v={rp(d.rev)}/>
            <Line l="Harga Pokok Penjualan (HPP)" v={'- ' + rp(d.hpp)} red/>
            <div className="flex justify-between py-3 px-4 rounded-lg bg-blue-50 border-b-2 border-[#0058A3]"><span className="font-bold text-[#0058A3]">Laba Kotor</span><span className="font-bold text-[#0058A3]">{rp(d.gross)}</span></div>
            <Line l={<span className="flex items-center gap-1"><Percent className="w-3 h-3"/>Biaya Admin Paylater/EDC/QRIS</span>} v={'- ' + rp(d.fee)} red/>
            {d.ownerShare > 0 && <Line l={<span className="flex items-center gap-1"><Repeat className="w-3 h-3"/>Bagi Hasil Owner Titipan (Konsinyasi)</span>} v={'- ' + rp(d.ownerShare)} red/>}
            <Line l={<span className="flex items-center gap-1"><Receipt className="w-3 h-3"/>Biaya Operasional</span>} v={'- ' + rp(d.opex)} red/>
            <div className="flex justify-between py-4 px-4 rounded-lg bg-green-50"><span className="font-bold text-green-700 text-base">Laba Bersih</span><span className={`font-bold text-base ${d.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{rp(d.net)}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b flex justify-between items-center"><h3 className="text-lg font-bold">Biaya Operasional (periode ini)</h3><button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 bg-[#0058A3] text-white rounded-lg text-sm font-medium hover:bg-[#004080]"><Plus className="w-4 h-4"/>Catat</button></div>
          <div className="p-4 overflow-y-auto max-h-[420px] flex-1">
            {!opexList.length ? <p className="text-center text-gray-400 text-sm py-10">Belum ada pengeluaran pada periode ini.</p> :
            <div className="space-y-2">{opexList.map(c => (<div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{c.category}</p><p className="text-xs text-gray-500 truncate">{c.description || '—'} · {new Date(c.date + 'T00:00:00').toLocaleDateString('id-ID')}</p></div>
              <div className="flex items-center gap-2 flex-shrink-0"><span className="text-sm font-bold text-red-600">-{rp(c.amount)}</span><button onClick={() => delOpex(c.id)} className="p-1.5 hover:bg-red-100 rounded text-red-600"><Trash2 className="w-4 h-4"/></button></div>
            </div>))}</div>}
          </div>
        </div>
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Catat Pengeluaran" footer={<button form="opexForm" type="submit" className="w-full py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4"/>Simpan</button>}>
        <form id="opexForm" onSubmit={addOpex} className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori *</label><input value={nf.category} onChange={e => setNf({ ...nf, category: e.target.value })} list="opexCat" placeholder="Listrik / Makan / Sewa / Transport / Lainnya" className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/><datalist id="opexCat"><option value="Listrik"/><option value="Air"/><option value="Internet"/><option value="Makan & Minum"/><option value="Sewa"/><option value="Transport"/><option value="Gaji"/><option value="Lainnya"/></datalist></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label><input value={nf.description} onChange={e => setNf({ ...nf, description: e.target.value })} placeholder="Opsional" className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nominal (Rp) *</label><RupiahInput value={nf.amount} onChange={x => setNf({ ...nf, amount: x })} className="w-full px-4 py-2.5 border rounded-lg outline-none text-right focus:ring-2 focus:ring-[#0058A3]" placeholder="0"/></div><div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal *</label><input type="date" value={nf.date} onChange={e => setNf({ ...nf, date: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></div></div>
        </form>
      </Modal>
      <Confirm open={!!cf} danger message={cf?.message} confirmText="Ya, Hapus" onClose={() => setCf(null)} onConfirm={async () => { const a = cf.action; setCf(null); await a() }}/>
    </div>
  )
}
function Line({ l, v, red }) { return <div className="flex justify-between py-3 border-b border-gray-100"><span className="text-gray-700">{l}</span><span className={`font-semibold ${red ? 'text-red-600' : 'text-gray-900'}`}>{v}</span></div> }
