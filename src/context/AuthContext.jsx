import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('kasir')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      if (session?.user) {
        const userRole = session.user.email === 'owner@fancell.com' ? 'owner' : 'kasir'
        setRole(userRole)
        loadUsers()
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        const userRole = session.user.email === 'owner@fancell.com' ? 'owner' : 'kasir'
        setRole(userRole)
        loadUsers()
      } else {
        setRole('kasir')
        setUsers([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, role')
        .order('username')
      
      if (!error && data) {
        setUsers(data)
      }
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = { user, role, users, login, logout, loadUsers }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
