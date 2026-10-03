import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useStoreSettings } from '../lib/useStoreSettings'
import { Confirm, Modal, RupiahInput, useToast, rp } from '../components/ui'
import { Users, Package, FileText, Plus, Edit2, Trash2, Check, Search, Printer, Wallet, Repeat, Calendar, Lock } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const thisMonth = () => format(new Date(), 'yyyy-MM')
const monthRange = m => {
  const [y, mo] = m.split('-').map(Number)
  const s = new Date(y, mo - 1, 1, 0, 0, 0)
  const e = new Date(y, mo - 1, 1, 23, 59, 59, 999); e.setMonth(e.getMonth() + 1); e.setDate(0)
  return { from: s.toISOString(), to: e.toISOString(), label: format(s, 'MMMM yyyy', { locale: localeId }) }
}

export default function Konsinyasi() {
  const toast = useToast(); const ST = useStoreSettings()
  const [tab, setTab] = useState('konsinyan')
  const [owners, setOwners] = useState([])
  const [items, setItems] = useState([]); const [itemStats, setItemStats] = useState({})
  const [stmt, setStmt] = useState([]); const [stmtSummary, setStmtSummary] = useState({ owed: 0, paid: 0, margin: 0, outstanding: 0 })
  const [month, setMonth] = useState(thisMonth())
  const [loading, setLoading] = useState(true)

  const [showOwner, setShowOwner] = useState(false); const [editOwner, setEditOwner] = useState(null); const [fo, setFo] = useState({ name: '', phone: '', address: '' })
  const [showItem, setShowItem] = useState(false); const [editItem, setEditItem] = useState(null); const [fi, setFi] = useState({ owner_id: '', name: '', stock_type: 'qty', qty_total: 1, consignor_price: 0, our_price: 0, start_date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
  const [showPay, setShowPay] = useState(false); const [payOwner, setPayOwner] = useState(null); const [fp, setFp] = useState({ amount: 0, note: '' })
  const [cf, setCf] = useState(null); const ask = (message, action) => setCf({ message, action })

  useEffect(() => { loadOwners() }, [])
  useEffect(() => { if (tab === 'barang') loadItems(); if (tab === 'laporan') loadStmt(month) }, [tab, month])

  async function loadOwners() {
    const { data, error } = await supabase.from('consignment_owners').select('*').order('name')
    if (error) toast.error('Ambil konsinyan: ' + error.message)
    setOwners(data || [])
  }
  async function loadItems() {
    setLoading(true)
    const { data, error } = await supabase.from('consignment_items').select('*, consignment_owners(name)').order('created_at', { ascending: false })
    if (error) { toast.error('Ambil barang titipan: ' + error.message); setLoading(false); return }
    setItems(data || [])
    // hitung terjual all-time per item dari transaksi paid
    const { data: txs, error: e2 } = await supabase.from('transactions').select('created_at, transaction_items(product_id, imei, qty, price_at_sale, hpp_at_sale)').eq('payment_status', 'paid').order('created_at', { ascending: false })
    if (e2) toast.error('Ambil penjualan: ' + e2.message)
    const v2item = {}; (data || []).forEach(it => { if (it.variant_id) v2item[it.variant_id] = it.id })
    const stats = {}; (data || []).forEach(it => { stats[it.id] = { sold: 0, owed: 0, gross: 0, margin: 0 } })
    ;(txs || []).forEach(t => (t.transaction_items || []).forEach(i => {
      const iid = v2item[i.product_id]; if (!iid) return
      const q = +i.qty || 1; const s = stats[iid]
      s.sold += q; s.owed += (+i.hpp_at_sale || 0) * q; s.gross += (+i.price_at_sale || 0) * q; s.margin += ((+i.price_at_sale || 0) - (+i.hpp_at_sale || 0)) * q
    }))
    setItemStats(stats); setLoading(false)
  }
  async function loadStmt(m) {
    setLoading(true)
    const r = monthRange(m)
    const [itRes, txRes, payMonth, payAll] = await Promise.all([
      supabase.from('consignment_items').select('*, consignment_owners(id,name)'),
      supabase.from('transactions').select('created_at, transaction_items(product_id, imei, qty, price_at_sale, hpp_at_sale)').eq('payment_status', 'paid').gte('created_at', r.from).lte('created_at', r.to),
      supabase.from('consignment_payments').select('owner_id, amount').eq('period_month', m),
      supabase.from('consignment_payments').select('owner_id, amount')
    ])
    if (itRes.error) toast.error('Ambil item: ' + itRes.error.message)
    if (txRes.error) toast.error('Ambil transaksi: ' + txRes.error.message)
    const itemsArr = itRes.data || []
    const v2item = {}; itemsArr.forEach(it => { if (it.variant_id) v2item[it.variant_id] = it })
    const byOwner = {}; const ensure = o => (byOwner[o.id] = byOwner[o.id] || { id: o.id, name: o.name, units: 0, gross: 0, owed: 0, margin: 0, lines: {} })
    itemsArr.forEach(it => ensure(it.consignment_owners || { id: it.owner_id, name: '?' }))
    ;(txRes.data || []).forEach(t => (t.transaction_items || []).forEach(i => {
      const it = v2item[i.product_id]; if (!it) return
      const o = it.consignment_owners || { id: it.owner_id, name: '?' }; const b = ensure(o)
      const q = +i.qty || 1; const owed = (+i.hpp_at_sale || 0) * q; const gross = (+i.price_at_sale || 0) * q
      b.units += q; b.owed += owed; b.gross += gross; b.margin += gross - owed
      const L = b.lines[it.id] = b.lines[it.id] || { name: it.name, units: 0, consignor_price: +it.consignor_price || 0, our_price: +it.our_price || 0, owed: 0, gross: 0 }
      L.units += q; L.owed += owed; L.gross += gross
    }))
    const paidM = {}; (payMonth.data || []).forEach(p => paidM[p.owner_id] = (paidM[p.owner_id] || 0) + (+p.amount || 0))
    const paidAll = {}; (payAll.data || []).forEach(p => paidAll[p.owner_id] = (paidAll[p.owner_id] || 0) + (+p.amount || 0))
    // outstanding all-time = total owed all-time - total paid all-time ; hitung owed all-time via transaksi all-time ringan
    const { data: txAll } = await supabase.from('transactions').select('transaction_items(product_id, qty, hpp_at_sale)').eq('payment_status', 'paid')
    const owedAll = {}; (txAll || []).forEach(t => (t.transaction_items || []).forEach(i => { const it = v2item[i.product_id]; if (it) { const oid = (it.consignment_owners || {}).id || it.owner_id; owedAll[oid] = (owedAll[oid] || 0) + (+i.hpp_at_sale || 0) * (+i.qty || 1) } }))
    const rows = Object.values(byOwner).map(b => ({ ...b, paid_month: paidM[b.id] || 0, paid_all: paidAll[b.id] || 0, owed_all: owedAll[b.id] || 0, sisa_month: Math.max(0, b.owed - (paidM[b.id] || 0)), outstanding: Math.max(0, (owedAll[b.id] || 0) - (paidAll[b.id] || 0)) }))
    rows.sort((a, b) => b.owed - a.owed)
    setStmt(rows)
    setStmtSummary({ owed: rows.reduce((a, x) => a + x.owed, 0), paid: rows.reduce((a, x) => a + x.paid_month, 0), margin: rows.reduce((a, x) => a + x.margin, 0), outstanding: rows.reduce((a, x) => a + x.outstanding, 0) })
    setLoading(false)
  }

  // ===== owners =====
  async function saveOwner(e) {
    e.preventDefault(); if (!fo.name.trim()) return toast.error('Nama konsinyan wajib diisi')
    const payload = { name: fo.name.trim(), phone: fo.phone, address: fo.address }
    try { if (editOwner) { const { error } = await supabase.from('consignment_owners').update(payload).eq('id', editOwner.id); if (error) throw error; toast.success('Konsinyan diupdate') } else { const { error } = await supabase.from('consignment_owners').insert(payload); if (error) throw error; toast.success('Konsinyan ditambahkan') } setShowOwner(false); setEditOwner(null); setFo({ name: '', phone: '', address: '' }); loadOwners() } catch (err) { toast.error(err.message) }
  }
  function delOwner(id) { ask('Hapus konsinyan ini? Barang titipannya juga terhapus dari daftar (katalog & riwayat tetap aman).', async () => { const { error } = await supabase.from('consignment_owners').delete().eq('id', id); if (error) toast.error(error.message); else toast.success('Konsinyan dihapus'); loadOwners(); if (tab === 'barang') loadItems() }) }

  // ===== items =====
  async function saveItem(e) {
    e.preventDefault()
    if (!fi.owner_id) return toast.error('Pilih konsinyan')
    if (!fi.name.trim()) return toast.error('Nama barang wajib diisi')
    if (+fi.qty_total <= 0) return toast.error('Jumlah unit harus > 0')
    if (+fi.our_price <= 0) return toast.error('Harga kita jual harus > 0')
    try {
      if (editItem) {
        const { error } = await supabase.from('consignment_items').update({ name: fi.name.trim(), consignor_price: +fi.consignor_price || 0, our_price: +fi.our_price || 0, notes: fi.notes, status: editItem.status }).eq('id', editItem.id)
        if (error) throw error
        if (editItem.variant_id) await supabase.from('product_variants').update({ harga_jual: +fi.our_price || 0, hpp: +fi.consignor_price || 0 }).eq('id', editItem.variant_id)
        toast.success('Barang titipan diupdate'); setShowItem(false); setEditItem(null); resetItem(); loadItems(); return
      }
      const { data: item, error: e0 } = await supabase.from('consignment_items').insert({ owner_id: fi.owner_id, name: fi.name.trim(), stock_type: fi.stock_type, qty_total: +fi.qty_total, consignor_price: +fi.consignor_price || 0, our_price: +fi.our_price || 0, start_date: fi.start_date, notes: fi.notes }).select().single()
      if (e0) throw e0
      const { data: prod, error: e1 } = await supabase.from('products').insert({ name: fi.name.trim(), category: 'Konsinyasi', stock_type: fi.stock_type, type: 'consignment', status: 'active', consignment_owner_id: fi.owner_id, consignment_split: null }).select().single()
      if (e1) throw e1
      const { data: varr, error: e2 } = await supabase.from('product_variants').insert({ product_id: prod.id, storage: '-', color: fi.name.trim().slice(0, 40), harga_jual: +fi.our_price || 0, hpp: +fi.consignor_price || 0, stock_qty: fi.stock_type === 'qty' ? +fi.qty_total : 0, consignment_item_id: item.id }).select().single()
      if (e2) throw e2
      if (fi.stock_type === 'imei') { const arr = Array.from({ length: +fi.qty_total }, (_, i) => `CON-${Date.now()}-${i + 1}`); await supabase.from('product_imeis').insert(arr.map(im => ({ variant_id: varr.id, imei: im, status: 'available' }))) }
      await supabase.from('consignment_items').update({ product_id: prod.id, variant_id: varr.id }).eq('id', item.id)
      toast.success('Barang titipan terdaftar & siap dijual di POS'); setShowItem(false); resetItem(); loadItems()
    } catch (err) { toast.error('Gagal: ' + err.message) }
  }
  function resetItem() { setFi({ owner_id: owners[0]?.id || '', name: '', stock_type: 'qty', qty_total: 1, consignor_price: 0, our_price: 0, start_date: format(new Date(), 'yyyy-MM-dd'), notes: '' }) }
  function editItemFn(it) { setEditItem(it); setFi({ owner_id: it.owner_id, name: it.name, stock_type: it.stock_type, qty_total: it.qty_total, consignor_price: it.consignor_price, our_price: it.our_price, start_date: it.start_date, notes: it.notes || '' }); setShowItem(true) }
  async function toggleItem(it) { const ns = it.status === 'active' ? 'closed' : 'active'; const { error } = await supabase.from('consignment_items').update({ status: ns }).eq('id', it.id); if (error) toast.error(error.message); else { toast.success(ns === 'closed' ? 'Ditutup' : 'Dibuka kembali'); if (it.product_id) await supabase.from('products').update({ status: ns === 'closed' ? 'inactive' : 'active' }).eq('id', it.product_id); loadItems() } }
  function delItem(it) {
    ask(`Hapus "${it.name}" dari daftar titipan?${it.variant_id ? '\nSistem cek dulu: kalau sudah ada yang terjual, tidak bisa dihapus (riwayat harus utuh).' : ''}`, async () => {
      try {
        if (it.variant_id) { const { data: cnt } = await supabase.from('transaction_items').select('id', { count: 'exact', head: true }).eq('product_id', it.variant_id); if ((cnt || 0) > 0) return toast.error('Tidak bisa dihapus — sudah ada penjualan terkait. Tutup saja statusnya.') }
        if (it.product_id) await supabase.from('products').delete().eq('id', it.product_id)
        const { error } = await supabase.from('consignment_items').delete().eq('id', it.id); if (error) throw error
        toast.success('Barang titipan dihapus'); loadItems()
      } catch (err) { toast.error(err.message) }
    })
  }

  // ===== payments =====
  async function savePay(e) {
    e.preventDefault(); if (!payOwner || !+fp.amount) return toast.error('Nominal pembayaran wajib diisi')
    try { const { error } = await supabase.from('consignment_payments').insert({ owner_id: payOwner.id, amount: +fp.amount, period_month: month, note: fp.note }); if (error) throw error; toast.success('Pembayaran tercatat'); setShowPay(false); setPayOwner(null); setFp({ amount: 0, note: '' }); loadStmt(month) } catch (err) { toast.error(err.message) }
  }
  function printStmt(row) {
    const r = monthRange(month); const lines = Object.values(row.lines || {})
    const body = lines.map(L => `<tr><td>${L.name}</td><td style="text-align:right">${L.units}</td><td style="text-align:right">${rp(L.consignor_price)}</td><td style="text-align:right">${rp(L.our_price)}</td><td style="text-align:right">${rp(L.owed)}</td></tr>`).join('')
    const w = window.open('', '_blank', 'width=720,height=900'); if (!w) return toast.error('Izinkan pop-up untuk cetak')
    w.document.write(`<html><head><title>Laporan Konsinyasi ${row.name} ${r.label}</title><style>body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:24px;max-width:680px;margin:0 auto}h1{font-size:18px;margin:0}.muted{color:#555;font-size:12px}table{width:100%;border-collapse:collapse;margin:14px 0}th,td{border:1px solid #ccc;padding:6px 8px;font-size:12px}th{background:#f3f4f6;text-align:left}.tot td{font-weight:bold;border-top:2px solid #111}.sig{margin-top:48px;display:flex;justify-content:space-between}.sig div{text-align:center}.line{display:inline-block;width:180px;border-top:1px solid #111;margin-top:36px}</style></head><body>
      <h1>${ST.store_name || 'TOKO'}</h1><div class="muted">${ST.address || ''} ${ST.whatsapp ? '· ' + ST.whatsapp : ''}</div>
      <h2 style="font-size:15px;margin:18px 0 4px">LAPORAN KONSINYASI — ${r.label}</h2>
      <div>Kepada Yth. <strong>${row.name}</strong> (Konsinyan)</div>
      <table><thead><tr><th>Barang Titipan</th><th style="text-align:right">Unit Terjual</th><th style="text-align:right">Harga Dari Anda /unit</th><th style="text-align:right">Harga Kami Jual /unit</th><th style="text-align:right">Kewajiban Kami</th></tr></thead><tbody>${body || '<tr><td colspan="5" style="text-align:center;color:#888">Tidak ada penjualan bulan ini</td></tr>'}</tbody>
      <tfoot><tr class="tot"><td>TOTAL</td><td style="text-align:right">${row.units}</td><td></td><td></td><td style="text-align:right">${rp(row.owed)}</td></tr></tfoot></table>
      <table style="border:none"><tr><td style="border:none">Nilai Penjualan ke Customer</td><td style="border:none;text-align:right">${rp(row.gross)}</td></tr>
      <tr><td style="border:none">Kewajiban dibayar kepada Anda</td><td style="border:none;text-align:right">${rp(row.owed)}</td></tr>
      <tr><td style="border:none">Keuntungan Toko (selisih)</td><td style="border:none;text-align:right">${rp(row.margin)}</td></tr>
      <tr><td style="border:none">Sudah Dibayar (bulan ini)</td><td style="border:none;text-align:right">${rp(row.paid_month)}</td></tr>
      <tr class="tot"><td style="border-top:2px solid #111">SISA YANG HARUS KAMI BAYAR (bulan ini)</td><td style="border-top:2px solid #111;text-align:right">${rp(row.sisa_month)}</td></tr>
      <tr><td style="border:none;color:#555">Outstanding seluruh periode</td><td style="border:none;text-align:right;color:#555">${rp(row.outstanding)}</td></tr></table>
      <div class="sig"><div>${format(new Date(), 'dd MMM yyyy', { locale: localeId })}<br><span class="line"></span><br>Petugas Toko</div><div>Anda (Konsinyan)<br><span class="line"></span><br>Tanda Tangan</div></div>
      </body></html>`); w.document.close(); w.focus(); setTimeout(() => w.print(), 350)
  }

  const tabs = [['konsinyan', 'Konsinyan', Users], ['barang', 'Barang Titipan', Package], ['laporan', 'Laporan & Pembayaran', FileText]]
  if (loading && tab !== 'konsinyan') return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-4"><h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Repeat className="w-6 h-6 text-[#0058A3]"/>Konsinyasi</h2><p className="text-sm text-gray-500 mt-0.5">Barang titipan, harga dari konsinyan vs harga jual, laporan & pembayaran akhir bulan</p></div>
      <div className="flex gap-2 mb-6 border-b overflow-x-auto">{tabs.map(([id, l, I]) => (<button key={id} onClick={() => setTab(id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${tab === id ? 'border-[#0058A3] text-[#0058A3]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><I className="w-4 h-4"/>{l}</button>))}</div>

      {tab === 'konsinyan' && <div>
        <div className="flex justify-between items-center mb-4"><p className="text-sm text-gray-500">{owners.length} konsinyan</p><button onClick={() => { setEditOwner(null); setFo({ name: '', phone: '', address: '' }); setShowOwner(true) }} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm text-sm font-medium"><Plus className="w-4 h-4"/>Tambah Konsinyan</button></div>
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">Nama Orang / Toko</th><th className="text-left p-3">No. HP</th><th className="text-left p-3">Alamat</th><th className="text-right p-3">Aksi</th></tr></thead>
          <tbody className="divide-y">{owners.map(o => (<tr key={o.id} className="hover:bg-gray-50"><td className="p-3 text-sm font-medium flex items-center gap-2"><Users className="w-4 h-4 text-gray-400"/>{o.name}</td><td className="p-3 text-sm text-gray-600">{o.phone || '—'}</td><td className="p-3 text-sm text-gray-600 max-w-[260px] truncate">{o.address || '—'}</td><td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setEditOwner(o); setFo({ name: o.name, phone: o.phone || '', address: o.address || '' }); setShowOwner(true) }} className="p-1.5 hover:bg-blue-50 rounded text-[#0058A3]"><Edit2 className="w-4 h-4"/></button><button onClick={() => delOwner(o.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4"/></button></div></td></tr>))}{!owners.length && <tr><td colSpan={4} className="p-12 text-center text-gray-400">Belum ada konsinyan. Tambahkan orang/toko yang menitipkan barang.</td></tr>}</tbody></table></div></div>
      </div>}

      {tab === 'barang' && <div>
        <div className="flex justify-between items-center mb-4"><p className="text-sm text-gray-500">{items.length} batch titipan</p><button onClick={() => { setEditItem(null); resetItem(); setShowItem(true) }} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm text-sm font-medium"><Plus className="w-4 h-4"/>Daftar Barang Titipan</button></div>
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">Konsinyan</th><th className="text-left p-3">Barang</th><th className="text-left p-3">Diterima</th><th className="text-left p-3">Terjual</th><th className="text-left p-3">Sisa</th><th className="text-right p-3">Harga Dari Dia</th><th className="text-right p-3">Harga Kita Jual</th><th className="text-right p-3">Kewajiban (terjual)</th><th className="text-right p-3">Untung Toko</th><th className="text-left p-3">Status</th><th className="text-right p-3">Aksi</th></tr></thead>
          <tbody className="divide-y">{items.map(it => { const s = itemStats[it.id] || { sold: 0, owed: 0, margin: 0 }; const sisa = Math.max(0, (+it.qty_total || 0) - s.sold); return (<tr key={it.id} className="hover:bg-gray-50">
            <td className="p-3 text-sm text-gray-700">{it.consignment_owners?.name || '—'}</td>
            <td className="p-3 text-sm font-medium">{it.name}<span className="block text-[10px] text-gray-400">{it.stock_type === 'imei' ? 'per unit (IMEI)' : 'per pcs'}</span></td>
            <td className="p-3 text-sm">{it.qty_total}</td>
            <td className="p-3 text-sm text-[#0058A3] font-semibold">{s.sold}</td>
            <td className="p-3 text-sm"><span className={sisa <= 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}>{sisa}</span></td>
            <td className="p-3 text-sm text-right text-gray-600">{rp(it.consignor_price)}</td>
            <td className="p-3 text-sm text-right font-medium">{rp(it.our_price)}</td>
            <td className="p-3 text-sm text-right text-amber-700 font-semibold">{rp(s.owed)}</td>
            <td className="p-3 text-sm text-right text-green-600 font-semibold">{rp(s.margin)}</td>
            <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${it.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{it.status === 'active' ? 'AKTIF' : 'TUTUP'}</span></td>
            <td className="p-3 text-right"><div className="flex justify-end gap-1"><button onClick={() => editItemFn(it)} className="p-1.5 hover:bg-blue-50 rounded text-[#0058A3]" title="Edit harga/notes"><Edit2 className="w-4 h-4"/></button><button onClick={() => toggleItem(it)} className="p-1.5 hover:bg-amber-50 rounded text-amber-600" title={it.status === 'active' ? 'Tutup' : 'Buka'}><Lock className="w-4 h-4"/></button><button onClick={() => delItem(it)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Hapus"><Trash2 className="w-4 h-4"/></button></div></td>
          </tr>) })}{!items.length && <tr><td colSpan={11} className="p-12 text-center text-gray-400">Belum ada barang titipan. Daftar untuk mulai — otomatis muncul di POS.</td></tr>}</tbody></table></div></div>
        <p className="mt-3 text-xs text-gray-400">Catatan: untuk menambah unit pada batch yang sama, buat batch baru atau kelola IMEI/stok lewat Master Barang. Harga "Dari Dia" = kewajiban kita per unit terjual; selisih dengan "Kita Jual" = untung toko.</p>
      </div>}

      {tab === 'laporan' && <div>
        <div className="bg-white border rounded-xl p-3 mb-4 flex items-center gap-3 flex-wrap">
          <Calendar className="w-4 h-4 text-gray-400"/><input type="month" value={month} onChange={e => setMonth(e.target.value)} className="text-sm border rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#0058A3]"/>
          <button onClick={() => setMonth(thisMonth())} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium hover:bg-gray-200">Bulan Ini</button>
          <span className="text-sm text-gray-500 ml-auto">{monthRange(month).label}</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Sum label="Kewajiban Bulan Ini" val={rp(stmtSummary.owed)} tone="amber"/><Sum label="Sudah Dibayar (bln ini)" val={rp(stmtSummary.paid)} tone="blue"/><Sum label="Untung Toko (bln ini)" val={rp(stmtSummary.margin)} tone="green"/><Sum label="Outstanding All-Time" val={rp(stmtSummary.outstanding)} tone="red"/>
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">Konsinyan</th><th className="text-left p-3">Unit</th><th className="text-right p-3">Nilai Jual</th><th className="text-right p-3">Kewajiban</th><th className="text-right p-3">Untung Toko</th><th className="text-right p-3">Dibayar Bln Ini</th><th className="text-right p-3">Sisa Bln Ini</th><th className="text-right p-3">Outstanding</th><th className="text-right p-3">Aksi</th></tr></thead>
          <tbody className="divide-y">{stmt.map(row => (<tr key={row.id} className="hover:bg-gray-50">
            <td className="p-3 text-sm font-medium">{row.name}</td>
            <td className="p-3 text-sm">{row.units}</td>
            <td className="p-3 text-sm text-right text-gray-600">{rp(row.gross)}</td>
            <td className="p-3 text-sm text-right text-amber-700 font-semibold">{rp(row.owed)}</td>
            <td className="p-3 text-sm text-right text-green-600 font-semibold">{rp(row.margin)}</td>
            <td className="p-3 text-sm text-right text-[#0058A3]">{rp(row.paid_month)}</td>
            <td className="p-3 text-sm text-right font-bold">{rp(row.sisa_month)}</td>
            <td className="p-3 text-sm text-right text-red-600">{rp(row.outstanding)}</td>
            <td className="p-3 text-right"><div className="flex justify-end gap-1"><button onClick={() => { setPayOwner(row); setFp({ amount: row.sisa_month || row.owed, note: '' }); setShowPay(true) }} className="px-2.5 py-1.5 text-xs border rounded-lg hover:bg-gray-50 text-[#0058A3] flex items-center gap-1"><Wallet className="w-3.5 h-3.5"/>Bayar</button><button onClick={() => printStmt(row)} className="px-2.5 py-1.5 text-xs border rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-1"><Printer className="w-3.5 h-3.5"/>Cetak</button></div></td>
          </tr>))}{!stmt.length && <tr><td colSpan={9} className="p-12 text-center text-gray-400">Tidak ada penjualan konsinyasi pada bulan ini.</td></tr>}</tbody></table></div></div>
      </div>}

      {/* MODALS */}
      <Modal open={showOwner} onClose={() => setShowOwner(false)} title={editOwner ? 'Edit Konsinyan' : 'Tambah Konsinyan'} footer={<button form="ownForm" type="submit" className="w-full py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4"/>{editOwner ? 'Update' : 'Simpan'}</button>}>
        <form id="ownForm" onSubmit={saveOwner} className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Orang / Toko *</label><input required value={fo.name} onChange={e => setFo({ ...fo, name: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder="cth: Budi Santoso / Toko Maju"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">No. HP</label><input value={fo.phone} onChange={e => setFo({ ...fo, phone: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat</label><input value={fo.address} onChange={e => setFo({ ...fo, address: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></div>
        </form>
      </Modal>

      <Modal open={showItem} onClose={() => setShowItem(false)} title={editItem ? 'Edit Barang Titipan' : 'Daftar Barang Titipan'} maxWidth="max-w-lg" footer={<button form="itemForm" type="submit" className="w-full py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4"/>{editItem ? 'Update Harga' : 'Daftarkan & Siapkan di POS'}</button>}>
        <form id="itemForm" onSubmit={saveItem} className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Konsinyan *</label><select required value={fi.owner_id} onChange={e => setFi({ ...fi, owner_id: e.target.value })} disabled={!!editItem} className="w-full px-4 py-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0058A3] disabled:opacity-60"><option value="">— pilih —</option>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>{!owners.length && <p className="text-[11px] text-red-500 mt-1">Belum ada konsinyan — tambahkan di tab Konsinyan dulu.</p>}</div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Barang *</label><input required value={fi.name} onChange={e => setFi({ ...fi, name: e.target.value })} disabled={!!editItem} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3] disabled:opacity-60" placeholder="cth: iPhone 12 128GB Hitam"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe Stok</label><select value={fi.stock_type} onChange={e => setFi({ ...fi, stock_type: e.target.value })} disabled={!!editItem} className="w-full px-4 py-2.5 border rounded-lg bg-white outline-none disabled:opacity-60"><option value="qty">Jumlah (pcs)</option><option value="imei">Per Unit (IMEI)</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Jumlah Unit Diterima *</label><input type="number" min="1" required value={fi.qty_total} onChange={e => setFi({ ...fi, qty_total: e.target.value })} disabled={!!editItem} className="w-full px-4 py-2.5 border rounded-lg outline-none disabled:opacity-60"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Harga Dari Dia (kewajiban/unit) *</label><RupiahInput value={fi.consignor_price} onChange={x => setFi({ ...fi, consignor_price: x })} className="w-full px-4 py-2.5 border rounded-lg outline-none text-right focus:ring-2 focus:ring-[#0058A3]" placeholder="0"/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Harga Kita Jual (unit) *</label><RupiahInput value={fi.our_price} onChange={x => setFi({ ...fi, our_price: x })} className="w-full px-4 py-2.5 border rounded-lg outline-none text-right focus
