// >>> FILE MasterBarang START
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import { Confirm, Modal, RupiahInput, useToast, rp } from '../components/ui'
import {
  Plus, Edit2, Trash2, Check, Package, Search,
  Upload, ImageIcon, Percent, Tags
} from 'lucide-react'

const emptyVariant = () => ({ id: null, storage: '', color: '', harga_jual: 0, hpp: 0, stock_qty: 0, imeis: '' })
const emptyForm = () => ({
  name: '', category: 'Aksesoris', stock_type: 'qty', type: 'new',
  brand: '', model: '', status: 'active', image_url: '',
  variants: [emptyVariant()]
})

export default function MasterBarang() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [cats, setCats] = useState([])
  const [allVariants, setAllVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [fd, setFd] = useState(emptyForm())
  const [orig, setOrig] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [showCat, setShowCat] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', stock_type: 'qty' })
  const [showHpp, setShowHpp] = useState(false)
  const [hppPct, setHppPct] = useState(90)
  const [hppRows, setHppRows] = useState([])
  const [cf, setCf] = useState(null)
  const ask = (message, action) => setCf({ message, action })

  useEffect(() => { load() }, [])

  async function load() {
    const [p, v, i, c, consMoves, pts] = await Promise.all([
      supabase.from('products').select('*').eq('status', 'active').order('name'),
      supabase.from('product_variants').select('*'),
      supabase.from('product_imeis').select('id,variant_id,imei,status'),
      supabase.from('categories').select('*').order('sort'),
      supabase.from('stock_movements').select('variant_id,mitra_id').eq('reason', 'konsinyasi').eq('direction', 'in').not('mitra_id', 'is', null),
      supabase.from('consignment_partners').select('id,name')
    ])
    setCats(c.data || [])
    const vmap = {}, byProd = {}, avByVar = {}, flat = [], pmap = {}
    ;(v.data || []).forEach(x => { (byProd[x.product_id] = byProd[x.product_id] || []).push(x); vmap[x.id] = x.product_id; flat.push(x) })
    ;(i.data || []).forEach(x => { if (x.status === 'available') avByVar[x.variant_id] = (avByVar[x.variant_id] || 0) + 1 })
    ;(p.data || []).forEach(x => pmap[x.id] = x)
    const ptmap = {}; (pts.data || []).forEach(x => ptmap[x.id] = x.name)
    // peta produk -> nama mitra titipan (dideteksi dari mutasi konsinyasi)
    const consByProduct = {}
    ;(consMoves.data || []).forEach(m => { const pid = vmap[m.variant_id]; const nm = ptmap[m.mitra_id]; if (pid && nm) { (consByProduct[pid] = consByProduct[pid] || new Set()).add(nm) } })
    // sinkronkan tipe produk utk badge TITIPAN di POS (diam-diam, sekali saja)
    const needFix = (p.data || []).filter(x => consByProduct[x.id] && x.type !== 'consignment')
    if (needFix.length) supabase.from('products').update({ type: 'consignment' }).in('id', needFix.map(x => x.id)).then(() => {}, () => {})
    setAllVariants(flat.map(x => ({ ...x, pname: pmap[x.product_id]?.name || '—' })))
    setRows((p.data || []).map(prod => {
      const vs = byProd[prod.id] || []
      const stok = prod.stock_type === 'imei'
        ? vs.reduce((a, x) => a + (avByVar[x.id] || 0), 0)
        : vs.reduce((a, x) => a + (+x.stock_qty || 0), 0)
      const harga = vs.length ? Math.min(...vs.map(x => +x.harga_jual || 0)) : 0
      return { ...prod, type: consByProduct[prod.id] ? 'consignment' : prod.type, consMitra: consByProduct[prod.id] ? [...consByProduct[prod.id]].join(', ') : null, varCount: vs.length, stok, harga }
    }))
    setLoading(false)
  }

  const filtered = rows.filter(r =>
    !q ||
    r.name?.toLowerCase().includes(q.toLowerCase()) ||
    r.brand?.toLowerCase().includes(q.toLowerCase()) ||
    r.category?.toLowerCase().includes(q.toLowerCase()) ||
    r.consMitra?.toLowerCase().includes(q.toLowerCase())
  )

  function pickPhoto(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
  }
  async function uploadPhoto() {
    if (!photoFile) return fd.image_url
    const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, photoFile, { contentType: photoFile.type, upsert: false })
    if (error) throw error
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
  }
  function addVariant() { setFd(f => ({ ...f, variants: [...f.variants, emptyVariant()] })) }
  function rmVariant(idx) { setFd(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) })) }
  function setVariant(idx, field, val) { setFd(f => ({ ...f, variants: f.variants.map((v, i) => i === idx ? { ...v, [field]: val } : v) })) }
  function pickCategory(name) {
    const c = cats.find(x => x.name === name)
    setFd(f => ({ ...f, category: name, stock_type: c?.stock_type || 'qty' }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!fd.name.trim()) return toast.error('Nama produk wajib diisi')
    if (!fd.variants.length) return toast.error('Minimal 1 varian')
    try {
      const imageUrl = await uploadPhoto()
      const payload = {
        name: fd.name.trim(), category: fd.category, stock_type: fd.stock_type,
        type: fd.type, brand: fd.brand, model: fd.model, status: fd.status,
        image_url: imageUrl || null
      }
      let pid
      if (editing) {
        const { data, error } = await supabase.from('products').update(payload).eq('id', editing.id).select().single()
        if (error) throw error
        pid = data.id
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select().single()
        if (error) throw error
        pid = data.id
      }
      const isImei = fd.stock_type === 'imei'
      if (editing && orig) {
        const origIds = new Set(orig.variants.map(v => v.id))
        const formIds = new Set(fd.variants.filter(v => v.id).map(v => v.id))
        for (const id of origIds) if (!formIds.has(id)) await supabase.from('product_variants').delete().eq('id', id)
        for (const v of fd.variants) {
          const fields = { storage: v.storage || null, color: v.color || null, harga_jual: +v.harga_jual || 0, hpp: +v.hpp || 0, stock_qty: isImei ? 0 : (+v.stock_qty || 0) }
          if (v.id) {
            await supabase.from('product_variants').update(fields).eq('id', v.id)
            const desired = (v.imeis || '').split('\n').map(s => s.trim()).filter(Boolean)
            const existing = orig.imeisByVariant[v.id] || []
            const existingSet = new Set(existing.map(e => e.imei))
            const toDel = existing.filter(e => e.status === 'available' && !desired.includes(e.imei)).map(e => e.id)
            if (toDel.length) await supabase.from('product_imeis').delete().in('id', toDel)
            const toAdd = desired.filter(d => !existingSet.has(d))
            if (toAdd.length) {
              await supabase.from('product_imeis').insert(toAdd.map(im => ({ variant_id: v.id, imei: im, status: 'available' })))
              await supabase.from('stock_movements').insert(toAdd.map(im => ({ variant_id: v.id, product_name: fd.name.trim(), variant_label: [v.color, v.storage].filter(x => x && x !== '-').join(' - ') || 'Standar', direction: 'in', reason: 'pembelian', qty: 1, imei: im, note: 'Ditambahkan via Master Barang' })))
            }
          } else {
            const { data: vr, error: e2 } = await supabase.from('product_variants').insert({ product_id: pid, ...fields }).select().single()
            if (e2) throw e2
            const desired = (v.imeis || '').split('\n').map(s => s.trim()).filter(Boolean)
            if (isImei && desired.length) {
              await supabase.from('product_imeis').insert(desired.map(im => ({ variant_id: vr.id, imei: im, status: 'available' })))
              await supabase.from('stock_movements').insert(desired.map(im => ({ variant_id: vr.id, product_name: fd.name.trim(), variant_label: [v.color, v.storage].filter(x => x && x !== '-').join(' - ') || 'Standar', direction: 'in', reason: 'pembelian', qty: 1, imei: im, note: 'Varian baru via Master Barang' })))
            }
          }
        }
      } else {
        await supabase.from('product_variants').delete().eq('product_id', pid)
        for (const v of fd.variants) {
          const { data: vr, error: e2 } = await supabase.from('product_variants').insert({ product_id: pid, storage: v.storage || null, color: v.color || null, harga_jual: +v.harga_jual || 0, hpp: +v.hpp || 0, stock_qty: 0 }).select().single()
          if (e2) throw e2
          if (isImei && v.imeis) {
            const arr = v.imeis.split('\n').map(s => s.trim()).filter(Boolean)
            if (arr.length) {
              await supabase.from('product_imeis').insert(arr.map(im => ({ variant_id: vr.id, imei: im, status: 'available' })))
              await supabase.from('stock_movements').insert(arr.map(im => ({ variant_id: vr.id, product_name: fd.name.trim(), variant_label: [v.color, v.storage].filter(x => x && x !== '-').join(' - ') || 'Standar', direction: 'in', reason: 'stok_awal', qty: 1, imei: im, note: 'IMEI awal saat buat produk' })))
            }
          }
        }
      }
      toast.success(editing ? 'Produk diperbarui' : 'Produk ditambahkan — masukkan stoknya lewat Stok Masuk/Keluar')
      setShowForm(false); setEditing(null); setOrig(null)
      setFd(emptyForm()); setPhotoFile(null); setPhotoPreview('')
      load()
    } catch (err) { toast.error(err.message) }
  }

  function del(id) {
    ask('Hapus produk ini beserta varian & stoknya?', async () => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) toast.error(error.message)
      else toast.success('Produk dihapus')
      load()
    })
  }
  async function edit(prod) {
    const [vs, ims] = await Promise.all([
      supabase.from('product_variants').select('*').eq('product_id', prod.id),
      supabase.from('product_imeis').select('id,variant_id,imei,status')
    ])
    const imeisByVariant = {}
    ;(ims.data || []).forEach(x => { (imeisByVariant[x.variant_id] = imeisByVariant[x.variant_id] || []).push(x) })
    setEditing(prod)
    setOrig({ variants: vs.data || [], imeisByVariant })
    setFd({
      name: prod.name, category: prod.category, stock_type: prod.stock_type,
      type: prod.type, brand: prod.brand || '', model: prod.model || '',
      status: prod.status || 'active', image_url: prod.image_url || '',
      variants: (vs.data || []).map(v => ({
        id: v.id, storage: v.storage || '', color: v.color || '',
        harga_jual: v.harga_jual || 0, hpp: v.hpp || 0, stock_qty: v.stock_qty || 0,
        imeis: ((imeisByVariant[v.id] || []).filter(e => e.status === 'available').map(e => e.imei)).join('\n')
      }))
    })
    setPhotoFile(null)
    setPhotoPreview(prod.image_url || '')
    setShowForm(true)
  }
  function add() { setEditing(null); setOrig(null); setFd(emptyForm()); setPhotoFile(null); setPhotoPreview(''); setShowForm(true) }

  async function addCat() {
    if (!newCat.name.trim()) return
    const { error } = await supabase.from('categories').insert({ name: newCat.name.trim(), stock_type: newCat.stock_type })
    if (error) toast.error(error.message)
    else { toast.success('Kategori ditambahkan'); setNewCat({ name: '', stock_type: 'qty' }); load() }
  }
  function delCat(id, name) {
    ask(`Hapus kategori "${name}"? Produk yang memakainya tetap tersimpan.`, async () => {
      await supabase.from('categories').delete().eq('id', id)
      toast.success('Kategori dihapus'); load()
    })
  }
  function openHpp() {
    setHppRows(allVariants.map(v => ({
      id: v.id, pname: v.pname,
      label: [v.color, v.storage].filter(x => x && x !== '-').join(' - ') || 'Standar',
      harga: +v.harga_jual || 0, hpp: +v.hpp || 0
    })))
    setShowHpp(true)
  }
  function applyHpp(onlyEmpty) {
    setHppRows(rs => rs.map(r => (onlyEmpty && r.hpp > 0) ? r : { ...r, hpp: Math.round(r.harga * (Number(hppPct) || 0) / 100) }))
  }
  async function saveHpp() {
    try {
      await Promise.all(hppRows.map(r => supabase.from('product_variants').update({ hpp: r.hpp }).eq('id', r.id)))
      toast.success(`HPP ${hppRows.length} varian disimpan`)
      setShowHpp(false); load()
    } catch (err) { toast.error(err.message) }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin" /></div>

  const actions = (
    <>
      <button onClick={() => setShowCat(true)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
        <Tags className="w-4 h-4" />Kategori
      </button>
      <button onClick={openHpp} className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
        <Percent className="w-4 h-4" />Isi HPP Massal
      </button>
      <button onClick={add} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm text-sm font-medium">
        <Plus className="w-4 h-4" />Tambah Produk
      </button>
    </>
  )

  return (
    <div className="p-6 lg:p-8">
      <PageHeader subtitle="Kelola produk, varian, kategori & stok" actions={actions} />
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama / brand / kategori / mitra..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] outline-none" />
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Produk' : 'Tambah Produk Baru'} maxWidth="max-w-3xl"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Batal</button>
            <button form="prodForm" type="submit" className="flex-1 px-4 py-2.5 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] font-medium flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />{editing ? 'Update' : 'Simpan'}
            </button>
          </div>
        }>
        <form id="prodForm" onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Produk *</label>
                <input required value={fd.name} onChange={e => setFd({ ...fd, name: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder="iPhone 15 New" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori *</label>
                  <select value={fd.category} onChange={e => pickCategory(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg bg-white">
                    {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">Stok: {fd.stock_type === 'imei' ? 'per IMEI (unit)' : 'jumlah (pcs)'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe *</label>
                  <select value={fd.type} onChange={e => setFd({ ...fd, type: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg bg-white">
                    <option value="new">Baru</option>
                    <option value="second">Second</option>
                    <option value="consignment" disabled>Konsinyasi (otomatis dari titipan)</option>
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">Tanda TITIPAN aktif otomatis saat barang titipan masuk lewat Stok Masuk/Keluar</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand</label>
                  <input value={fd.brand} onChange={e => setFd({ ...fd, brand: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none" placeholder="Apple" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                  <input value={fd.model} onChange={e => setFd({ ...fd, model: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none" placeholder="iPhone 15" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select value={fd.status} onChange={e => setFd({ ...fd, status: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg bg-white">
                    <option value="active">Aktif (dijual)</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Foto Produk</label>
              <label className="block cursor-pointer">
                <div className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 hover:border-[#0058A3]">
                  {photoPreview
                    ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    : <div className="text-center text-gray-400"><Upload className="w-8 h-8 mx-auto mb-1" /><span className="text-xs">Klik pilih dari komputer</span></div>}
                </div>
                <input type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
              </label>
              {photoFile && <p className="text-[11px] text-gray-500 mt-1 truncate">{photoFile.name}</p>}
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-900">Varian {fd.stock_type === 'imei' ? '(setiap varian = daftar IMEI unit)' : '(stok per varian)'}</h4>
              <button type="button" onClick={addVariant} className="text-sm text-[#0058A3] font-medium flex items-center gap-1"><Plus className="w-4 h-4" />Tambah Varian</button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 mb-3 text-xs text-gray-600">
              Stok <b>tidak diisi di sini</b> — semua produk mulai dari 0. Masukkan stok lewat menu <b>Stok Masuk/Keluar</b> (pilih alasan Pembelian, atau <b>Barang Konsinyasi</b> untuk barang titipan mitra).
            </div>
            <div className="space-y-3">
              {fd.variants.map((v, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-500">Varian #{idx + 1}{v.id ? ' (tersimpan)' : ''}</span>
                    {fd.variants.length > 1 && <button type="button" onClick={() => rmVariant(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input value={v.storage} onChange={e => setVariant(idx, 'storage', e.target.value)} placeholder="Storage" className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0058A3]" />
                    <input value={v.color} onChange={e => setVariant(idx, 'color', e.target.value)} placeholder="Warna" className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0058A3]" />
                    <div>
                      <RupiahInput value={v.harga_jual} onChange={x => setVariant(idx, 'harga_jual', x)} className="w-full px-3 py-2 border rounded-lg text-sm text-right outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder="Harga" />
                      <span className="text-[10px] text-gray-400">Harga Jual</span>
                    </div>
                    <div>
                      <RupiahInput value={v.hpp} onChange={x => setVariant(idx, 'hpp', x)} className="w-full px-3 py-2 border rounded-lg text-sm text-right outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder="HPP" />
                      <span className="text-[10px] text-gray-400">HPP / Modal (isi harga titipan bila konsinyasi)</span>
                    </div>
                  </div>
                  {fd.stock_type === 'imei' && (
                    <div className="mt-2">
                      <textarea value={v.imeis} onChange={e => setVariant(idx, 'imeis', e.target.value)} rows={2} placeholder={'Satu IMEI per baris:\n356789012345671'} className="w-full px-3 py-2 border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-[#0058A3]" />
                      <span className="text-[10px] text-gray-400">Hanya unit TERSEDIA. Untuk barang TITIPAN, tambahkan IMEI lewat Stok Masuk/Keluar (alasan: Konsinyasi) agar hutang mitra tercatat.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <Modal open={showCat} onClose={() => setShowCat(false)} title="Kelola Kategori">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} placeholder="Nama kategori baru" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
            <select value={newCat.stock_type} onChange={e => setNewCat({ ...newCat, stock_type: e.target.value })} className="px-2 py-2 border rounded-lg text-sm bg-white">
              <option value="qty">Stok (pcs)</option>
              <option value="imei">IMEI (unit)</option>
            </select>
            <button onClick={addCat} className="px-3 py-2 bg-[#0058A3] text-white rounded-lg text-sm"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {cats.map(c => (
              <div key={c.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-[11px] text-gray-500">{c.stock_type === 'imei' ? 'Stok per IMEI' : 'Stok jumlah'}</p>
                </div>
                <button onClick={() => delCat(c.id, c.name)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={showHpp} onClose={() => setShowHpp(false)} title="Isi HPP Massal" maxWidth="max-w-2xl"
        footer={<button onClick={saveHpp} className="w-full py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4" />Simpan Semua HPP</button>}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Masukkan persentase dari harga jual (cth: 90 = HPP 90% dari harga jual), lalu terapkan.</p>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-1">HPP = berapa % dari harga jual?</label>
              <input type="number" value={hppPct} onChange={e => setHppPct(e.target.value)} placeholder="cth: 90" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <button onClick={() => applyHpp(false)} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50">Terapkan ke Semua</button>
            <button onClick={() => applyHpp(true)} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50">Hanya yang Kosong</button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                <th className="text-left p-2">Produk / Varian</th>
                <th className="text-right p-2">Harga Jual</th>
                <th className="text-right p-2">HPP (Modal)</th>
              </tr></thead>
              <tbody className="divide-y max-h-72 overflow-y-auto block">
                {hppRows.map((r, idx) => (
                  <tr key={r.id} className="flex justify-between items-center px-2 py-2">
                    <td className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.pname}</p>
                      <p className="text-[11px] text-gray-500">{r.label}</p>
                    </td>
                    <td className="w-28 text-right text-gray-600">{rp(r.harga)}</td>
                    <td className="w-32 text-right">
                      <RupiahInput value={r.hpp} onChange={x => setHppRows(rs => rs.map((y, i) => i === idx ? { ...y, hpp: x } : y))} className="w-full px-2 py-1 border rounded text-right text-sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {!filtered.length ? (
          <div className="p-12 text-center text-gray-400">
            <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Belum ada produk</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                <th className="text-left p-3">Foto</th>
                <th className="text-left p-3">Nama Produk</th>
                <th className="text-left p-3">Kategori</th>
                <th className="text-left p-3">Tipe</th>
                <th className="text-left p-3">Varian</th>
                <th className="text-left p-3">Harga Mulai</th>
                <th className="text-left p-3">Stok</th>
                <th className="text-right p-3">Aksi</th>
              </tr></thead>
              <tbody className="divide-y">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      {r.image_url
                        ? <img src={r.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border" />
                        : <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300"><ImageIcon className="w-6 h-6" /></div>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{r.name}</p>
                        {r.consMitra && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold whitespace-nowrap">TITIPAN · {r.consMitra}</span>}
                      </div>
                      <p className="text-xs text-gray-500">{[r.brand, r.model].filter(Boolean).join(' ') || '—'}</p>
                    </td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-gray-100">{r.category}</span></td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${r.type === 'consignment' ? 'bg-amber-100 text-amber-700' : r.type === 'second' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{r.type === 'consignment' ? 'TITIPAN' : r.type.toUpperCase()}</span></td>
                    <td className="p-3 text-sm text-gray-600">{r.varCount} varian</td>
                    <td className="p-3 text-sm font-semibold text-[#0058A3]">{rp(r.harga)}</td>
                    <td className="p-3 text-sm"><span className={r.stok <= 5 ? 'text-red-600 font-semibold' : 'text-gray-700'}>{r.stok} {r.stock_type === 'imei' ? 'unit' : 'pcs'}</span></td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => edit(r)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 text-[#0058A3]">Edit</button>
                        <button onClick={() => del(r.id)} className="px-3 py-1.5 text-sm border border-red-300 rounded-lg hover:bg-red-50 text-red-600">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-4 text-sm text-gray-500">Total: {filtered.length} produk</p>
      <Confirm open={!!cf} danger message={cf?.message} confirmText="Ya, Hapus" onClose={() => setCf(null)} onConfirm={async () => { const a = cf.action; setCf(null); await a() }} />
    </div>
  )
}
// <<< FILE MasterBarang END
