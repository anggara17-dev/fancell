import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import { Confirm, Modal, RupiahInput, useToast, rp } from '../components/ui'
import { Users, Plus, Edit2, Trash2, Check, Wallet, History, Phone, BadgeCheck } from 'lucide-react'
import { format } from 'date-fns'

const today = () => format(new Date(), 'yyyy-MM-dd')
const fmtDate = d => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

export default function Konsinyasi() {
  const toast = useToast(); const { user } = useAuth()
  const [partners, setPartners] = useState([]); const [moves, setMoves] = useState([]); const [pays, setPays] = useState([]); const [imeiStatus, setImeiStatus] = useState({})
  const [loading, setLoading] = useState(true)
  const [showPartner, setShowPartner] = useState(false); const [editPartner, setEditPartner] = useState(null); const [fp, setFp] = useState({ name: '', phone: '', address: '' })
  const [detailId, setDetailId] = useState(null)
  const [showPay, setShowPay] = useState(false); const [payId, setPayId] = useState(null); const [fpay, setFpay] = useState({ amount: 0, note: '', pay_date: today() })
  const [cf, setCf] = useState(null); const ask = (message, action) => setCf({ message, action })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [p, mv, py, im] = await Promise.all([
      supabase.from('consignment_partners').select('*').order('name'),
      supabase.from('stock_movements').select('*').not('mitra_id', 'is', null).order('created_at', { ascending: false }).limit(1000),
      supabase.from('consignment_payments').select('*').order('pay_date', { ascending: false }),
      supabase.from('product_imeis').select('imei,status')
    ])
    if (p.error) toast.error('Mitra: ' + p.error.message)
    if (mv.error) toast.error('Mutasi: ' + mv.error.message)
    if (py.error) toast.error('Pembayaran: ' + py.error.message + ' (jalankan SQL konsinyasi dulu)')
    const st = {}; (im.data || []).forEach(x => { st[x.imei] = x.status })
    setPartners(p.data || []); setMoves(mv.data || []); setPays(py.data || []); setImeiStatus(st); setLoading(false)
  }

  const pname = id => (partners.find(x => x.id === id) || {}).name || '—'

  function stats(pid) {
    const ins = moves.filter(m => m.mitra_id === pid && m.direction === 'in' && m.reason === 'konsinyasi')
    const rets = moves.filter(m => m.mitra_id === pid && m.direction === 'out' && m.reason === 'konsinyasi_retur')
    const titipan = ins.reduce((a, m) => a + (+m.qty || 0) * (+m.unit_value || 0), 0)
    const retur = rets.reduce((a, m) => a + (+m.qty || 0) * (+m.unit_value || 0), 0)
    const dibayar = pays.filter(x => x.partner_id === pid).reduce((a, x) => a + (+x.amount || 0), 0)
    const unit = ins.reduce((a, m) => a + (+m.qty || 0), 0)
    const hutang = titipan - retur
    const sisa = hutang - dibayar
    return { ins, rets, titipan, retur, dibayar, unit, hutang, sisa }
  }

  function ledger(pid) {
    const s = stats(pid); const rows = []
    s.ins.forEach(m => rows.push({ k: 'in', id: m.id, date: m.created_at, name: m.product_name, label: m.variant_label, qty: m.qty, imei: m.imei, val: (+m.qty || 0) * (+m.unit_value || 0), sold: m.imei ? imeiStatus[m.imei] === 'sold' : false, note: m.note }))
    s.rets.forEach(m => rows.push({ k: 'ret', id: m.id, date: m.created_at, name: m.product_name, label: m.variant_label, qty: m.qty, imei: m.imei, val: (+m.qty || 0) * (+m.unit_value || 0), note: m.note }))
    pays.filter(x => x.partner_id === pid).forEach(x => rows.push({ k: 'pay', id: x.id, date: x.created_at, name: x.note || 'Pembayaran ke mitra', qty: null, imei: null, val: +x.amount || 0 }))
    rows.sort((a, b) => (a.date < b.date ? 1 : -1))
    return rows
  }

  function openAddPartner() { setEditPartner(null); setFp({ name: '', phone: '', address: '' }); setShowPartner(true) }
  function openEditPartner(o) { setEditPartner(o); setFp({ name: o.name, phone: o.phone || '', address: o.address || '' }); setShowPartner(true) }
  async function savePartner(e) {
    e.preventDefault()
    if (!fp.name.trim()) return toast.error('Nama mitra wajib diisi')
    try {
      const payload = { name: fp.name.trim(), phone: fp.phone, address: fp.address }
      if (editPartner) { const { error } = await supabase.from('consignment_partners').update(payload).eq('id', editPartner.id); if (error) throw error; toast.success('Mitra diupdate') }
      else { const { error } = await supabase.from('consignment_partners').insert(payload); if (error) throw error; toast.success('Mitra ditambahkan — sekarang bisa titip barang lewat Stok Masuk/Keluar') }
      setShowPartner(false); setEditPartner(null); load()
    } catch (err) { toast.error(err.message) }
  }
  function delPartner(o) {
    ask(`Hapus mitra "${o.name}"? Riwayat pembayarannya ikut terhapus. Riwayat barang titipan lama tetap ada di Stok Masuk/Keluar (tanpa nama mitra).`, async () => {
      try {
        await supabase.from('consignment_payments').delete().eq('partner_id', o.id)
        const { error } = await supabase.from('consignment_partners').delete().eq('id', o.id)
        if (error) throw error
        toast.success('Mitra dihapus')
      } catch (err) { toast.error(err.message) }
      load()
    })
  }

  function openPay(pid) {
    const s = stats(pid)
    if (s.hutang <= 0) return toast.info('Belum ada hutang ke mitra ini')
    setPayId(pid); setFpay({ amount: Math.max(0, s.sisa), note: '', pay_date: today() }); setShowPay(true)
  }
  async function savePay(e) {
    e.preventDefault()
    const s = stats(payId); const amount = +fpay.amount || 0
    if (amount <= 0) return toast.error('Nominal harus > 0')
    if (amount > s.sisa) return toast.error('Nominal melebihi sisa hutang (' + rp(s.sisa) + ')')
    try {
      const { error } = await supabase.from('consignment_payments').insert({ partner_id: payId, amount, note: fpay.note || null, pay_date: fpay.pay_date, created_by: user?.username || '-' })
      if (error) throw error
      const after = s.sisa - amount
      toast.success(after <= 0.5 ? `LUNAS! Hutang ke ${pname(payId)} sudah terbayar 🎉` : 'Pembayaran tercatat, sisa ' + rp(after))
      setShowPay(false); setPayId(null); load()
    } catch (err) { toast.error(err.message) }
  }
  function delPay(x) {
    ask('Hapus catatan pembayaran ini? Sisa hutang akan bertambah kembali.', async () => {
      const { error } = await supabase.from('consignment_payments').delete().eq('id', x.id)
      if (error) toast.error(error.message); else toast.success('Pembayaran dihapus')
      load()
    })
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin" /></div>
  const detail = detailId ? partners.find(x => x.id === detailId) : null
  const dRows = detailId ? ledger(detailId) : []
  const dStat = detailId ? stats(detailId) : null
  const actions = (<button onClick={openAddPartner} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm text-sm font-medium"><Plus className="w-4 h-4" />Tambah Mitra</button>)
  return (
    <div className="p-6 lg:p-8">
      <PageHeader subtitle="Titipan mitra: hutang, pembayaran & riwayat barang konsinyasi" actions={actions} />
      {!partners.length ? (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
          <Users className="w-14 h-14 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Belum ada mitra</p>
          <p className="text-sm text-gray-400 mt-1">Tambahkan mitra dulu, lalu catat barang titipannya lewat menu <b>Stok Masuk/Keluar</b> dengan alasan "Barang Konsinyasi".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {partners.map(o => { const s = stats(o.id); const lunas = s.hutang > 0 && s.sisa <= 0.5
            return (
            <div key={o.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#0058A3] to-[#004080] rounded-full flex items-center justify-center font-bold text-white flex-shrink-0">{o.name?.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0"><p className="font-bold text-gray-900 truncate">{o.name}</p><p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{o.phone || '—'}</p></div>
                </div>
                {lunas ? <span className="flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-700 text-[10px] font-bold flex-shrink-0"><BadgeCheck className="w-3.5 h-3.5" />LUNAS</span> : s.unit > 0 ? <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-[10px] font-bold flex-shrink-0">ADA SISA</span> : <span className="px-2 py-1 rounded bg-gray-100 text-gray-500 text-[10px] font-bold flex-shrink-0">BELUM ADA TITIPAN</span>}
              </div>
              <p className="text-xs text-gray-500 uppercase font-medium">Sisa Hutang ke Mitra</p>
              <p className={`text-2xl font-bold ${s.sisa > 0 ? 'text-red-600' : 'text-green-600'}`}>{rp(s.sisa)}</p>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-500 uppercase">Titipan</p><p className="text-sm font-bold">{rp(s.titipan)}</p></div>
                <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-500 uppercase">Dibayar</p><p className="text-sm font-bold text-green-600">{rp(s.dibayar)}</p></div>
                <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-500 uppercase">Unit</p><p className="text-sm font-bold">{s.unit}</p></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setDetailId(o.id)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-1.5"><History className="w-4 h-4" />Riwayat</button>
                <button onClick={() => openPay(o.id)} className="flex-1 px-3 py-2 bg-[#0058A3] text-white rounded-lg text-sm font-medium hover:bg-[#004080] flex items-center justify-center gap-1.5"><Wallet className="w-4 h-4" />Bayar</button>
                <button onClick={() => openEditPartner(o)} className="p-2 border border-gray-300 rounded-lg text-[#0058A3] hover:bg-blue-50"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => delPartner(o)} className="p-2 border border-gray-300 rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>) })}
        </div>
      )}

      {/* DETAIL RIWAYAT MITRA */}
      <Modal open={!!detail} onClose={() => setDetailId(null)} title={detail ? `Riwayat — ${detail.name}` : ''} maxWidth="max-w-3xl">
        {detail && dStat && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-500 uppercase">Total Titipan</p><p className="text-sm font-bold">{rp(dStat.titipan)}</p></div>
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-500 uppercase">Retur</p><p className="text-sm font-bold">{rp(dStat.retur)}</p></div>
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-500 uppercase">Dibayar</p><p className="text-sm font-bold text-green-600">{rp(dStat.dibayar)}</p></div>
              <div className="bg-blue-50 rounded-lg p-2"><p className="text-[10px] text-gray-500 uppercase">Sisa Hutang</p><p className="text-sm font-bold text-[#0058A3]">{rp(dStat.sisa)}</p></div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[45vh] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0"><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-2.5">Tanggal</th><th className="text-left p-2.5">Jenis</th><th className="text-left p-2.5">Barang / Keterangan</th><th className="text-right p-2.5">Qty</th><th className="text-right p-2.5">Nilai</th><th className="p-2.5"></th></tr></thead>
                  <tbody className="divide-y">
                    {dRows.map(r => (
                      <tr key={r.k + r.id} className="hover:bg-gray-50">
                        <td className="p-2.5 text-xs text-gray-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className="p-2.5"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.k === 'in' ? 'bg-red-100 text-red-600' : r.k === 'ret' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>{r.k === 'in' ? 'MASUK' : r.k === 'ret' ? 'RETUR' : 'BAYAR'}</span></td>
                        <td className="p-2.5 text-sm max-w-[260px]"><p className="font-medium truncate">{r.name}</p>{r.label && <p className="text-[11px] text-gray-500">{r.label}</p>}{r.imei && <p className="text-[10px] font-mono text-gray-400">{r.imei}</p>}{r.sold && <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-blue-100 text-[#0058A3] text-[9px] font-bold">TERJUAL (POS)</span>}{r.note && <p className="text-[11px] text-gray-400 truncate">{r.note}</p>}</td>
                        <td className="p-2.5 text-sm text-right">{r.qty ?? '—'}</td>
                        <td className={`p-2.5 text-sm text-right font-semibold whitespace-nowrap ${r.k === 'in' ? 'text-red-600' : 'text-green-600'}`}>{r.k === 'in' ? '+' : '-'} {rp(r.val)}</td>
                        <td className="p-2.5 text-right">{r.k === 'pay' && <button onClick={() => delPay(r)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>}</td>
                      </tr>
                    ))}
                    {!dRows.length && <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm">Belum ada aktivitas. Catat barang titipan lewat Stok Masuk/Keluar.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-[11px] text-gray-400">Tanda <b className="text-red-600">+</b> menambah hutang ke mitra, <b className="text-green-600">−</b> mengurangi (retur/pembayaran). Unit bertanda TERJUAL sudah laku di POS — hutangnya tetap dihitung dari saat barang masuk.</p>
          </div>
        )}
      </Modal>

      {/* MODAL BAYAR */}
      <Modal open={showPay} onClose={() => setShowPay(false)} title={payId ? `Bayar ke ${pname(payId)}` : 'Pembayaran'}
        footer={<button form="payForm" type="submit" className="w-full py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4" />Simpan Pembayaran</button>}>
        <form id="payForm" onSubmit={savePay} className="space-y-3">
          {payId && <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center"><span className="text-sm text-gray-600">Sisa Hutang</span><span className="text-lg font-bold text-[#0058A3]">{rp(stats(payId).sisa)}</span></div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nominal Bayar (Rp) *</label><RupiahInput value={fpay.amount} onChange={x => setFpay({ ...fpay, amount: x })} className="w-full px-4 py-2.5 border rounded-lg outline-none text-right focus:ring-2 focus:ring-[#0058A3]" placeholder="0" /><p className="text-[11px] text-gray-400 mt-1">Kalau nominalnya pas dengan sisa hutang, mitra ini otomatis berstatus LUNAS.</p></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal *</label><input type="date" value={fpay.pay_date} onChange={e => setFpay({ ...fpay, pay_date: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan</label><input value={fpay.note} onChange={e => setFpay({ ...fpay, note: e.target.value })} placeholder="cth: transfer BCA sebagian" className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" /></div>
        </form>
      </Modal>

      {/* MODAL MITRA */}
      <Modal open={showPartner} onClose={() => setShowPartner(false)} title={editPartner ? 'Edit Mitra' : 'Tambah Mitra'}
        footer={<button form="ptForm" type="submit" className="w-full py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4" />Simpan</button>}>
        <form id="ptForm" onSubmit={savePartner} className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Mitra *</label><input required value={fp.name} onChange={e => setFp({ ...fp, name: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">No. WhatsApp</label><input value={fp.phone} onChange={e => setFp({ ...fp, phone: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat</label><input value={fp.address} onChange={e => setFp({ ...fp, address: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" /></div>
        </form>
      </Modal>
      <Confirm open={!!cf} danger message={cf?.message} confirmText="Ya, Hapus" onClose={() => setCf(null)} onConfirm={async () => { const a = cf.action; setCf(null); await a() }} />
    </div>
  )
}
