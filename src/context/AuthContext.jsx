import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('kasir')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cek session dari localStorage
    const savedUser = localStorage.getItem('fancell_user')
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        setUser(parsed)
        setRole(parsed.role)
      } catch (e) {
        localStorage.removeItem('fancell_user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      throw new Error('Username atau password salah')
    }

    const userData = {
      id: data.id,
      username: data.username,
      email: data.email,
      role: data.role
    }

    setUser(userData)
    setRole(data.role)
    localStorage.setItem('fancell_user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    setRole('kasir')
    localStorage.removeItem('fancell_user')
  }

  const value = { user, role, login, logout }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
