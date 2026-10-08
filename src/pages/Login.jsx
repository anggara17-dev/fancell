import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Zap, Eye, EyeOff, User } from 'lucide-react'
export default function Login() {
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
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#0058A3] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-count-up"><Zap className="w-9 h-9 text-white"/></div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">FANCELL</h1>
            <p className="text-gray-500 mt-2 text-sm">POS & Bookkeeping System</p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm animate-fade-in">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Pilih User</label>
              {usernames.length ? (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                  <select required value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] outline-none bg-white appearance-none">
                    <option value="">— pilih user —</option>
                    {usernames.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              ) : (
                <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] outline-none" placeholder="Masukkan username" autoComplete="username"/>
              )}
              {!usernames.length && <p className="text-[11px] text-amber-600 mt-1">Daftar user tidak termuat — ketik manual atau cek koneksi.</p>}
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label><div className="relative"><input type={show?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] outline-none pr-11" placeholder="••••••••" autoComplete="current-password"/><button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0058A3] p-1">{show?<EyeOff className="w-5 h-5"/>:<Eye className="w-5 h-5"/>}</button></div></div>
            <button type="submit" disabled={loading} className="w-full bg-[#0058A3] text-white py-3 rounded-lg font-semibold hover:bg-[#004080] transition-all disabled:opacity-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5">{loading?<span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Memproses...</span>:'Masuk'}</button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">Design & Develop By Depgo

</p>
        </div>
      </div>
    </div> )
}
