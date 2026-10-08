import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import { Confirm, Modal, RupiahInput, useToast, rp } from '../components/ui'
import { PackagePlus, ArrowDownToLine, ArrowUpFromLine, Plus, Trash2, Calendar, Search } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'

const today = () => format(new Date(), 'yyyy-MM-dd')
const startMonth = () => { const d = new Date(); d.setDate(1); return format(d, 'yyyy-MM-dd') }
const vlabel = v => [v.color, v.storage].filter(x => x && x !== '-').join(' - ') || 'Standar'
const IMEI_OUT_STATUS = { rusak: 'rusak', hilang: 'hilang', retur_supplier: 'returned', dipakai_internal: 'dipakai', opname_minus: 'opname', penjualan: 'sold', lainnya: 'keluar', konsinyasi_retur: 'returned' }
const REASONS = {
  in: [['stok_awal', 'Stok Awal'], ['pembelian', 'Pembelian / Restock'], ['konsinyasi', 'Barang Konsinyasi (Titipan Mitra)'], ['retur_customer', 'Retur dari Customer'], ['retur_penjualan', 'Pembatalan Transaksi (Void)'], ['opname_plus', 'Hasil Opname (Selisih Lebih)'], ['lainnya', 'Lainnya']],
  out: [['penjualan', 'Penjualan (POS)'], ['konsinyasi_retur', 'Retur Konsinyasi ke Mitra'], ['rusak', 'Barang Rusak'], ['hilang', 'Barang Hilang'], ['dipakai_internal', 'Dipakai Internal'], ['retur_supplier', 'Retur ke Supplier'], ['opname_minus', 'Hasil Opname (Selisih Kurang)'], ['lainnya', 'Lainnya']]
}
const reasonLabel = (dir, r) => { const f = (REASONS[dir] || []).find(x => x[0] === r); return f ? f[1] : r }
const isCons = r => r === 'konsinyasi' || r === 'konsinyasi_retur'

