import { useAuth } from '../context/AuthContext'

export default function Sidebar({ currentPage, setCurrentPage }) {
  const { user, role, logout } = useAuth()

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', roles: ['owner', 'kasir'] },
    { id: 'kasir', label: 'Kasir / POS', roles: ['owner', 'kasir'] },
    { id: 'barang', label: 'Master Barang', roles: ['owner', 'kasir', 'gudang'] },
    { id: 'riwayat', label: 'Riwayat Transaksi', roles: ['owner', 'kasir'] },
    { id: 'laba-rugi', label: 'Laba Rugi', roles: ['owner'] }, 
    { id: 'modal', label: 'Modal & Keuntungan', roles: ['owner'] }, 
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-[#0058A3]">Fancell</h1>
        <p className="text-xs text-gray-500 mt-1">Role: {role.toUpperCase()}</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          item.roles.includes(role) && (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition ${
                currentPage === item.id 
                  ? 'bg-[#0058A3] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          )
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-2 truncate">{user?.email}</div>
        <button 
          onClick={logout}
          className="w-full text-left px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
