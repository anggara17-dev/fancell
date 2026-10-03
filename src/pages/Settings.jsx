import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useStoreSettings, invalidateSettings } from '../lib/useStoreSettings'
import { Plus, Edit2, Trash2, X, Check, Store, Users, Upload, ImageIcon } from 'lucide-react'
const emptyUser = { username:'', email:'', password:'', role:'kasir' }

export default function Settings() {
  const [tab,setTab]=useState('toko')
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6"><h2 className="text-2xl font-bold text-gray-900">Pengaturan</h2><p className="text-sm text-gray-500 mt-0.5">Profil toko & manajemen user</p></div>
      <div className="flex gap-2 mb-6 border-b">
        <button onClick={()=>setTab('toko')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${tab==='toko'?'border-[#0058A3] text-[#0058A3]':'border-transparent text-gray-500 hover:text-gray-700'}`}><Store className="w-4 h-4"/>Toko</button>
        <button onClick={()=>setTab('user')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${tab==='user'?'border-[#0058A3] text-[#0058A3]':'border-transparent text-gray-500 hover:text-gray-700'}`}><Users className="w-4 h-4"/>User & Hak Akses</button>
      </div>
      {tab==='toko'?<TabToko/>:<TabUser/>}
    </div> )
}

function TabToko(){
  const cur = useStoreSettings()
  const [fd,setFd]=useState(cur); const [logoSide,setLogoSide]=useState(null); const [logoStruk,setLogoStruk]=useState(null); const [msg,setMsg]=useState({type:'',text:''}); const [saving,setSaving]=useState(false)
  useEffect(()=>{ setFd(cur) },[cur.store_name])
  async function upload(file, folder){ if(!file) return null; const ext=(file.name.split('.').pop()||'png').toLowerCase(); const path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`; const {error}=await supabase.storage.from('store-assets').upload(path,file,{contentType:file.type,upsert:false}); if(error) throw error; return supabase.storage.from('store-assets').getPublicUrl(path).data.publicUrl }
  async function save(e){ e.preventDefault(); setSaving(true); setMsg({type:'',text:''}); try { const urlSide = logoSide? await upload(logoSide,'logo-sidebar') : fd.logo_sidebar_url; const urlStruk = logoStruk? await upload(logoStruk,'logo-struk') : fd.logo_struk_url; const {error}=await supabase.from('settings').update({ store_name:fd.store_name, address:fd.address, whatsapp:fd.whatsapp, struk_footer:fd.struk_footer, logo_sidebar_url:urlSide, logo_struk_url:urlStruk, updated_at:new Date().toISOString() }).eq('id',1); if(error) throw error; invalidateSettings(); setMsg({type:'success',text:'Pengaturan toko disimpan'}); setLogoSide(null); setLogoStruk(null) } catch(err){ setMsg({type:'error',text:err.message}) } finally { setSaving(false); setTimeout(()=>setMsg({type:'',text:''}),2500) } }
  const Field=({label,children})=>(<div><label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>{children}</div>)
  const LogoBox=({label,preview,file,setFile,onClear})=>(<div><label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label><div className="flex items-center gap-3"><div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">{preview?<img src={preview} alt="" className="w-full h-full object-contain"/>:<ImageIcon className="w-8 h-8 text-gray-300"/>}</div><div className="space-y-1"><label className="block cursor-pointer px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"><Upload className="w-4 h-4"/>Pilih File<input type="file" accept="image/*" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f){ setFile(f) } }}/></label>{(preview||file)&&<button type="button" onClick={onClear} className="text-xs text-red-600 hover:underline">Hapus foto</button>}</div></div></div>)
  return (
    <form onSubmit={save} className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl space-y-4">
      <h3 className="text-lg font-bold">Pengaturan Toko</h3>
      {msg.text&&<div className={`px-4 py-3 rounded-lg text-sm ${msg.type==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}
      <Field label="Nama Toko"><input value={fd.store_name||''} onChange={e=>setFd({...fd,store_name:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></Field>
      <Field label="Alamat"><input value={fd.address||''} onChange={e=>setFd({...fd,address:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></Field>
      <Field label="Nomor WhatsApp / Telp"><input value={fd.whatsapp||''} onChange={e=>setFd({...fd,whatsapp:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></Field>
      <Field label="Footer Struk"><input value={fd.struk_footer||''} onChange={e=>setFd({...fd,struk_footer:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></Field>
      <LogoBox label="Logo Toko (Tampil di Sidebar)" preview={logoSide?URL.createObjectURL(logoSide):fd.logo_sidebar_url} file={logoSide} setFile={setLogoSide} onClear={()=>{ setLogoSide(null); setFd({...fd,logo_sidebar_url:null}) }}/>
      <LogoBox label="Logo Struk (Tampil di print struk)" preview={logoStruk?URL.createObjectURL(logoStruk):fd.logo_struk_url} file={logoStruk} setFile={setLogoStruk} onClear={()=>{ setLogoStruk(null); setFd({...fd,logo_struk_url:null}) }}/>
      <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center gap-2 hover:bg-[#004080] disabled:opacity-50">{saving?'Menyimpan...':<><Check className="w-4 h-4"/>Simpan Pengaturan</>}</button>
    </form> )
}

function TabUser(){
  const [users,setUsers]=useState([]); const [load,setLoad]=useState(true); const [showForm,setShowForm]=useState(false); const [editing,setEditing]=useState(null); const [fd,setFd]=useState(emptyUser); const [msg,setMsg]=useState({type:'',text:''})
  useEffect(()=>{ run() },[])
  async function run(){ const {data,error}=await supabase.from('users').select('id, username, email, role, is_active').order('username'); if(error) setMsg({type:'error',text:error.message}); setUsers(data||[]); setLoad(false) }
  async function submit(e){ e.preventDefault(); setMsg({type:'',text:''}); try { if(editing){ const upd={ username:fd.username, email:fd.email, role:fd.role }; if(fd.password) upd.password=fd.password; const {error}=await supabase.from('users').update(upd).eq('id',editing.id); if(error) throw error; setMsg({type:'success',text:'User diupdate'}) } else { if(!fd.password){ setMsg({type:'error',text:'Password wajib diisi'}); return } const {error}=await supabase.from('users').insert({ username:fd.username, email:fd.email, password:fd.password, role:fd.role, is_active:true }); if(error) throw error; setMsg({type:'success',text:'User ditambahkan'}) } setShowForm(false); setEditing(null); setFd(emptyUser); run(); setTimeout(()=>setMsg({type:'',text:''}),2500) } catch(err){ setMsg({type:'error',text:err.message}) } }
  async function del(id){ if(!confirm('Hapus user ini?'))return; const {error}=await supabase.from('users').delete().eq('id',id); if(error) setMsg({type:'error',text:error.message}); else setMsg({type:'success',text:'User dihapus'}); run(); setTimeout(()=>setMsg({type:'',text:''}),2500) }
  function edit(u){ setEditing(u); setFd({ username:u.username, email:u.email||'', password:'', role:u.role }); setShowForm(true) }
  function add(){ setEditing(null); setFd(emptyUser); setShowForm(true) }
  const badge = r => { const c={owner:'bg-[#0058A3] text-white',kasir:'bg-blue-100 text-[#0058A3]',gudang:'bg-gray-100 text-gray-700'}; return <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${c[r]||c.kasir}`}>{r.toUpperCase()}</span> }
  if(load) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <div>
      <div className="flex justify-between items-center mb-4"><p className="text-sm text-gray-500">{users.length} user terdaftar</p><button onClick={add} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm text-sm font-medium"><Plus className="w-4 h-4"/>Tambah User</button></div>
      {msg.text&&<div className={`mb-4 px-4 py-3 rounded-lg text-sm ${msg.type==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}
      {showForm&&<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md"><div className="flex justify-between items-center p-6 border-b"><h3 className="font-bold text-lg">{editing?'Edit User':'Tambah User Baru'}</h3><button onClick={()=>setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5"/></button></div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Username *</label><input type="text" required value={fd.username} onChange={e=>setFd({...fd,username:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg outline-none"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Email (Opsional)</label><input type="email" value={fd.email} onChange={e=>setFd({...fd,email:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg outline-none"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Password {editing?'(kosongkan jika tidak diubah)':'*'}</label><input type="password" required={!editing} value={fd.password} onChange={e=>setFd({...fd,password:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg outline-none" minLength={6}/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label><select value={fd.role} onChange={e=>setFd({...fd,role:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg bg-white"><option value="owner">Owner (Akses Penuh)</option><option value="kasir">Kasir (Transaksi & Stok)</option><option value="gudang">Gudang (Master Barang Saja)</option></select><p className="text-xs text-gray-500 mt-1">{fd.role==='owner'?'Semua modul termasuk Laba Rugi, Garansi & Pengaturan':fd.role==='kasir'?'POS, Riwayat, Barang, Garansi (tanpa Laba Rugi/Modal/Pengaturan)':'Master Barang saja'}</p></div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={()=>setShowForm(false)} className="flex-1 px-4 py-2.5 border text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Batal</button><button type="submit" className="flex-1 px-4 py-2.5 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4"/>{editing?'Update':'Simpan'}</button></div>
        </form></div></div>}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">User</th><th className="text-left p-3">Email</th><th className="text-left p-3">Role</th><th className="text-left p-3">Hak Akses</th><th className="text-right p-3">Aksi</th></tr></thead>
        <tbody className="divide-y">{users.map(u=>(<tr key={u.id} className="hover:bg-gray-50"><td className="p-3"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-gradient-to-br from-[#0058A3] to-[#004080] rounded-full flex items-center justify-center font-bold text-white text-sm">{u.username?.charAt(0).toUpperCase()}</div><span className="text-sm font-medium">{u.username}</span></div></td><td className="p-3 text-sm text-gray-600">{u.email||'-'}</td><td className="p-3">{badge(u.role)}</td><td className="p-3 text-xs text-gray-500">{u.role==='owner'?'Semua modul':u.role==='kasir'?'POS, Riwayat, Barang, Garansi':'Master Barang saja'}</td><td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={()=>edit(u)} className="p-1.5 hover:bg-blue-50 rounded text-[#0058A3]"><Edit2 className="w-4 h-4"/></button><button onClick={()=>del(u.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4"/></button></div></td></tr>))}</tbody></table></div></div>
    </div> )
}