export default function StokKartu() {
  const toast = useToast(); const { user } = useAuth()
  const [variants, setVariants] = useState([]); const [moves, setMoves] = useState([]); const [partners, setPartners] = useState([]); const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(startMonth()); const [to, setTo] = useState(today())
  const [dirFilter, setDirFilter] = useState('all'); const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [fm, setFm] = useState({ variant_id: '', direction: 'in', reason: 'pembelian', qty: 1, imeis: '', note: '', mitra_id: '', unit_value: 0 })
  const [availImeis, setAvailImeis] = useState([]); const [existImeis, setExistImeis] = useState([])
  const [cf, setCf] = useState(null); const ask = (message, action) => setCf({ message, action })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [p, v, m, pt] = await Promise.all([
      supabase.from('products').select('id,name,stock_type,category').eq('status', 'active').order('name'),
      supabase.from('product_variants').select('id,product_id,storage,color,stock_qty,hpp'),
      supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('consignment_partners').select('id,name').order('name')
    ])
    if (p.error) toast.error('Produk: ' + p.error.message)
    if (v.error) toast.error('Varian: ' + v.error.message)
    if (m.error) toast.error('Mutasi: ' + m.error.message)
    if (pt.error) toast.error('Mitra: ' + pt.error.message)
    const pmap = {}; (p.data || []).forEach(x => pmap[x.id] = x)
    setVariants((v.data || []).filter(x => pmap[x.product_id]).map(x => ({ ...x, stock_type: pmap[x.product_id].stock_type, pname: pmap[x.product_id].name, label: vlabel(x) })))
    setMoves(m.data || []); setPartners(pt.data || []); setLoading(false)
  }

  const grouped = []
  variants.forEach(v => { let g = grouped.find(x => x.pname === v.pname); if (!g) { g = { pname: v.pname, items: [] }; grouped.push(g) } g.items.push(v) })
  const ptmap = {}; partners.forEach(x => ptmap[x.id] = x.name)

  const fMoves = moves.filter(x => {
    const d = (x.created_at || '').slice(0, 10)
    if (d < from || d > to) return false
    if (dirFilter !== 'all' && x.direction !== dirFilter) return false
    if (q) { const s = q.toLowerCase(); const hay = ((x.product_name || '') + ' ' + (x.variant_label || '') + ' ' + (x.imei || '') + ' ' + (x.note || '') + ' ' + (ptmap[x.mitra_id] || '')).toLowerCase(); if (!hay.includes(s)) return false }
    return true
  })
  const inSum = fMoves.filter(x => x.direction === 'in').reduce((a, x) => a + (+x.qty || 0), 0)
  const outSum = fMoves.filter(x => x.direction === 'out').reduce((a, x) => a + (+x.qty || 0), 0)

  function setDir(d) { setFm(f => ({ ...f, direction: d, reason: d === 'in' ? 'pembelian' : 'rusak' })) }
  async function pickVariant(id) {
    setFm(f => ({ ...f, variant_id: id, imeis: '', reason: f.direction === 'in' ? 'pembelian' : 'rusak', unit_value: 0 }))
    setAvailImeis([]); setExistImeis([])
    if (!id) return
    const vrow = variants.find(v => v.id === id)
    if (vrow) setFm(f => ({ ...f, unit_value: +vrow.hpp || 0 }))
    if (vrow?.stock_type === 'imei') {
      const { data } = await supabase.from('product_imeis').select('imei,status').eq('variant_id', id)
      setExistImeis((data || []).map(x => x.imei))
      setAvailImeis((data || []).filter(x => x.status === 'available').map(x => x.imei))
    }
  }

  async function submit(e) {
    e.preventDefault()
    const vrow = variants.find(v => v.id === fm.variant_id)
    if (!vrow) return toast.error('Pilih produk/varian dulu')
    const needMitra = isCons(fm.reason)
    if (needMitra && !fm.mitra_id) return toast.error('Pilih mitra untuk konsinyasi')
    const uv = needMitra ? (+fm.unit_value || 0) : 0
    if (needMitra && uv <= 0) return toast.error('Harga titipan per unit wajib > 0 (isi modal/harga titipannya)')
    const mf = { mitra_id: needMitra ? fm.mitra_id : null, unit_value: uv }
    try {
      if (vrow.stock_type === 'imei') {
        const list = (fm.imeis || '').split('\n').map(s => s.trim()).filter(Boolean)
        if (!list.length) return toast.error('Masukkan minimal 1 IMEI')
        const dup = list.filter((x, i) => list.indexOf(x) !== i)
        if (dup.length) return toast.error('Ada IMEI dobel di input: ' + dup[0])
        if (fm.direction === 'in') {
          const toInsert = list.filter(im => !existImeis.includes(im))
          const toRevive = list.filter(im => existImeis.includes(im))
          if (toInsert.length) { const { error } = await supabase.from('product_imeis').insert(toInsert.map(im => ({ variant_id: vrow.id, imei: im, status: 'available' }))); if (error) throw error }
          if (toRevive.length) { const { error } = await supabase.from('product_imeis').update({ status: 'available' }).in('imei', toRevive); if (error) throw error }
          const { error: eMove } = await supabase.from('stock_movements').insert(list.map(im => ({ variant_id: vrow.id, product_name: vrow.pname, variant_label: vrow.label, direction: 'in', reason: fm.reason, qty: 1, imei: im, note: fm.note || null, created_by: user?.username || '-', ...mf })))
          if (eMove) throw new Error('Gagal catat mutasi: ' + eMove.message)
          toast.success(needMitra ? `${list.length} unit titipan ${ptmap[fm.mitra_id] || ''} tercatat (hutang +${rp(uv * list.length)})` : `${list.length} IMEI masuk`)
        } else {
          const notAvail = list.filter(im => !availImeis.includes(im))
          if (notAvail.length) return toast.error('IMEI tidak tersedia: ' + notAvail.join(', '))
          const st = IMEI_OUT_STATUS[fm.reason] || 'keluar'
          const { error } = await supabase.from('product_imeis').update({ status: st }).in('imei', list)
          if (error) throw error
          const { error: eMove } = await supabase.from('stock_movements').insert(list.map(im => ({ variant_id: vrow.id, product_name: vrow.pname, variant_label: vrow.label, direction: 'out', reason: fm.reason, qty: 1, imei: im, note: fm.note || null, created_by: user?.username || '-', ...mf })))
          if (eMove) throw new Error('Gagal catat mutasi: ' + eMove.message)
          toast.success(needMitra ? `Retur ke ${ptmap[fm.mitra_id] || ''} tercatat (hutang -${rp(uv * list.length)})` : `${list.length} unit keluar (${reasonLabel('out', fm.reason)})`)
        }
      } else {
        const qty = +fm.qty || 0
        if (qty <= 0) return toast.error('Jumlah harus > 0')
        const cur = +vrow.stock_qty || 0
        if (fm.direction === 'out' && qty > cur) return toast.error('Stok tidak cukup (stok sekarang: ' + cur + ')')
        const next = fm.direction === 'in' ? cur + qty : cur - qty
        const { error } = await supabase.from('product_variants').update({ stock_qty: next }).eq('id', vrow.id)
        if (error) throw error
        const { error: e2 } = await supabase.from('stock_movements').insert({ variant_id: vrow.id, product_name: vrow.pname, variant_label: vrow.label, direction: fm.direction, reason: fm.reason, qty, note: fm.note || null, created_by: user?.username || '-', ...mf })
        if (e2) throw new Error('Stok terupdate tapi gagal catat mutasi: ' + e2.message)
        toast.success(needMitra ? (fm.direction === 'in' ? `Titipan ${ptmap[fm.mitra_id] || ''} tercatat (hutang +${rp(uv * qty)})` : `Retur ke ${ptmap[fm.mitra_id] || ''} tercatat (hutang -${rp(uv * qty)})`) : (fm.direction === 'in' ? 'Stok masuk tercatat' : 'Stok keluar tercatat'))
      }
      setShowForm(false); setFm({ variant_id: '', direction: 'in', reason: 'pembelian', qty: 1, imeis: '', note: '', mitra_id: '', unit_value: 0 }); setAvailImeis([]); setExistImeis([])
      load()
    } catch (err) { toast.error('Gagal: ' + err.message) }
  }

  function delMove(mv) {
    if (mv.transaction_id) return toast.error('Mutasi otomatis dari transaksi — batalkan lewat Riwayat Transaksi (Void), bukan di sini')
    ask('Hapus mutasi ini? Stok akan disesuaikan otomatis (mutasi masuk dikurangi, mutasi keluar dikembalikan).', async () => {
      try {
        const vrow = variants.find(v => v.id === mv.variant_id)
        if (vrow && vrow.stock_type !== 'imei') {
          const cur = +vrow.stock_qty || 0
          const next = mv.direction === 'in' ? Math.max(0, cur - (+mv.qty || 0)) : cur + (+mv.qty || 0)
          await supabase.from('product_variants').update({ stock_qty: next }).eq('id', mv.variant_id)
        } else if (vrow && mv.imei) {
          if (mv.direction === 'out') { await supabase.from('product_imeis').update({ status: 'available' }).eq('imei', mv.imei) }
          else {
            const { data: row } = await supabase.from('product_imeis').select('status').eq('imei', mv.imei).maybeSingle()
            if (row?.status === 'available') await supabase.from('product_imeis').delete().eq('imei', mv.imei)
            else toast.info('IMEI sudah terjual — baris IMEI tidak dihapus, hanya mutasinya')
          }
        }
        const { error } = await supabase.from('stock_movements').delete().eq('id', mv.id)
        if (error) throw error
        toast.success('Mutasi dihapus & stok disesuaikan'); load()
      } catch (err) { toast.error('Gagal: ' + err.message) }
    })
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin" /></div>
  const actions = (<button onClick={() => { setFm({ variant_id: '', direction: 'in', reason: 'pembelian', qty: 1, imeis: '', note: '', mitra_id: '', unit_value: 0 }); setAvailImeis([]); setExistImeis([]); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm text-sm font-medium"><Plus className="w-4 h-4" />Catat Mutasi Stok</button>)
  const vrow = variants.find(v => v.id === fm.variant_id)
  return (
    <div className="p-6 lg:p-8">
      <PageHeader subtitle="Kartu stok: catat & lacak semua barang masuk/keluar beserta alasannya" actions={actions} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3"><div className="p-2.5 rounded-lg bg-green-50 w-fit"><ArrowDownToLine className="w-5 h-5 text-green-600" /></div><div><p className="text-xs text-gray-500 uppercase font-medium">Barang Masuk (periode ini)</p><p className="text-xl font-bold text-green-600">{inSum} unit</p></div></div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3"><div className="p-2.5 rounded-lg bg-red-50 w-fit"><ArrowUpFromLine className="w-5 h-5 text-red-600" /></div><div><p className="text-xs text-gray-500 uppercase font-medium">Barang Keluar (periode ini)</p><p className="text-xl font-bold text-red-600">{outSum} unit</p></div></div>
      </div>
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><PackagePlus className="w-5 h-5 text-[#0058A3]" />Riwayat Mutasi Stok</h3>
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="text-sm border rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#0058A3]" />
          <span className="text-gray-400">s/d</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="text-sm border rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#0058A3]" />
          <select value={dirFilter} onChange={e => setDirFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-white"><option value="all">Semua arah</option><option value="in">Masuk</option><option value="out">Keluar</option></select>
          <div className="flex-1 min-w-[160px] relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari produk / IMEI / mitra / catatan..." className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0058A3]" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">Tanggal</th><th className="text-left p-3">Produk</th><th className="text-left p-3">Arah</th><th className="text-left p-3">Alasan</th><th className="text-right p-3">Qty</th><th className="text-left p-3">IMEI</th><th className="text-left p-3">Catatan</th><th className="text-right p-3">Aksi</th></tr></thead>
            <tbody className="divide-y">
              {fMoves.map(x => (
                <tr key={x.id} className="hover:bg-gray-50">
                  <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{new Date(x.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="p-3 text-sm"><p className="font-medium truncate max-w-[200px]">{x.product_name || '—'}</p><p className="text-xs text-gray-500">{x.variant_label || ''}</p></td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${x.direction === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{x.direction === 'in' ? 'MASUK' : 'KELUAR'}</span></td>
                  <td className="p-3 text-sm text-gray-700">{reasonLabel(x.direction, x.reason)}{x.mitra_id && <span className="block text-[11px] text-gray-400">Mitra: {ptmap[x.mitra_id] || '—'}</span>}{x.created_by && <span className="block text-[11px] text-gray-400">oleh {x.created_by}</span>}</td>
                  <td className={`p-3 text-sm text-right font-bold ${x.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>{x.direction === 'in' ? '+' : '-'}{x.qty}</td>
                  <td className="p-3 text-xs font-mono text-gray-500">{x.imei || '—'}</td>
                  <td className="p-3 text-sm text-gray-600 max-w-[200px] truncate">{x.note || '—'}</td>
                  <td className="p-3 text-right">{!x.transaction_id && <button onClick={() => delMove(x)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Hapus mutasi"><Trash2 className="w-4 h-4" /></button>}</td>
                </tr>
              ))}
              {!fMoves.length && <tr><td colSpan={8} className="p-10 text-center text-gray-400 text-sm">Belum ada mutasi pada rentang ini. Klik "Catat Mutasi Stok" untuk mulai mencatat.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Catat Mutasi Stok"
        footer={<button form="mvForm" type="submit" className="w-full py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Simpan Mutasi</button>}>
        <form id="mvForm" onSubmit={submit} className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Produk / Varian *</label>
            <select required value={fm.variant_id} onChange={e => pickVariant(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0058A3]">
              <option value="">— pilih —</option>
              {grouped.map(g => <optgroup key={g.pname} label={g.pname}>{g.items.map(v => <option key={v.id} value={v.id}>{v.label}{v.stock_type === 'imei' ? ' (unit IMEI)' : ` · stok: ${+v.stock_qty || 0}`}</option>)}</optgroup>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Arah *</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDir('in')} className={`py-2.5 rounded-lg border-2 font-medium text-sm flex items-center justify-center gap-2 ${fm.direction === 'in' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}><ArrowDownToLine className="w-4 h-4" />Masuk</button>
              <button type="button" onClick={() => setDir('out')} className={`py-2.5 rounded-lg border-2 font-medium text-sm flex items-center justify-center gap-2 ${fm.direction === 'out' ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}><ArrowUpFromLine className="w-4 h-4" />Keluar</button>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Alasan *</label>
            <select required value={fm.reason} onChange={e => setFm({ ...fm, reason: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0058A3]">
              {REASONS[fm.direction].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {isCons(fm.reason) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
              <div><label className="block text-sm font-medium text-amber-800 mb-1.5">Mitra (pemilik titipan) *</label>
                <select required value={fm.mitra_id} onChange={e => setFm({ ...fm, mitra_id: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="">— pilih mitra —</option>
                  {partners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                {!partners.length && <p className="text-[11px] text-red-500 mt-1">Belum ada mitra — tambahkan dulu di halaman Konsinyasi.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1.5">Harga Titipan / Unit (nilai hutang ke mitra) *</label>
                <RupiahInput value={fm.unit_value} onChange={x => setFm({ ...fm, unit_value: x })} className="w-full px-4 py-2.5 border rounded-lg outline-none text-right focus:ring-2 focus:ring-amber-400" placeholder="0" />
                <p className="text-[11px] text-amber-700 mt-1">Hutang otomatis tercatat di halaman Konsinyasi. Samakan juga HPP varian di Master Barang dengan harga ini agar laba akurat.</p>
              </div>
            </div>
          )}
          {vrow && vrow.stock_type === 'imei' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">IMEI (satu per baris) *</label>
              <textarea value={fm.imeis} onChange={e => setFm({ ...fm, imeis: e.target.value })} rows={3} placeholder={'356789012345671\n356789012345672'} className="w-full px-3 py-2 border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-[#0058A3]" />
              <p className="text-[11px] text-gray-400 mt-0.5">{fm.direction === 'out' ? `Tersedia: ${availImeis.length} unit — ketik IMEI yang ada di daftar` : 'IMEI yang sudah terdaftar akan diaktifkan ulang otomatis'}</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Jumlah (unit/pcs) *</label>
              <input type="number" min="1" required value={fm.qty} onChange={e => setFm({ ...fm, qty: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" />
              {vrow && <p className="text-[11px] text-gray-400 mt-0.5">Stok sekarang: {+vrow.stock_qty || 0} → akan jadi: {fm.direction === 'in' ? (+vrow.stock_qty || 0) + (+fm.qty || 0) : Math.max(0, (+vrow.stock_qty || 0) - (+fm.qty || 0))}{isCons(fm.reason) ? ` · hutang: ${rp((+fm.unit_value || 0) * (+fm.qty || 0))}` : ''}</p>}
            </div>
          )}
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan</label><input value={fm.note} onChange={e => setFm({ ...fm, note: e.target.value })} placeholder="cth: titipan Bpk. Andi / layar pecah / opname gudang" className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" /></div>
        </form>
      </Modal>
      <Confirm open={!!cf} danger message={cf?.message} confirmText="Ya, Hapus" onClose={() => setCf(null)} onConfirm={async () => { const a = cf.action; setCf(null); await a() }} />
    </div>
  )
}
