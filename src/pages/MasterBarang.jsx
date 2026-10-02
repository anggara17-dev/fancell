import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Plus, Edit2, Trash2, X, Check, Package, Search, Upload, ImageIcon } from 'lucide-react'
const rp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0)

function RupiahInput({ value, onChange, className, placeholder }) {
  const fmt = v => (v===''||v==null) ? '' : Number(String(v).replace(/\D/g,'')).toLocaleString('id-ID')
  return <input inputMode="numeric" value={fmt(value)} onChange={e=>{ const d=e.target.value.replace(/\D/g,''); onChange(d?Number(d):0) }} className={className} placeholder={placeholder}/>
}

const emptyVariant = () => ({ storage:'', color:'', harga_jual:0, hpp:0, stock_qty:0, imeis:'' })
const emptyForm = () => ({ name:'', category:'hp', type:'new', brand:'', model:'', status:'active', image_url:'', variants:[emptyVariant()] })

export default function MasterBarang() {
  const [rows,setRows]=useState([]); const [loading,setLoading]=useState(true)
  const [q,setQ]=useState(''); const [showForm,setShowForm]=useState(false)
  const [editing,setEditing]=useState(null); const [fd,setFd]=useState(emptyForm())
  const [photoFile,setPhotoFile]=useState(null); const [photoPreview,setPhotoPreview]=useState('')
  const [msg,setMsg]=useState({type:'',text:''})
  useEffect(()=>{ load() },[])

  async function load(){
    const [p,v,i]=await Promise.all([
      supabase.from('products').select('*').eq('status','active').order('name'),
      supabase.from('product_variants').select('*'),
      supabase.from('product_imeis').select('variant_id,status')
    ])
    const byProd={}, avByVar={}
    ;(v.data||[]).forEach(x=>{ (byProd[x.product_id]=byProd[x.product_id]||[]).push(x) })
    ;(i.data||[]).forEach(x=>{ if(x.status==='available') avByVar[x.variant_id]=(avByVar[x.variant_id]||0)+1 })
    const list=(p.data||[]).map(prod=>{
      const vs=byProd[prod.id]||[]
      const stok = prod.category==='hp' ? vs.reduce((a,x)=>a+(avByVar[x.id]||0),0) : vs.reduce((a,x)=>a+(+x.stock_qty||0),0)
      const harga = vs.length? Math.min(...vs.map(x=>+x.harga_jual||0)) : 0
      return { ...prod, varCount:vs.length, stok, harga }
    })
    setRows(list); setLoading(false)
  }

  const filtered = rows.filter(r=>!q||r.name?.toLowerCase().includes(q.toLowerCase())||r.brand?.toLowerCase().includes(q.toLowerCase())||r.model?.toLowerCase().includes(q.toLowerCase()))

  function pickPhoto(e){ const f=e.target.files?.[0]; if(!f) return; setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)) }
  async function uploadPhoto(){
    if(!photoFile) return fd.image_url
    const ext=(photoFile.name.split('.').pop()||'jpg').toLowerCase()
    const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error }=await supabase.storage.from('product-images').upload(path, photoFile, { contentType: photoFile.type, upsert:false })
    if(error) throw error
    const { data:{ publicUrl } }=supabase.storage.from('product-images').getPublicUrl(path)
    return publicUrl
  }

  function addVariant(){ setFd(f=>({...f, variants:[...f.variants, emptyVariant()]})) }
  function rmVariant(idx){ setFd(f=>({...f, variants:f.variants.filter((_,i)=>i!==idx)})) }
  function setVariant(idx, field, val){ setFd(f=>({...f, variants:f.variants.map((v,i)=>i===idx?{...v,[field]:val}:v)})) }

  async function submit(e){
    e.preventDefault(); setMsg({type:'',text:''})
    if(!fd.name.trim()){ setMsg({type:'error',text:'Nama produk wajib diisi'}); return }
    if(!fd.variants.length){ setMsg({type:'error',text:'Minimal 1 varian'}); return }
    try {
      const imageUrl = await uploadPhoto()
      const payload={ name:fd.name.trim(), category:fd.category, type:fd.type, brand:fd.brand, model:fd.model, status:fd.status, image_url:imageUrl||null }
      let pid
      if(editing){ const {data,error}=await supabase.from('products').update(payload).eq('id',editing.id).select().single(); if(error) throw error; pid=data.id }
      else { const {data,error}=await supabase.from('products').insert(payload).select().single(); if(error) throw error; pid=data.id }
      await supabase.from('product_variants').delete().eq('product_id',pid)
      for(const v of fd.variants){
        const isHp = fd.category==='hp'
        const vv={ product_id:pid, storage:v.storage||null, color:v.color||null, harga_jual:+v.harga_jual||0, hpp:+v.hpp||0, stock_qty: isHp?0:(+v.stock_qty||0) }
        const {data:varRow,error:e2}=await supabase.from('product_variants').insert(vv).select().single(); if(e2) throw e2
        if(isHp && v.imeis){
          const arr=v.imeis.split('\n').map(s=>s.trim()).filter(Boolean)
          if(arr.length) await supabase.from('product_imeis').insert(arr.map(im=>({ variant_id:varRow.id, imei:im, status:'available' })))
        }
      }
      setMsg({type:'success',text: editing?'Produk diperbarui':'Produk ditambahkan'})
      setShowForm(false); setEditing(null); setFd(emptyForm()); setPhotoFile(null); setPhotoPreview(''); load()
      setTimeout(()=>setMsg({type:'',text:''}),2500)
    } catch(err){ setMsg({type:'error',text:err.message}) }
  }

  async function del(id){ if(!confirm('Hapus produk ini beserta variannya?'))return; const {error}=await supabase.from('products').delete().eq('id',id); if(error) setMsg({type:'error',text:error.message}); else setMsg({type:'success',text:'Produk dihapus'}); load(); setTimeout(()=>setMsg({type:'',text:''}),2500) }

  async function edit(prod){
    const [vs,ims]=await Promise.all([
      supabase.from('product_variants').select('*').eq('product_id',prod.id),
      supabase.from('product_imeis').select('variant_id,imei,status').eq('status','available')
    ])
    const avMap={}; (ims.data||[]).forEach(x=>{ (avMap[x.variant_id]=avMap[x.variant_id]||[]).push(x.imei) })
    setEditing(prod)
    setFd({
      name:prod.name, category:prod.category, type:prod.type, brand:prod.brand||'', model:prod.model||'', status:prod.status||'active', image_url:prod.image_url||'',
      variants:(vs.data||[]).map(v=>({ storage:v.storage||'', color:v.color||'', harga_jual:v.harga_jual||0, hpp:v.hpp||0, stock_qty:v.stock_qty||0, imeis:(avMap[v.id]||[]).join('\n') }))
    })
    setPhotoFile(null); setPhotoPreview(prod.image_url||''); setShowForm(true)
  }
  function add(){ setEditing(null); setFd(emptyForm()); setPhotoFile(null); setPhotoPreview(''); setShowForm(true) }

  if(loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold text-gray-900">Master Barang</h2><p className="text-sm text-gray-500 mt-0.5">Kelola produk, varian & stok</p></div>
        <button onClick={add} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm"><Plus className="w-4 h-4"/><span className="text-sm font-medium">Tambah Produk</span></button>
      </div>
      {msg.text&&<div className={`mb-4 px-4 py-3 rounded-lg text-sm animate-fade-in ${msg.type==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}
      <div className="mb-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari nama / brand / model..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] outline-none"/></div>

      {showForm&&<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10"><h3 className="text-lg font-bold">{editing?'Edit Produk':'Tambah Produk Baru'}</h3><button onClick={()=>setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5"/></button></div>
          <form onSubmit={submit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Produk *</label><input required value={fd.name} onChange={e=>setFd({...fd,name:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder="iPhone 15 New"/></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori *</label><select value={fd.category} onChange={e=>setFd({...fd,category:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg bg-white"><option value="hp">Handphone</option><option value="aksesoris">Aksesoris</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe *</label><select value={fd.type} onChange={e=>setFd({...fd,type:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg bg-white"><option value="new">Baru</option><option value="second">Second</option><option value="consignment">Konsinyasi</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Brand</label><input value={fd.brand} onChange={e=>setFd({...fd,brand:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg outline-none" placeholder="Apple"/></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label><input value={fd.model} onChange={e=>setFd({...fd,model:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg outline-none" placeholder="iPhone 15"/></div>
                  <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label><select value={fd.status} onChange={e=>setFd({...fd,status:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg bg-white"><option value="active">Aktif (dijual)</option><option value="inactive">Nonaktif (disembunyikan)</option></select></div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Foto Produk</label>
                <label className="block cursor-pointer">
                  <div className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 hover:border-[#0058A3] transition-colors">
                    {photoPreview? <img src={photoPreview} alt="" className="w-full h-full object-cover"/> : <div className="text-center text-gray-400"><Upload className="w-8 h-8 mx-auto mb-1"/><span className="text-xs">Klik pilih dari komputer</span></div>}
                  </div>
                  <input type="file" accept="image/*" onChange={pickPhoto} className="hidden"/>
                </label>
                {photoFile&&<p className="text-[11px] text-gray-500 mt-1 truncate">{photoFile.name}</p>}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3"><h4 className="font-semibold text-gray-900">Varian {fd.category==='hp'?'(setiap varian = daftar IMEI unit)':'(stok per varian)'}</h4><button type="button" onClick={addVariant} className="text-sm text-[#0058A3] font-medium flex items-center gap-1"><Plus className="w-4 h-4"/>Tambah Varian</button></div>
              <div className="space-y-3">
                {fd.variants.map((v,idx)=>(
                  <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                    <div className="flex justify-between items-center mb-2"><span className="text-xs font-semibold text-gray-500">Varian #{idx+1}</span>{fd.variants.length>1&&<button type="button" onClick={()=>rmVariant(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>}</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <input value={v.storage} onChange={e=>setVariant(idx,'storage',e.target.value)} placeholder="Storage (128GB)" className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0058A3]"/>
                      <input value={v.color} onChange={e=>setVariant(idx,'color',e.target.value)} placeholder="Warna (Black)" className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0058A3]"/>
                      <div><RupiahInput value={v.harga_jual} onChange={x=>setVariant(idx,'harga_jual',x)} className="w-full px-3 py-2 border rounded-lg text-sm text-right outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder="Harga Jual"/><span className="text-[10px] text-gray-400">Harga Jual</span></div>
                      <div><RupiahInput value={v.hpp} onChange={x=>setVariant(idx,'hpp',x)} className="w-full px-3 py-2 border rounded-lg text-sm text-right outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder="HPP"/><span className="text-[10px] text-gray-400">HPP / Modal</span></div>
                      {fd.category==='aksesoris'&&<div className="col-span-2 md:col-span-1"><input type="number" value={v.stock_qty} onChange={e=>setVariant(idx,'stock_qty',e.target.value)} placeholder="Stok" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0058A3]"/><span className="text-[10px] text-gray-400">Jumlah Stok</span></div>}
                    </div>
                    {fd.category==='hp'&&<div className="mt-2"><textarea value={v.imeis} onChange={e=>setVariant(idx,'imeis',e.target.value)} rows={2} placeholder={"Satu IMEI per baris, contoh:\n356789012345671\n356789012345672"} className="w-full px-3 py-2 border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-[#0058A3]"/><span className="text-[10px] text-gray-400">Daftar IMEI tersedia (1 baris = 1 unit). Unit terjual otomatis ditandai saat checkout POS.</span></div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t"><button type="button" onClick={()=>setShowForm(false)} className="flex-1 px-4 py-2.5 border text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Batal</button><button type="submit" className="flex-1 px-4 py-2.5 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4"/>{editing?'Update':'Simpan'}</button></div>
          </form>
        </div>
      </div>}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {!filtered.length?<div className="p-12 text-center text-gray-400"><Package className="w-16 h-16 mx-auto mb-3 opacity-30"/><p className="text-lg font-medium">Belum ada produk</p></div>:
        <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">Foto</th><th className="text-left p-3">Nama Produk</th><th className="text-left p-3">Kategori</th><th className="text-left p-3">Tipe</th><th className="text-left p-3">Varian</th><th className="text-left p-3">Harga Mulai</th><th className="text-left p-3">Stok</th><th className="text-right p-3">Aksi</th></tr></thead>
          <tbody className="divide-y">{filtered.map(r=>(<tr key={r.id} className="hover:bg-gray-50">
            <td className="p-3">{r.image_url?<img src={r.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border"/>:<div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300"><ImageIcon className="w-6 h-6"/></div>}</td>
            <td className="p-3"><p className="text-sm font-medium text-gray-900">{r.name}</p><p className="text-xs text-gray-500">{[r.brand,r.model].filter(Boolean).join(' ')||'—'}</p></td>
            <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-gray-100">{r.category==='hp'?'HP':'AKSESORIS'}</span></td>
            <td className="p-3 text-xs text-gray-600 capitalize">{r.type}</td>
            <td className="p-3 text-sm text-gray-600">{r.varCount} varian</td>
            <td className="p-3 text-sm font-semibold text-[#0058A3]">{rp(r.harga)}</td>
            <td className="p-3 text-sm"><span className={r.stok<=5?'text-red-600 font-semibold':'text-gray-700'}>{r.stok} {r.category==='hp'?'unit':'pcs'}</span></td>
            <td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={()=>edit(r)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 text-[#0058A3]">Edit</button><button onClick={()=>del(r.id)} className="px-3 py-1.5 text-sm border border-red-300 rounded-lg hover:bg-red-50 text-red-600">Hapus</button></div></td>
          </tr>))}</tbody></table></div>}
      </div>
      <p className="mt-4 text-sm text-gray-500">Total: {filtered.length} produk</p>
    </div> )
}
