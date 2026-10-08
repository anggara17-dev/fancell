import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useStoreSettings } from '../lib/useStoreSettings'
import { Zap, Eye, EyeOff, User, Lock, Repeat, FileText, Wallet, PackagePlus } from 'lucide-react'
export default function Login() {
  const ST = useStoreSettings()
  const [usernames, setUsernames] = useState([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('users').select('username').eq('is_active', true).order('username')
      setUsernames((data || []).map(x => x.username))
    })()
  }, [])
  const submit = async e => { e.preventDefault(); setError(''); if (!username) { setError('Pilih username dulu'); return } setLoading(true); try { await login(username, password) } catch (err) { setError(err.message) } setLoading(false) }
  const logo = ST.logo_sidebar_url
    ? <img src={ST.logo_sidebar_url} alt="logo" className="w-20 h-20 rounded-2xl object-contain bg-white/10 backdrop-blur p-2 shadow-xl ring-1 ring-white/20"/>
    : <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center shadow-xl ring-1 ring-white/20"><Zap className="w-11 h-11 text-white"/></div>
  const fitur = [
    [Repeat, 'Alur Keluar Masuk Barang'],
    [FileText, 'Pembukuan Laba Rugi'],
    [Wallet, 'Pembukuan Titip Jual'],
    [PackagePlus, 'Daftar Garansi']
  ]
  return (
    <div className="min-h-screen flex bg-white">
      {/* PANEL KIRI — branding (sembunyi di layar kecil) */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-[#0058A3] via-[#004a8c] to-[#003466] text-white flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full pointer-events-none"></div>
        <div className="absolute bottom-10 -left-20 w-72 h-72 bg-white/5 rounded-full pointer-events-none"></div>
        <div className="relative animate-fade-in">
          {logo}
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight mt-8 leading-tight uppercase">{ST.store_name || 'Fancell'}</h1>
          <p className="mt-4 text-white/80 max-w-md leading-relaxed">Store iPhone Terpercaya | Menerima Jual Beli, Tukar Tambah, Cicilan dll</p>
        </div>
        <div className="relative">
          <div className="border-t border-white/20 pt-8 space-y-4">
            {fitur.map(([I, teks]) => (
              <div key={teks} className="flex items-start gap-3 text-sm text-white/90">
                <I className="w-5 h-5 flex-shrink-0 mt-0.5 text-white/70"/>
                <span>{teks}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-xs text-white/40">{(ST.store_name || 'Fancell')} POS — Design & Develop by Depgo</p>
        </div>
      </div>
      {/* PANEL KANAN — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md animate-fade-in">
          {/* logo kecil utk mobile (panel kiri tersembunyi) */}
          <div className="lg:hidden text-center mb-8">
            {logo}
            <h1 className="text-2xl font-bold text-gray-900 mt-3 uppercase">{ST.store_name || 'Fancell'}</h1>
            <p className="text-gray-500 text-sm mt-1">POS & Bookkeeping System</p>
          </div>
          <div className="bg-white lg:bg-transparent lg:shadow-none lg:border-0 border border-gray-200 rounded-2xl lg:rounded-none shadow-xl lg:shadow-none p-8 lg:p-0">
            <h2 className="text-3xl font-bold text-gray-900">Masuk</h2>
            <p className="text-gray-500 mt-2 text-sm">Gunakan akun yang terdaftar di toko.</p>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-5 text-sm animate-fade-in">{error}</div>}
            <form onSubmit={submit} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                {usernames.length ? (
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                    <select required value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] focus:border-[#0058A3] outline-none bg-white">
                      <option value="">— pilih user —</option>
                      {usernames.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                ) : (
                  <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] outline-none" placeholder="Masukkan username" autoComplete="username"/>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input type={show?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] focus:border-[#0058A3] outline-none pr-11" placeholder="••••••••" autoComplete="current-password"/>
                  <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0058A3] p-1" title={show ? 'Sembunyikan' : 'Lihat password'}>{show?<EyeOff className="w-5 h-5"/>:<Eye className="w-5 h-5"/>}</button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#0058A3] text-white py-3 rounded-lg font-semibold hover:bg-[#004080] transition-all disabled:opacity-50 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <><Lock className="w-4 h-4"/>Masuk</>}
              </button>
            </form>
            <p className="text-center text-xs text-gray-400 mt-8">Design & Develop By Depgo</p>
          </div>
        </div>
      </div>
    </div>
  )
}
