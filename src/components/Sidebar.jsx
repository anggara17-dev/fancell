import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStoreSettings } from '../lib/useStoreSettings'
import { LayoutDashboard, ShoppingCart, Package, History, FileText, Wallet, Settings, ShieldCheck, Repeat, ChevronLeft, ChevronRight, ChevronDown, LogOut, Zap, CreditCard, Printer } from 'lucide-react'
export default function Sidebar({ currentPage, setCurrentPage }) {
  const { user, role, logout } = useAuth(); const ST = useStoreSettings()
  const [collapsed, setCollapsed] = useState(false); const [userMenuOpen, setUserMenuOpen] = useState(false); const [kasirOpen, setKasirOpen] = useState(true); const ref = useRef(null)
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) setUserMenuOpen(false) }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  // FIX: dropdown Kasir/POS otomatis tertutup saat tidak berada di halaman kasir
  useEffect(() => { if (!['kasir','metode-bayar','cetak'].includes(currentPage)) setKasirOpen(false) }, [currentPage])
  const menu = [
    { id:'dashboard', label:'Dashboard', icon:LayoutDashboard, roles:['owner','kasir'] },
    { id:'kasir-group', label:'Kasir / POS', icon:ShoppingCart, roles:['owner','kasir'], children:[ {id:'kasir',label:'POS Kasir',icon:ShoppingCart}, {id:'metode-bayar',label:'Metode Bayar',icon:CreditCard}, {id:'cetak',label:'Cetak / Printer',icon:Printer} ] },
    { id:'barang', label:'Master Barang', icon:Package, roles:['owner','kasir','gudang'] },
    { id:'riwayat', label:'Riwayat Transaksi', icon:History, roles:['owner','kasir'] },
    { id:'konsinyasi', label:'Konsinyasi', icon:Repeat, roles:['owner','kasir'] },
    { id:'garansi', label:'Garansi', icon:ShieldCheck, roles:['owner','kasir'] },
    { id:'laba-rugi', label:'Laba Rugi', icon:FileText, roles:['owner'] },
    { id:'modal', label:'Keuntungan & Modal', icon:Wallet, roles:['owner'] },
    { id:'pengaturan', label:'Pengaturan', icon:Settings, roles:['owner'] } ]
  const fm = menu.filter(m => m.roles.includes(role))
  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col transition-all duration-300 relative shadow-sm flex-shrink-0`}>
      <div className="p-5 flex items-center border-b border-gray-200 flex-shrink-0">
        {!collapsed ? (<div className="flex items-center gap-3 overflow-hidden">{ST.logo_sidebar_url ? <img src={ST.logo_sidebar_url} alt="logo" className="w-10 h-10 rounded-xl object-contain bg-white shadow-md flex-shrink-0"/> : <div className="w-10 h-10 bg-[#0058A3] rounded-xl flex items-center justify-center shadow-md flex-shrink-0"><Zap className="w-6 h-6 text-white"/></div>}<div className="min-w-0"><h1 className="text-lg font-bold tracking-wider text-gray-900">{(ST.store_name || 'FANCELL').toUpperCase()}</h1><p className="text-[10px] text-gray-500 -mt-0.5">POS & Bookkeeping</p></div></div>) : (ST.logo_sidebar_url ? <img src={ST.logo_sidebar_url} alt="logo" className="w-10 h-10 rounded-xl object-contain mx-auto shadow-md"/> : <div className="w-10 h-10 bg-[#0058A3] rounded-xl flex items-center justify-center mx-auto shadow-md"><Zap className="w-6 h-6 text-white"/></div>)}
      </div>
      <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-20 w-6 h-6 bg-[#0058A3] hover:bg-[#004080] text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg z-20">{collapsed ? <ChevronRight className="w-3.5 h-3.5"/> : <ChevronLeft className="w-3.5 h-3.5"/>}</button>
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {fm.map(item => { const Icon = item.icon
          if (item.children) { const active = item.children.some(c => c.id === currentPage); return (<div key={item.id}>
            <button onClick={() => collapsed ? setCurrentPage(item.children[0].id) : setKasirOpen(!kasirOpen)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${active ? 'bg-blue-50 text-[#0058A3]' : 'text-gray-600 hover:bg-gray-100 hover:text-[#0058A3]'}`} title={collapsed ? item.label : ''}><Icon className="w-5 h-5 flex-shrink-0"/>{!collapsed && <><span className="truncate flex-1 text-left">{item.label}</span><ChevronDown className={`w-4 h-4 transition-transform ${kasirOpen ? 'rotate-180' : ''}`}/></>}</button>
            {!collapsed && kasirOpen && <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3 animate-fade-in">{item.children.map(c => { const CI = c.icon; const a = currentPage === c.id; return (<button key={c.id} onClick={() => setCurrentPage(c.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${a ? 'bg-[#0058A3] text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-[#0058A3]'}`}><CI className="w-4 h-4 flex-shrink-0"/><span className="truncate">{c.label}</span></button>) })}</div>}
          </div>) }
          const a = currentPage === item.id; return (<button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${a ? 'bg-[#0058A3] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-[#0058A3]'}`} title={collapsed ? item.label : ''}><Icon className="w-5 h-5 flex-shrink-0"/>{!collapsed && <span className="truncate">{item.label}</span>}</button>) })}
      </nav>
      <div className="p-3 border-t border-gray-200 relative flex-shrink-0" ref={ref}>
        <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"><div className="w-9 h-9 bg-gradient-to-br from-[#0058A3] to-[#004080] rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 shadow-md">{(user?.username || user?.email || 'U').charAt(0).toUpperCase()}</div>{!collapsed && <div className="flex-1 min-w-0 text-left"><p className="text-sm font-semibold text-gray-900 truncate">{user?.username || user?.email?.split('@')[0]}</p><p className="text-xs text-gray-500 capitalize">{role}</p></div>}</button>
        {userMenuOpen && !collapsed && <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl py-1 animate-fade-in z-40"><div className="px-3 py-2 border-b border-gray-100"><p className="text-xs text-gray-500">Login sebagai</p><p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p></div><button onClick={() => { setUserMenuOpen(false); logout() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"><LogOut className="w-4 h-4"/><span>Keluar</span></button></div>}
      </div>
    </aside>
  )
}
