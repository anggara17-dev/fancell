import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import { Confirm, Modal, RupiahInput, useToast, rp } from '../components/ui'
import { Wallet, TrendingUp, TrendingDown, Plus, Check, History, Edit2, Trash2, Boxes, Users, Banknote } from 'lucide-react'
export default function KeuntunganModal() {
  const toast = useToast()
  const [data, setData] = useState({ setoran: 0, stok: 0, totalModal: 0, gross: 0, beban: 0, fee: 0, keuntungan: 0, prive: 0, hutang: 0, saldo: 0 })
  const [rows, setRows] = useState([]); const [load, setLoad] = useState(true)
  const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState(null)
  const [fd, setFd] = useState({ type: 'capital_in', amount: 0, description: '', date: new Date().toISOString().slice(0, 10) })
  const [cf, setCf] = useState(null); const ask = (message, action) => setCf({ message, action })
  useEffect(() => { run() }, [])
  async function run() {
    const [cap, tx, op, prods, vars, imeis, mv, pays] = await Promise.all([
      supabase.from('capital_transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('transactions').select('total_amount, transaction_items(hpp_at_sale,qty), payments(admin_fee)').eq('payment_status', 'paid'),
      supabase.from('operational_costs').select('amount'),
      supabase.from('products').select('id,stock_type'),
      supabase.from('product_variants').select('id,product_id,stock_qty,hpp'),
      supabase.from('product_imeis').select('variant_id,status').eq('status', 'available'),
      supabase.from('stock_movements').select('direction,reason,qty,unit_value').not('mitra_id', 'is', null),
      supabase.from('consignment_payments').select('amount')
    ])
    let setoran = 0, prive = 0; (cap.data || []).forEach(c => { if (c.type === 'capital_in') setoran += +c.amount || 0; else prive += +c.amount || 0 })
    let rev = 0, hpp = 0, fee = 0; (tx.data || []).forEach(t => { rev += +t.total_amount || 0; (t.transaction_items || []).forEach(i => hpp += (+i.hpp_at_sale || 0) * (i.qty || 1)); (t.payments || []).forEach(p => fee += +p.admin_fee || 0) })
    const beban = (op.data || []).reduce((a, c) => a + (+c.amount || 0), 0)
    // FIX: keuntungan = laba BERSIH (laba kotor dikurangi beban operasional), konsisten dgn halaman Laba Rugi
    const gross = rev - hpp - fee
    const keuntungan = gross - beban
    const pmap = {}; (prods.data || []).forEach(p => pmap[p.id] = p.stock_type)
    const av = {}; (imeis.data || []).forEach(x => { av[x.variant_id] = (av[x.variant_id] || 0) + 1 })
    let stok = 0; (vars.data || []).forEach(v => { const h = +v.hpp || 0; stok += (pmap[v.product_id] === 'imei' ? (av[v.id] || 0) : (+v.stock_qty || 0)) * h })
    let hutang = 0; (mv.data || []).forEach(m => { const v = (+m.qty || 0) * (+m.unit_value || 0); if (m.direction === 'in' && m.reason === 'konsinyasi') hutang += v; else if (m.direction === 'out' && m.reason === 'konsinyasi_retur') hutang -= v })
    hutang -= (pays.data || []).reduce((a, p) => a + (+p.amount || 0), 0)
    hutang = Math.max(0, hutang)
    setData({ setoran, stok, totalModal: setoran + stok, gross, beban, fee, keuntungan, prive, hutang, saldo: setoran + keuntungan - prive })
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
  function del(c) { ask(`Hapus catatan ${c.type === 'capital_in' ? 'setoran' : 'prive'} ini? Saldo akan dihitung ulang otomatis.`, async () => { const { error } = await supabase.from('capital_transactions').delete().eq('id', c.id); if (error) toast.error(error.message); else toast.success('Catatan dihapus'); run() }) }
  const Box = ({ icon: I, label, val, color, sub, big }) => (<div className={`bg-white ${big ? 'p-6 border-2 border-[#0058A3]' : 'p-6 border-gray-200'} rounded-xl shadow-sm`}><div className={`p-2.5 rounded-lg w-fit mb-3 ${color.bg}`}><I className={`w-5 h-5 ${color.txt}`}/></div><p className="text-xs text-gray-500 uppercase font-medium mb-1">{label}</p><p className={`font-bold ${color.val} ${big ? 'text-3xl' : 'text-2xl'}`}>{val}</p>{sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}</div>)
  if (load) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  const actions = (<button onClick={add} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm text-sm font-medium"><Plus className="w-4 h-4"/><span>Catat Setoran/Prive</span></button>)
  return (
    <div className="p-6 lg:p-8">
      <PageHeader subtitle="Modal otomatis dari barang di rak + setoran tunai (khusus owner)" actions={actions} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Box big icon={Wallet} label="Total Modal" val={rp(data.totalModal)} color={{ bg: 'bg-blue-50', txt: 'text-[#0058A3]', val: 'text-[#0058A3]' }} sub="Setoran Tunai + Nilai Stok — otomatis"/>
        <Box icon={TrendingUp} label="Keuntungan Bersih (Akumulasi)" val={rp(data.keuntungan)} color={{ bg: 'bg-green-50', txt: 'text-green-600', val: 'text-green-600' }} sub={`laba kotor ${rp(data.gross)} − beban operasional ${rp(data.beban)} − fee admin ${rp(data.fee)}`}/>
        <Box icon={TrendingDown} label="Prive (Pengambilan)" val={rp(data.prive)} color={{ bg: 'bg-red-50', txt: 'text-red-600', val: 'text-red-600' }}/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Box icon={Banknote} label="Setoran Tunai" val={rp(data.setoran)} color={{ bg: 'bg-blue-50', txt: 'text-[#0058A3]', val: 'text-gray-900' }} sub="catat manual HANYA uang segar dari kantong"/>
        <Box icon={Boxes} label="Nilai Stok di Rak" val={rp(data.stok)} color={{ bg: 'bg-amber-50', txt: 'text-amber-600', val: 'text-amber-700' }} sub="semua barang × HPP (titipan = harga titipan) — otomatis"/>
        <Box icon={Users} label="Hutang Titipan (belum dibayar)" val={rp(data.hutang)} color={{ bg: 'bg-orange-50', txt: 'text-orange-600', val: 'text-red-600' }} sub="sudah diperhitungkan otomatis di Saldo"/>
      </div>
      <div className="bg-gradient-to-br from-[#0058A3] to-[#004080] p-8 rounded-xl shadow-lg text-white mb-6"><p className="text-sm opacity-90 mb-2">Saldo Kekayaan Bersih</p><p className="text-4xl font-bold">{rp(data.saldo)}</p><p className="text-sm opacity-75 mt-2">Setoran + Keuntungan Bersih − Prive &nbsp;·&nbsp; = uang di kasir + barang milik sendiri (hutang titipan sudah otomatis terpotong saat barang titipan terjual)</p></div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b flex items-center gap-2"><History className="w-5 h-5 text-[#0058A3]"/><h3 className="text-lg font-bold">Riwayat Setoran & Prive</h3><span className="text-sm text-gray-400">({rows.length} catatan)</span></div>
        {!rows.length ? <p className="p-10 text-center text-gray-400 text-sm">Belum ada catatan. Catat setoran tunai / pengambilan prive lewat tombol di atas.</p> :
        <div className="overflow-x-auto"><table className="w-full">
          <thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">Tanggal</th><th className="text-left p-3">Jenis</th><th className="text-right p-3">Nominal</th><th className="text-left p-3">Keterangan</th><th className="text-right p-3">Aksi</th></tr></thead>
          <tbody className="divide-y">{rows.map(c => (<tr key={c.id} className="hover:bg-gray-50">
            <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{c.date ? new Date(c.date + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
            <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${c.type === 'capital_in' ? 'bg-blue-100 text-[#0058A3]' : 'bg-red-100 text-red-600'}`}>{c.type === 'capital_in' ? 'SETORAN (+)' : 'PRIVE (-)'}</span></td>
            <td className={`p-3 text-sm text-right font-semibold ${c.type === 'capital_in' ? 'text-green-600' : 'text-red-600'}`}>{rp(c.amount)}</td>
            <td className="p-3 text-sm text-gray-600 max-w-[240px] truncate">{c.description || '—'}</td>
            <td className="p-3 text-right"><div className="flex justify-end gap-1"><button onClick={() => editRow(c)} className="p-1.5 hover:bg-blue-50 rounded text-[#0058A3]"><Edit2 className="w-4 h-4"/></button><button onClick={() => del(c)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4"/></button></div></td>
          </tr>))}</tbody>
        </table></div>}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><h4 className="text-sm font-semibold text-[#0058A3] mb-2">Cara Kerja</h4><ul className="text-sm text-gray-700 space-y-1"><li>• <strong>Total Modal = Setoran + Nilai Stok</strong>. Belanja barang <strong>TIDAK perlu dicatat manual</strong> — begitu barang masuk lewat Stok Masuk/Keluar, HPP-nya otomatis menambah modal (cth: 10 barang × HPP 5jt = Rp 50jt otomatis)</li><li>• <strong>Keuntungan Bersih</strong> = Pendapatan − HPP − Fee Admin − Beban Operasional (rumus sama dengan halaman Laba Rugi, tapi akumulasi sejak awal). Beban operasional dicatat di halaman Laba Rugi</li><li>• <strong>Barang titipan</strong>: HPP = harga titipan → hutang mitra tercatat. Saat terjual lebih mahal, <strong>selisih (harga jual − harga titipan) otomatis jadi keuntungan toko</strong></li><li>• <strong>Saldo Kekayaan Bersih</strong> = Setoran + Keuntungan Bersih − Prive ≈ uang di kasir + barang milik sendiri</li></ul></div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Catatan Setoran/Prive' : 'Catat Setoran / Prive'} footer={<button form="capForm" type="submit" className="w-full py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4"/>Simpan</button>}>
        <form id="capForm" onSubmit={submit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Jenis</label><select value={fd.type} onChange={e => setFd({ ...fd, type: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg bg-white"><option value="capital_in">Setoran Modal Tunai (+)</option><option value="prive_out">Peng Prive (-)</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nominal (Rp)</label><RupiahInput value={fd.amount} onChange={x => setFd({ ...fd, amount: x })} className="w-full px-4 py-2.5 border rounded-lg outline-none text-right focus:ring-2 focus:ring-[#0058A3]" placeholder="0"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal</label><input type="date" value={fd.date} onChange={e => setFd({ ...fd, date: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Keterangan</label><input value={fd.description} onChange={e => setFd({ ...fd, description: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder="Opsional"/></div>
        </form>
      </Modal>
      <Confirm open={!!cf} danger message={cf?.message} confirmText="Ya, Hapus" onClose={() => setCf(null)} onConfirm={async () => { const a = cf.action; setCf(null); await a() }}/>
    </div>
  )
}
