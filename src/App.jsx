import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Sidebar from './components/Sidebar'

function MainApp() {
  const { user } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (!user) return <Login />

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 overflow-y-auto">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'kasir' && <div className="p-8 text-gray-500">Halaman Kasir (Segera Hadir)</div>}
        {currentPage === 'barang' && <div className="p-8 text-gray-500">Halaman Barang (Segera Hadir)</div>}
        {currentPage === 'riwayat' && <div className="p-8 text-gray-500">Halaman Riwayat (Segera Hadir)</div>}
        {currentPage === 'laba-rugi' && <div className="p-8 text-gray-500">Halaman Laba Rugi (Segera Hadir)</div>}
        {currentPage === 'modal' && <div className="p-8 text-gray-500">Halaman Modal (Segera Hadir)</div>}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  )
}
