import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Sidebar from './components/Sidebar'
import Header from './components/Header'

function MainApp() {
  const { user, role } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (!user) return <Login />

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />
      case 'kasir': return <PlaceholderPage title="POS / Kasir" desc="Fitur kasir akan segera hadir" />
      case 'barang': return <PlaceholderPage title="Master Barang" desc="Kelola produk & stok" />
      case 'riwayat': return <PlaceholderPage title="Riwayat Transaksi" desc="Histori semua transaksi" />
      case 'garansi': return <PlaceholderPage title="Garansi" desc="Klaim & status garansi" />
      case 'printer': return <PlaceholderPage title="Pengaturan Printer" desc="Konfigurasi printer thermal" />
      case 'pengaturan': return <Settings />
      default: return <Dashboard />
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} role={role} />
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

function PlaceholderPage({ title, desc }) {
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center animate-fade-in">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🚧</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500">{desc}</p>
        <p className="text-sm text-gray-400 mt-4">Sedang dalam pengembangan</p>
      </div>
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
