import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ToastProvider } from './components/ui'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useStoreSettings } from './lib/useStoreSettings'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import POSKasir from './pages/POSKasir'
import MetodeBayar from './pages/MetodeBayar'
import CetakPrinter from './pages/CetakPrinter'
import MasterBarang from './pages/MasterBarang'
import StokKartu from './pages/StokKartu'
import RiwayatTransaksi from './pages/RiwayatTransaksi'
import Konsinyasi from './pages/Konsinyasi'
import Garansi from './pages/Garansi'
import LabaRugi from './pages/LabaRugi'
import KeuntunganModal from './pages/KeuntunganModal'
import Settings from './pages/Settings'
import Sidebar from './components/Sidebar'
import Header from './components/Header'

function FaviconSync() {
  const ST = useStoreSettings()
  useEffect(() => {
    const url = ST.logo_sidebar_url || ST.logo_struk_url
    if (!url) return
    let link = document.querySelector("link[rel~='icon']")
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
    link.href = url + '?t=' + Date.now()
  }, [ST.logo_sidebar_url, ST.logo_struk_url])
  return null
}

function MainApp() {
  const { user, role } = useAuth()
  const [page, setPage] = useState('dashboard')
  // FIX: state filter tanggal dashboard dipindah ke sini agar bisa dipakai Header (UI) + Dashboard (hitungan)
  const [dashFrom, setDashFrom] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dashTo, setDashTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  if (!user) return <Login />
  const titles = {
    dashboard: 'Dashboard',
    kasir: 'POS Kasir',
    'metode-bayar': 'Metode Pembayaran',
    cetak: 'Cetak / Printer',
    barang: 'Master Barang',
    stok: 'Stok Masuk / Keluar',
    riwayat: 'Riwayat Transaksi',
    konsinyasi: 'Konsinyasi (Titip Jual)',
    garansi: 'Tracking Garansi',
    'laba-rugi': 'Laba Rugi',
    modal: 'Keuntungan & Modal',
    pengaturan: 'Pengaturan'
  }
  const render = () => {
    switch (page) {
      case 'dashboard': return <Dashboard from={dashFrom} to={dashTo} />
      case 'kasir': return <POSKasir />
      case 'metode-bayar': return <MetodeBayar />
      case 'cetak': return <CetakPrinter />
      case 'barang': return <MasterBarang />
      case 'stok': return <StokKartu />
      case 'riwayat': return <RiwayatTransaksi />
      case 'konsinyasi': return <Konsinyasi />
      case 'garansi': return <Garansi />
      case 'laba-rugi': return <LabaRugi />
      case 'modal': return <KeuntunganModal />
      case 'pengaturan': return <Settings />
      default: return <Dashboard />
    }
  }
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar currentPage={page} setCurrentPage={setPage} />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Header user={user} role={role} title={titles[page] || 'Dashboard'} showDateFilter={page === 'dashboard'} dateFrom={dashFrom} dateTo={dashTo} setDateFrom={setDashFrom} setDateTo={setDashTo} />
        <main className="flex-1 overflow-y-auto">{render()}</main>
      </div>
    </div>
  )
}
export default function App() {
  return (
    <ToastProvider>
      <FaviconSync />
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  )
}
