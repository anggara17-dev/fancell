import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useStoreSettings } from '../lib/useStoreSettings'
import { Confirm, Modal, RupiahInput, useToast, rp } from '../components/ui'
import { Users, Package, FileText, Plus, Edit2, Trash2, Check, Printer, Wallet, Repeat, Calendar, Lock } from 'lucide-react'
import { format } from 'date-fns'
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
  const [loading, setLoading] = useState(false)

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
    const { data: txAll } = await supabase.from('transactions').select('transaction_items(product_id, qty, hpp_at_sale)').eq('payment_status', 'paid')
    const owedAll = {}; (txAll || []).forEach(t => (t.transaction_items || []).forEach(i => { const it = v2item[i.product_id]; if (it) { const oid = (it.consignment_owners || {}).id || it.owner_id; owedAll[oid] = (owedAll[oid] || 0) + (+i.hpp_at_sale || 0) * (+i.qty || 1) } }))
    const rows = Object.values(byOwner).map(b => ({ ...b, paid_month: paidM[b.id] || 0, paid_all: paidAll[b.id] || 0, owed_all: owedAll[b.id] || 0, sisa_month: Math.max(0, b.owed - (paidM[b.id] || 0)), outstanding: Math.max(0, (owedAll[b.id] || 0) - (paidAll[b.id] || 0)) }))
    rows.sort((a, b) => b.owed - a.owed)
    setStmt(rows)
    setStmtSummary({ owed: rows.reduce((a, x) => a + x.owed, 0), paid: rows.reduce((a, x) => a + x.paid_month, 0), margin: rows.reduce((a, x) => a + x.margin, 0), outstanding: rows.reduce((a, x) => a + x.outstanding, 0) })
    setLoading(false)
  }

  async function saveOwner(e) {
    e.preventDefault(); if (!fo.name.trim()) return toast.error('Nama konsinyan wajib diisi')
    const payload = { name: fo.name.trim(), phone: fo.phone, address: fo.address }
    try { if (editOwner) { const { error } = await supabase.from('consignment_owners').update(payload).eq('id', editOwner.id); if (error) throw error; toast.success('Konsinyan diupdate') } else { const { error } = await supabase.from('consignment_owners').insert(payload); if (error) throw error; toast.success('Konsinyan ditambahkan') } setShowOwner(false); setEditOwner(null); setFo({ name: '', phone: '', address: '' }); loadOwners() } catch (err) { toast.error(err.message) }
  }
  function delOwner(id) { ask('Hapus konsinyan ini? Barang titipannya juga hilang dari daftar (katalog & riwayat tetap aman).', async () => { const { error } = await supabase.from('consignment_owners').delete().eq('id', id); if (error) toast.error(error.message); else toast.success('Konsinyan dihapus'); loadOwners(); if (tab === 'barang') loadItems() }) }

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
        if (it.variant_id) { const { count } = await supabase.from('transaction_items').select('id', { count: 'exact', head: true }).eq('product_id', it.variant_id); if ((count || 0) > 0) return toast.error('Tidak bisa dihapus — sudah ada penjualan terkait. Tutup saja statusnya.') }
        if (it.product_id) await supabase.from('products').delete().eq('id', it.product_id)
        const { error } = await supabase.from('consignment_items').delete().eq('id', it.id); if (error) throw error
        toast.success('Barang titipan dihapus'); loadItems()
      } catch (err) { toast.error(err.message) }
    })
  }

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
      <tfoot><tr class="
