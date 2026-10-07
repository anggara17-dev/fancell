// >>> FILE Konsinyasi START
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import { Confirm, Modal, RupiahInput, useToast, rp } from '../components/ui'
import {
  Users, Package, FileText, Plus, Edit2, Trash2, Check,
  Search, Wallet, Repeat, Calendar, ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react'
import { format } from 'date-fns'

const today = () => format(new Date(), 'yyyy-MM-dd')
const startMonth = () => { const d = new Date(); d.setDate(1); return format(d, 'yyyy-MM-dd') }

export default function Konsinyasi() {
  const toast = useToast()
  const [partners, setPartners] = useState([])
  const [moves, setMoves] = useState([])
  const [settles, setSettles] = useState([])
  const [loading, setLoading] = useState(true)

  const [showPartner, setShowPartner] = useState(false)
  const [editPartner, setEditPartner] = useState(null)
  const [fp, setFp] = useState({ name: '', phone: '', address: '' })

  const [showMove, setShowMove] = useState(false)
  const [editMove, setEditMove] = useState(null)
  const [fm, setFm] = useState({ partner_id: '', direction: 'in', item_name: '', qty: 1, unit_price: 0, note: '', move_date: today() })

  const [showSettle, setShowSettle] = useState(false)
  const [editSettle, setEditSettle] = useState(null)
  const [fs, setFs] = useState({ partner_id: '', direction: 'in', amount: 0, note: '', settle_date: today() })

  const [hq, setHq] = useState('')
  const [from, setFrom] = useState(startMonth())
  const [to, setTo] = useState(today())
  const [dirFilter, setDirFilter] = useState('all')

  const [cf, setCf] = useState(null)
  const ask = (message, action) => setCf({ message, action })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [p, m, s] = await Promise.all([
      supabase.from('consignment_partners').select('*').order('name'),
      supabase.from('consignment_moves').select('*').order('move_date', { ascending: false }),
      supabase.from('consignment_partner_payments').select('*').order('settle_date', { ascending: false })
    ])
    if (p.error) toast.error('Mitra: ' + p.error.message)
    if (m.error) toast.error('Mutasi: ' + m.error.message)
    if (s.error) toast.error('Pembayaran: ' + s.error.message)
    setPartners(p.data || [])
    setMoves(m.data || [])
    setSettles(s.data || [])
    setLoading(false)
  }

  function balance(pid) {
    const inSum = moves.filter(x => x.partner_id === pid && x.direction === 'in').reduce((a, x) => a + (+x.total || 0), 0)
    const outSum = moves.filter(x => x.partner_id === pid && x.direction === 'out').reduce((a, x) => a + (+x.total || 0), 0)
    const payIn = settles.filter(x => x.partner_id === pid && x.direction === 'in').reduce((a, x) => a + (+x.amount || 0), 0)
    const payOut = settles.filter(x => x.partner_id === pid && x.direction === 'out').reduce((a, x) => a + (+x.amount || 0), 0)
    return { hutang: inSum - payIn, piutang: outSum - payOut }
  }
  const pname = id => (partners.find(x => x.id === id) || {}).name || '—'

  // ---- partner ----
  function openAddPartner() { setEditPartner(null); setFp({ name: '', phone: '', address: '' }); setShowPartner(true) }
  function openEditPartner(o) { setEditPartner(o); setFp({ name: o.name, phone: o.phone || '', address: o.address || '' }); setShowPartner(true) }
  async function savePartner(e) {
    e.preventDefault()
    if (!fp.name.trim()) return toast.error('Nama mitra wajib diisi')
    const payload = { name: fp.name.trim(), phone: fp.phone, address: fp.address }
    try {
      if (editPartner) {
        const { error } = await supabase.from('consignment_partners').update(payload).eq('id', editPartner.id)
        if (error) throw error
        toast.success('Mitra diupdate')
      } else {
        const { error } = await supabase.from('consignment_partners').insert(payload)
        if (error) throw error
        toast.success('Mitra ditambahkan')
      }
      setShowPartner(false); setEditPartner(null); load()
    } catch (err) { toast.error(err.message) }
  }
    function delPartner(id) {
    ask('Hapus mitra ini? Seluruh mutasi & pembayarannya ikut terhapus.', async () => {
      try {
        await supabase.from('consignment_moves').delete().eq('partner_id', id)
        await supabase.from('consignment_partner_payments').delete().eq('partner_id', id)
        const { error } = await supabase.from('consignment_partners').delete().eq('id', id)
        if (error) throw error
        toast.success('Mitra dihapus')
      } catch (err) { toast.error(err.message) }
      load()
    })
  }

  // ---- move (titip masuk / keluar) ----
  function openMove(direction, pid) {
    setEditMove(null)
    setFm({ partner_id: pid || partners[0]?.id || '', direction, item_name: '', qty: 1, unit_price: 0, note: '', move_date: today() })
    setShowMove(true)
  }
  function openEditMove(mv) {
    setEditMove(mv)
    setFm({ partner_id: mv.partner_id, direction: mv.direction, item_name: mv.item_name, qty: mv.qty, unit_price: mv.unit_price, note: mv.note || '', move_date: mv.move_date })
    setShowMove(true)
  }
  async function saveMove(e) {
    e.preventDefault()
    if (!fm.partner_id) return toast.error('Pilih mitra')
    if (!fm.item_name.trim()) return toast.error('Nama barang wajib diisi')
    if (+fm.qty <= 0) return toast.error('Jumlah harus > 0')
    if (+fm.unit_price <= 0) return toast.error('Harga harus > 0')
    const total = (+fm.qty) * (+fm.unit_price)
    const payload = { partner_id: fm.partner_id, direction: fm.direction, item_name: fm.item_name.trim(), qty: +fm.qty, unit_price: +fm.unit_price, total, note: fm.note, move_date: fm.move_date }
    try {
      if (editMove) {
        const { error } = await supabase.from('consignment_moves').update(payload).eq('id', editMove.id)
        if (error) throw error
        toast.success('Mutasi diupdate')
      } else {
        const { error } = await supabase.from('consignment_moves').insert(payload)
        if (error) throw error
        toast.success(fm.direction === 'in' ? 'Titip masuk tercatat (hutang +)' : 'Titip keluar tercatat (piutang +)')
      }
      setShowMove(false); setEditMove(null); load()
    } catch (err) { toast.error(err.message) }
  }
  function delMove(id) {
    ask('Hapus mutasi ini?', async () => {
      const { error } = await supabase.from('consignment_moves').delete().eq('id', id)
      if (error) toast.error(error.message)
      else toast.success('Mutasi dihapus')
      load()
    })
  }

  // ---- settle (lunas / pembayaran) ----
  function openSettle(direction, pid, suggested) {
    setEditSettle(null)
    setFs({ partner_id: pid || partners[0]?.id || '', direction, amount: suggested || 0, note: '', settle_date: today() })
    setShowSettle(true)
  }
  function openEditSettle(st) {
    setEditSettle(st)
    setFs({ partner_id: st.partner_id, direction: st.direction, amount: st.amount, note: st.note || '', settle_date: st.settle_date })
    setShowSettle(true)
  }
  async function saveSettle(e) {
    e.preventDefault()
    if (!fs.partner_id) return toast.error('Pilih mitra')
    if (+fs.amount <= 0) return toast.error('Nominal harus > 0')
    const payload = { partner_id: fs.partner_id, direction: fs.direction, amount: +fs.amount, note: fs.note, settle_date: fs.settle_date }
    try {
      if (editSettle) {
        const { error } = await supabase.from('consignment_partner_payments').update(payload).eq('id', editSettle.id)

        if (error) throw error
        toast.success('Pembayaran diupdate')
      } else {
const { error } = await supabase.from('consignment_partner_payments').insert(payload)
  if (error) throw error
        toast.success(fs.direction === 'in' ? 'Pembayaran ke mitra tercatat (hutang -)' : 'Penerimaan dari mitra tercatat (piutang -)')
      }
      setShowSettle(false); setEditSettle(null); load()
    } catch (err) { toast.error(err.message) }
  }
  function delSettle(id) {
    ask('Hapus catatan pembayaran ini?', async () => {
      const { error } = await supabase.from('consignment_partner_payments').delete().eq('id', id)
      if (error) toast.error(error.message)
      else toast.success('Pembayaran dihapus')
      load()
    })
  }

  // ---- riwayat gabungan + filter ----
  const history = [
    ...moves.map(x => ({ _k: 'move', _id: x.id, date: x.move_date, partner_id: x.partner_id, direction: x.direction, label: x.item_name, qty: x.qty, amount: x.total, note: x.note })),
    ...settles.map(x => ({ _k: 'settle', _id: x.id, date: x.settle_date, partner_id: x.partner_id, direction: x.direction, label: '(pembayaran)', qty: null, amount: x.amount, note: x.note }))
  ]
    .filter(h => {
      if (h.date < from || h.date > to) return false
      if (dirFilter !== 'all' && h.direction !== dirFilter) return false
      if (hq && !(pname(h.partner_id).toLowerCase().includes(hq.toLowerCase()) || (h.label || '').toLowerCase().includes(hq.toLowerCase()))) return false
      return true
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin" /></div>

  const actions = (
    <button onClick={() => openMove('out')} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm text-sm font-medium">
      <Plus className="w-4 h-4" />Kirim Barang (Titip Keluar)
    </button>
  )

  return (
    <div className="p-6 lg:p-8">
      <PageHeader subtitle="Kelola hutang & piutang dengan mitra/supplier" actions={actions} />

      {/* DAFTAR MITRA */}
      <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
        <h3 className="font-bold text-lg mb-4">Daftar Mitra</h3>
        <div className="flex gap-2 mb-4 flex-wrap">
          <input value={fp.name} onChange={e => setFp({ ...fp, name: e.target.value })} placeholder="Nama Mitra / Supplier" className="flex-1 min-w-[180px] px-4 py-2.5 border rounded-full outline-none focus:ring-2 focus:ring-[#0058A3] text-sm" />
          <input value={fp.phone} onChange={e => setFp({ ...fp, phone: e.target.value })} placeholder="No. WhatsApp" className="flex-1 min-w-[160px] px-4 py-2.5 border rounded-full outline-none focus:ring-2 focus:ring-[#0058A3] text-sm" />
          <button onClick={savePartner} className="px-4 py-2.5 bg-[#0058A3] text-white rounded-full text-sm font-medium hover:bg-[#004080] flex items-center gap-1"><Plus className="w-4 h-4" />Tambah Mitra</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
              <th className="text-left p-3">Nama Mitra</th>
              <th className="text-left p-3">No. Telp</th>
              <th className="text-right p-3">Hutang (Titip Masuk)</th>
              <th className="text-right p-3">Piutang (Titip Keluar)</th>
              <th className="text-right p-3">Aksi</th>
            </tr></thead>
            <tbody className="divide-y">
              {partners.map(o => {
                const b = balance(o.id)
                return (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" />{o.name}</td>
                    <td className="p-3 text-sm text-gray-600">{o.phone || '—'}</td>
                    <td className="p-3 text-sm text-right font-semibold text-amber-700">{rp(b.hutang)}</td>
                    <td className="p-3 text-sm text-right font-semibold text-[#0058A3]">{rp(b.piutang)}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <button onClick={() => openMove('in', o.id)} className="px-2 py-1 text-xs border rounded-lg hover:bg-gray-50 text-amber-700 flex items-center gap-1"><ArrowDownToLine className="w-3.5 h-3.5" />Masuk</button>
                        <button onClick={() => openMove('out', o.id)} className="px-2 py-1 text-xs border rounded-lg hover:bg-gray-50 text-[#0058A3] flex items-center gap-1"><ArrowUpFromLine className="w-3.5 h-3.5" />Keluar</button>
                        <button onClick={() => openSettle('in', o.id, b.hutang)} className="px-2 py-1 text-xs border rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-1"><Wallet className="w-3.5 h-3.5" />Lunas</button>
                        <button onClick={() => openEditPartner(o)} className="p-1.5 hover:bg-blue-50 rounded text-[#0058A3]"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => delPartner(o.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!partners.length && <tr><td colSpan={5} className="p-10 text-center text-gray-400 text-sm">Belum ada mitra</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIWAYAT & MUTASI + FILTER TANGGAL */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-[#0058A3]" />Riwayat & Mutasi</h3>
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="text-sm border rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#0058A3]" />
          <span className="text-gray-400">s/d</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="text-sm border rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#0058A3]" />
          <button onClick={() => { setFrom(startMonth()); setTo(today()) }} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium hover:bg-gray-200">Bulan Ini</button>
          <select value={dirFilter} onChange={e => setDirFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-white">
            <option value="all">Semua arah</option>
            <option value="in">Titip Masuk</option>
            <option value="out">Titip Keluar</option>
          </select>
          <div className="flex-1 min-w-[160px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={hq} onChange={e => setHq(e.target.value)} placeholder="Cari mitra / barang..." className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0058A3]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
              <th className="text-left p-3">Tanggal</th>
              <th className="text-left p-3">Mitra</th>
              <th className="text-left p-3">Arah</th>
              <th className="text-left p-3">Barang / Ket</th>
              <th className="text-right p-3">Qty</th>
              <th className="text-right p-3">Nominal</th>
              <th className="text-right p-3">Aksi</th>
            </tr></thead>
            <tbody className="divide-y">
              {history.map(h => (
                <tr key={h._k + h._id} className="hover:bg-gray-50">
                  <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{h.date}</td>
                  <td className="p-3 text-sm font-medium">{pname(h.partner_id)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${h.direction === 'in' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-[#0058A3]'}`}>
                      {h.direction === 'in' ? 'MASUK' : 'KELUAR'}{h._k === 'settle' ? ' · bayar' : ''}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-700 max-w-[240px] truncate">{h.label}{h.note ? <span className="block text-[11px] text-gray-400 truncate">{h.note}</span> : null}</td>
                  <td className="p-3 text-sm text-right">{h.qty ?? '—'}</td>
                  <td className="p-3 text-sm text-right font-semibold">{rp(h.amount)}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      {h._k === 'move'
                        ? <><button onClick={() => openEditMove(moves.find(x => x.id === h._id))} className="p-1.5 hover:bg-blue-50 rounded text-[#0058A3]"><Edit2 className="w-4 h-4" /></button><button onClick={() => delMove(h._id)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4" /></button></>
                        : <><button onClick={() => openEditSettle(settles.find(x => x.id === h._id))} className="p-1.5 hover:bg-blue-50 rounded text-[#0058A3]"><Edit2 className="w-4 h-4" /></button><button onClick={() => delSettle(h._id)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4" /></button></>}
                    </div>
                  </td>
                </tr>
              ))}
              {!history.length && <tr><td colSpan={7} className="p-10 text-center text-gray-400 text-sm">Tidak ada mutasi pada rentang ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL MITRA (edit) */}
      <Modal open={showPartner} onClose={() => setShowPartner(false)} title={editPartner ? 'Edit Mitra' : 'Tambah Mitra'}
        footer={<button form="ptForm" type="submit" className="w-full py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4" />{editPartner ? 'Update' : 'Simpan'}</button>}>
        <form id="ptForm" onSubmit={savePartner} className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Mitra / Supplier *</label><input required value={fp.name} onChange={e => setFp({ ...fp, name: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">No. WhatsApp</label><input value={fp.phone} onChange={e => setFp({ ...fp, phone: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat</label><input value={fp.address} onChange={e => setFp({ ...fp, address: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" /></div>
        </form>
      </Modal>

      {/* MODAL MUTASI */}
      <Modal open={showMove} onClose={() => setShowMove(false)} title={editMove ? 'Edit Mutasi' : (fm.direction === 'in' ? 'Titip Masuk (kita hutang)' : 'Titip Keluar (mitra piutang)')}
        footer={<button form="mvForm" type="submit" className="w-full py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4" />Simpan</button>}>
        <form id="mvForm" onSubmit={saveMove} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Mitra *</label>
              <select required value={fm.partner_id} onChange={e => setFm({ ...fm, partner_id: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0058A3]">
                <option value="">— pilih —</option>
                {partners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Arah *</label>
              <select value={fm.direction} onChange={e => setFm({ ...fm, direction: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0058A3]">
                <option value="in">Titip Masuk (hutang kita)</option>
                <option value="out">Titip Keluar (piutang kita)</option>
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Barang *</label><input required value={fm.item_name} onChange={e => setFm({ ...fm, item_name: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder="cth: iPhone 12 128GB Hitam" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Qty *</label><input type="number" min="1" required value={fm.qty} onChange={e => setFm({ ...fm, qty: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Harga /unit *</label><RupiahInput value={fm.unit_price} onChange={x => setFm({ ...fm, unit_price: x })} className="w-full px-4 py-2.5 border rounded-lg outline-none text-right focus:ring-2 focus:ring-[#0058A3]" placeholder="0" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal *</label><input type="date" value={fm.move_date} onChange={e => setFm({ ...fm, move_date: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" /></div>
          </div>
          <div className="bg-gray-50 rounded p-2 text-sm flex justify-between"><span className="text-gray-600">Total</span><span className="font-bold text-[#0058A3]">{rp((+fm.qty || 0) * (+fm.unit_price || 0))}</span></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan</label><textarea value={fm.note} onChange={e => setFm({ ...fm, note: e.target.value })} rows={2} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder="Opsional" /></div>
        </form>
      </Modal>

      {/* MODAL LUNAS / PEMBAYARAN */}
      <Modal open={showSettle} onClose={() => setShowSettle(false)} title={editSettle ? 'Edit Pembayaran' : (fs.direction === 'in' ? 'Bayar ke Mitra (kurangi hutang)' : 'Terima dari Mitra (kurangi piutang)')}
        footer={<button form="stForm" type="submit" className="w-full py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4" />Simpan</button>}>
        <form id="stForm" onSubmit={saveSettle} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Mitra *</label>
              <select required value={fs.partner_id} onChange={e => setFs({ ...fs, partner_id: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0058A3]">
                <option value="">— pilih —</option>
                {partners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Untuk *</label>
              <select value={fs.direction} onChange={e => setFs({ ...fs, direction: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0058A3]">
                <option value="in">Lunas hutang (kita bayar)</option>
                <option value="out">Piutang dibayar mitra</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nominal (Rp) *</label><RupiahInput value={fs.amount} onChange={x => setFs({ ...fs, amount: x })} className="w-full px-4 py-2.5 border rounded-lg outline-none text-right focus:ring-2 focus:ring-[#0058A3]" placeholder="0" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal *</label><input type="date" value={fs.settle_date} onChange={e => setFs({ ...fs, settle_date: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan</label><input value={fs.note} onChange={e => setFs({ ...fs, note: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder="cth: transfer BCA / tunai" /></div>
        </form>
      </Modal>

      <Confirm open={!!cf} danger message={cf?.message} confirmText="Ya, Hapus" onClose={() => setCf(null)} onConfirm={async () => { const a = cf.action; setCf(null); await a() }} />
    </div>
  )
}
// <<< FILE Konsinyasi END
