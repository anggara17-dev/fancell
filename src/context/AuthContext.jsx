import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('kasir')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const saved = localStorage.getItem('fancell_user')
    if (saved) { try { const p = JSON.parse(saved); setUser(p); setRole(p.role) } catch { localStorage.removeItem('fancell_user') } }
    setLoading(false)
  }, [])
  const login = async (username, password) => {
    const { data, error } = await supabase.from('users').select('*').eq('username', username).eq('password', password).eq('is_active', true).single()
    if (error || !data) throw new Error('Username atau password salah')
    const u = { id: data.id, username: data.username, email: data.email, role: data.role }
    setUser(u); setRole(data.role); localStorage.setItem('fancell_user', JSON.stringify(u))
  }
  const logout = () => { setUser(null); setRole('kasir'); localStorage.removeItem('fancell_user') }
  return <AuthContext.Provider value={{ user, role, login, logout }}>{!loading && children}</AuthContext.Provider>
}
