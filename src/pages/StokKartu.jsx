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

    async function delMove(mv) {
    if (mv.transaction_id) {
      const { data: tx } = await supabase.from('transactions').select('id,payment_status').eq('id', mv.transaction_id).maybeSingle()
      if (tx && tx.payment_status === 'paid') return toast.error('Mutasi dari transaksi aktif — batalkan dulu lewat Riwayat Transaksi (Void)')
      ask('Hapus catatan mutasi sisa transaksi yang sudah dibatalkan/terhapus? Stok tidak berubah (sudah dikembalikan saat void).', async () => {
        const { error } = await supabase.from('stock_movements').delete().eq('id', mv.id)
        if (error) toast.error(error.message); else toast.success('Catatan dibersihkan')
        load()
      })
      return
    }
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
