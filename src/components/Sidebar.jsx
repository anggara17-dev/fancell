import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ClipboardList,
  History,
  Shield,
  Users,
  Settings,
  Printer,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react'

export default function Sidebar({ currentPage, setCurrentPage }) {
  const { user, role, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'kasir'] },
    { id: 'kasir', label: 'POS / Kasir', icon: ShoppingCart, roles: ['owner', 'kasir'] },
    { id: 'barang', label: 'Master Barang', icon: Package, roles: ['owner', 'kasir', 'gudang'] },
    { id: 'stok', label: 'Stok & Opname', icon: ClipboardList, roles: ['owner', 'gudang'] },
    { id: 'riwayat', label: 'Riwayat Trx', icon: History, roles: ['owner', 'kasir'] },
    { id: 'garansi', label: 'Garansi', icon: Shield, roles: ['owner', 'kasir'] },
    { id: 'konsinyasi', label: 'Konsinyasi', icon: Users, roles: ['owner'] },
    { id: 'printer', label: 'Pengaturan Printer', icon: Printer, roles: ['owner', 'kasir'] },
    { id: 'user', label: 'Manajemen User', icon: Users, roles: ['owner'] },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings, roles: ['owner'] },
  ]

  const filteredMenu = menuItems.filter(item => item.roles.includes(role))

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } bg-[#0a0a0a] text-white min-h-screen flex flex-col transition-all duration-300 ease-in-out relative shadow-2xl`}
    >
      {/* Logo & Toggle */}
      <div className="p-5 flex items-center justify-between border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-3 animate-slide-left">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wider">FANCELL</h1>
              <p className="text-[10px] text-gray-400 -mt-1">POS & Bookkeeping</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center mx-auto shadow-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-7 w-6 h-6 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg z-10"
          title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredMenu.map((item, idx) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              title={collapsed ? item.label : ''}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-800">
        {!collapsed ? (
          <div className="flex items-center gap-3 animate-slide-left">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-400 capitalize">{role}</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-400 transition-colors p-1"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-400 transition-colors p-1"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
