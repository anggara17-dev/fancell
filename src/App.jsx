import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import POSKasir from './pages/POSKasir'
import MetodeBayar from './pages/MetodeBayar'
import CetakPrinter from './pages/CetakPrinter'
import MasterBarang from './pages/MasterBarang'
import RiwayatTransaksi from './pages/RiwayatTransaksi'
import LabaRugi from './pages/LabaRugi'
import KeuntunganModal from './pages/KeuntunganModal'
import Settings from './pages/Settings'
import Sidebar from './components/Sidebar'
import Header from './components/Header'

function MainApp() {
  const { user, role } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (!user) return <Login />

  const pageTitles = {
    'dashboard': 'Dashboard',
    'kasir': 'POS Kasir',
    'metode-bayar': 'Metode Pembayaran',
    'cetak': 'Cetak / Printer',
    'barang': 'Master Barang',
    'riwayat': 'Riwayat Transaksi',
    'laba-rugi': 'Laba Rugi',
    'modal': 'Keuntungan & Modal',
    'pengaturan': 'Pengaturan'
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />
      case 'kasir': return <POSKasir />
      case 'metode-bayar': return <MetodeBayar />
      case 'cetak': return <CetakPrinter />
      case 'barang': return <MasterBarang />
      case 'riwayat': return <RiwayatTransaksi />
      case 'laba-rugi': return <LabaRugi />
      case 'modal': return <KeuntunganModal />
      case 'pengaturan': return <Settings />
      default: return <Dashboard />
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          user={user} 
          role={role} 
          title={pageTitles[currentPage] || 'Dashboard'}
          showDateFilter={currentPage === 'dashboard'}
        />
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
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
