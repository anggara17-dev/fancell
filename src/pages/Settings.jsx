import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { invalidateSettings } from '../lib/useStoreSettings'
import { Confirm, Modal, useToast } from '../components/ui'
import { Plus, Edit2, Trash2, Check, Store, Users, Upload, ImageIcon, RotateCcw, Eye, EyeOff } from 'lucide-react'
const emptyUser = { username:'', email:'', password:'', password2:'' }

// FIX: komponen di luar — input tidak di-remount tiap ketikan
function Field({ label, children }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>{children}</div>
}
function LogoBox({ label, preview, onPick, onClear }) {
  return (<div><label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label><div className="flex items-center gap-3"><div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">{preview ? <img src={preview} alt="" className="w-full h-full object-contain"/> : <ImageIcon className="w-8 h-8 text-gray-300"/>}</div><div className="space-y-1"><label className="block cursor-pointer px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"><Upload className="w-4 h-4"/>Pilih File<input type="file" accept="image/*" className="hidden" onChange={onPick}/></label>{preview && <button type="button" onClick={onClear} className="text-xs text-red-600 hover:underline">Hapus foto</button>}</div></div></div>)
}

export default function Settings() {
  const [tab, setTab] = useState('toko')
  return (
    <div className="p-6 lg:p-8">
      <div className="sticky top-0 z-20 -mx-6 lg:-mx-8 px-6 lg:px-8 py-3 mb-4 bg-[rgba(248,250,252,0.95)] backdrop-blur-[6px] border-b border-gray-200">
        <p className="text-sm text-gray-500 mb-3">Profil toko & manajemen user</p>
        <div className="flex gap-2">
          <button onClick={() => setTab('toko')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${tab === 'toko' ? 'border-[#0058A3] text-[#0058A3]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Store className="w-4 h-4"/>Toko</button>
          <button onClick={() => setTab('user')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${tab === 'user' ? 'border-[#0058A3] text-[#0058A3]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Users className="w-4 h-4"/>User & Hak Akses</button>
        </div>
      </div>
      {tab === 'toko' ? <TabToko/> : <TabUser/>}
    </div>
  )
}
function TabToko() {
  const toast = useToast()
  const [fd, setFd] = useState({ store_name:'', address:'', whatsapp:'', struk_footer:'', logo_sidebar_url:null, logo_struk_url:null })
  const [loading, setLoading] = useState(true)
  const [logoSide, setLogoSide] = useState(null); const [logoStruk, setLogoStruk] = useState(null); const [saving, setSaving] = useState(false)
  const [prevSide, setPrevSide] = useState(null); const [prevStruk, setPrevStruk] = useState(null)
  const dirtyRef = useRef(false)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
      if (!alive) return
      if (data && !dirtyRef.current) setFd({ store_name:data.store_name||'', address:data.address||'', whatsapp:data.whatsapp||'', struk_footer:data.struk_footer||'', logo_sidebar_url:data.logo_sidebar_url||null, logo_struk_url:data.logo_struk_url||null })
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])
  const upd = (k, v) => { dirtyRef.current = true; setFd(f => ({ ...f, [k]: v })) }
  const pickLogo = (setFile, setPrev) => e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 2 * 1024 * 1024) { toast.error('Ukuran gambar maksimal 2MB'); e.target.value = ''; return } dirtyRef.current = true; setFile(f); setPrev(URL.createObjectURL(f)) }
  async function upload(file, folder) { if (!file) return null; const ext = (file.name.split('.').pop() || 'png').toLowerCase(); const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`; const { error } = await supabase.storage.from('store-assets').upload(path, file, { contentType: file.type, upsert: true }); if (error) throw error; return supabase.storage.from('store-assets').getPublicUrl(path).data.publicUrl }
  async function save(e) {
    e.preventDefault(); setSaving(true)
    try {
      const urlSide = logoSide ? await upload(logoSide, 'logo-sidebar') : fd.logo_sidebar_url
      const urlStruk = logoStruk ? await upload(logoStruk, 'logo-struk') : fd.logo_struk_url
      const row = { id:1, store_name: fd.store_name || 'FANCELL', address: fd.address || '', whatsapp: fd.whatsapp || '', struk_footer: fd.struk_footer || '', logo_sidebar_url: urlSide || null, logo_struk_url: urlStruk || null, updated_at: new Date().toISOString() }
      const { error } = await supabase.from('settings').upsert(row)
      if (error) throw error
      setFd({ ...fd, logo_sidebar_url: urlSide || null, logo_struk_url: urlStruk || null })
      setLogoSide(null); setLogoStruk(null); setPrevSide(null); setPrevStruk(null)
      invalidateSettings()
      toast.success('Pengaturan toko disimpan')
    } catch (err) { toast.error('Gagal simpan: ' + err.message) } finally { setSaving(false) }
  }
  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <form onSubmit={save} className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl space-y-4">
      <h3 className="text-lg font-bold">Pengaturan Toko</h3>
      <Field label="Nama Toko"><input value={fd.store_name} onChange={e => upd('store_name', e.target.value)} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></Field>
      <Field label="Alamat"><input value={fd.address} onChange={e => upd('address', e.target.value)} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></Field>
      <Field label="Nomor WhatsApp / Telp"><input value={fd.whatsapp} onChange={e => upd('whatsapp', e.target.value)} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></Field>
      <Field label="Footer Struk"><input value={fd.struk_footer} onChange={e => upd('struk_footer', e.target.value)} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]"/></Field>
      <LogoBox label="Logo Toko (Tampil di Sidebar)" preview={prevSide || fd.logo_sidebar_url} onPick={pickLogo(setLogoSide, setPrevSide)} onClear={() => { upd('logo_sidebar_url', null); setLogoSide(null); setPrevSide(null) }}/>
      <LogoBox label="Logo Struk (Tampil di print struk)" preview={prevStruk || fd.logo_struk_url} onPick={pickLogo(setLogoStruk, setPrevStruk)} onClear={() => { upd('logo_struk_url', null); setLogoStruk(null); setPrevStruk(null) }}/>
      <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#0058A3] text-white rounded-lg font-medium flex items-center gap-2 hover:bg-[#004080] disabled:opacity-50">{saving ? 'Menyimpan...' : <><Check className="w-4 h-4"/>Simpan Pengaturan</>}</button>
      <p className="text-[11px] text-gray-400">Setelah simpan, sidebar & struk langsung ikut berubah tanpa refresh (data tersimpan permanen di database).</p>
    </form>
  )
}
function TabUser() {
  const toast = useToast(); const { user: me } = useAuth()
  const [users, setUsers] = useState([]); const [load, setLoad] = useState(true); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState(null); const [fd, setFd] = useState(emptyUser)
  const [showPw, setShowPw] = useState(false)
  const [cf, setCf] = useState(null); const ask = (message, action, confirmText) => setCf({ message, action, confirmText })
  useEffect(() => { run() }, [])
  async function run() { const { data, error } = await supabase.from('users').select('id, username, email, role, is_active').order('username'); if (error) toast.error(error.message); setUsers(data || []); setLoad(false) }
  async function submit(e) {
    e.preventDefault()
    try {
      if (editing) {
        const upd = { username: fd.username, email: fd.email || null, role: fd.role }
        if (fd.password) {
          if (fd.password !== fd.password2) return toast.error('Konfirmasi password tidak sama — ketik ulang dengan sama persis')
          upd.password = fd.password
        }
        // .select() untuk memastikan update benar-benar mengenai baris
        const { data: saved, error } = await supabase.from('users').update(upd).eq('id', editing.id).select()
        if (error) throw error
        if (!saved || !saved.length) return toast.error('Update tidak tersimpan — cek koneksi / izin database')
        toast.success(fd.password ? 'User diupdate — password baru tersimpan ✓' : 'User diupdate')
      } else {
        if (!fd.password) return toast.error('Password wajib diisi')
        if (fd.password !== fd.password2) return toast.error('Konfirmasi password tidak sama — ketik ulang dengan sama persis')
        const { error } = await supabase.from('users').insert({ username: fd.username, email: fd.email || null, password: fd.password, role: fd.role, is_active: true })
        if (error) throw error
        toast.success('User ditambahkan — password tersimpan ✓')
      }
      setShowForm(false); setEditing(null); setFd(emptyUser); setShowPw(false); run()
    } catch (err) { toast.error(err.message) }
  }
  function toggleUser(u) {
    if (u.id === me?.id) return toast.error('Tidak bisa menonaktifkan akun sendiri')
    if (u.is_active === false) {
      ask(`Aktifkan kembali user "${u.username}"?`, async () => { const { error } = await supabase.from('users').update({ is_active: true }).eq('id', u.id); if (error) toast.error(error.message); else toast.success('User diaktifkan kembali'); run() }, 'Ya, Aktifkan')
    } else {
      ask(`Nonaktifkan user "${u.username}"? User tidak akan bisa login lagi.`, async () => { const { error } = await supabase.from('users').update({ is_active: false }).eq('id', u.id); if (error) toast.error(error.message); else toast.success('User dinonaktifkan'); run() }, 'Ya, Nonaktifkan')
    }
  }
  function edit(u) { setEditing(u); setFd({ username: u.username, email: u.email || '', password: '', password2: '' }); setShowPw(false); setShowForm(true) }
  function add() { setEditing(null); setFd(emptyUser); setShowPw(false); setShowForm(true) }
  const badge = r => { const c = { owner: 'bg-[#0058A3] text-white', kasir: 'bg-blue-100 text-[#0058A3]', gudang: 'bg-gray-100 text-gray-700' }; return <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${c[r] || c.kasir}`}>{r.toUpperCase()}</span> }
  const pwInput = (field, placeholder) => (
    <div className="relative">
      <input type={showPw ? 'text' : 'password'} required={field === 'password' ? (!editing || !!fd.password) : (!!fd.password)} value={fd[field]} onChange={e => setFd({ ...fd, [field]: e.target.value })} className="w-full px-4 py-2.5 pr-11 border rounded-lg outline-none focus:ring-2 focus:ring-[#0058A3]" placeholder={placeholder} autoComplete="new-password"/>
      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0058A3] p-1" title={showPw ? 'Sembunyikan password' : 'Lihat password'}>
        {showPw ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
      </button>
    </div>
  )
  if (load) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <div>
      <div className="flex justify-between items-center mb-4"><p className="text-sm text-gray-500">{users.length} user terdaftar</p><button onClick={add} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm text-sm font-medium"><Plus className="w-4 h-4"/>Tambah User</button></div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit User' : 'Tambah User Baru'} footer={<div className="flex gap-3"><button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Batal</button><button form="userForm" type="submit" className="flex-1 px-4 py-2.5 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4"/>{editing ? 'Update' : 'Simpan'}</button></div>}>
        <form id="userForm" onSubmit={submit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Username *</label><input type="text" required value={fd.username} onChange={e => setFd({ ...fd, username: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Email (Opsional)</label><input type="email" value={fd.email} onChange={e => setFd({ ...fd, email: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none"/></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password {editing ? '(isi hanya jika mau ganti)' : '*'}</label>
            {pwInput('password', editing ? 'Kosongkan bila tidak diganti' : 'Minimal 6 karakter')}
            {fd.password && <div className="mt-2"><label className="block text-sm font-medium text-gray-700 mb-1.5">Ulangi Password (konfirmasi) *</label>{pwInput('password2', 'Ketik ulang password yang sama')}</div>}
            <p className="text-[11px] text-gray-400 mt-1">Klik ikon 👁 untuk melihat password sebelum simpan — pastikan ketik 2x sama.</p>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label><select value={fd.role} onChange={e => setFd({ ...fd, role: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg bg-white"><option value="owner">Owner (Akses Penuh)</option><option value="kasir">Kasir (Transaksi & Stok)</option><option value="gudang">Gudang (Master Barang Saja)</option></select><p className="text-xs text-gray-500 mt-1">{fd.role === 'owner' ? 'Semua modul termasuk Laba Rugi, Garansi & Pengaturan' : fd.role === 'kasir' ? 'POS, Riwayat, Barang, Garansi (tanpa Laba Rugi/Modal/Pengaturan)' : 'Master Barang & Stok saja'}</p></div>
        </form>
      </Modal>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">User</th><th className="text-left p-3">Email</th><th className="text-left p-3">Role</th><th className="text-left p-3">Hak Akses</th><th className="text-right p-3">Aksi</th></tr></thead>
        <tbody className="divide-y">{users.map(u => (<tr key={u.id} className="hover:bg-gray-50"><td className="p-3"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-gradient-to-br from-[#0058A3] to-[#004080] rounded-full flex items-center justify-center font-bold text-white text-sm">{u.username?.charAt(0).toUpperCase()}</div><span className="text-sm font-medium">{u.username}</span>{u.is_active === false && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">nonaktif</span>}{u.id === me?.id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-[#0058A3] font-medium">kamu</span>}</div></td><td className="p-3 text-sm text-gray-600">{u.email || '-'}</td><td className="p-3">{badge(u.role)}</td><td className="p-3 text-xs text-gray-500">{u.role === 'owner' ? 'Semua modul' : u.role === 'kasir' ? 'POS, Riwayat, Barang, Garansi' : 'Master Barang & Stok'}</td><td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => edit(u)} className="p-1.5 hover:bg-blue-50 rounded text-[#0058A3]"><Edit2 className="w-4 h-4"/></button><button onClick={() => toggleUser(u)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title={u.is_active === false ? 'Aktifkan kembali' : 'Nonaktifkan'}>{u.is_active === false ? <RotateCcw className="w-4 h-4"/> : <Trash2 className="w-4 h-4"/>}</button></div></td></tr>))}</tbody></table></div></div>
      <Confirm open={!!cf} danger message={cf?.message} confirmText={cf?.confirmText || 'Ya, Lanjut'} onClose={() => setCf(null)} onConfirm={async () => { const a = cf.action; setCf(null); await a() }}/>
    </div>
  )
}
