import { useState, useEffect } from 'react'
import { Calendar, Menu } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function Header({ user, role, onToggleSidebar }) {
  const [greeting, setGreeting] = useState('')
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 11) setGreeting('Selamat Pagi')
    else if (hour < 15) setGreeting('Selamat Siang')
    else if (hour < 18) setGreeting('Selamat Sore')
    else setGreeting('Selamat Malam')
  }, [])

  const handleSetToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    setDateFrom(today)
    setDateTo(today)
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {greeting}, <span className="font-semibold text-blue-600">{user?.email?.split('@')[0]}</span>!
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
          <div className="flex items-center gap-2 px-3">
            <span className="text-xs text-gray-500 font-medium">Dari</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm bg-transparent outline-none text-gray-700"
            />
          </div>
          <div className="w-px h-6 bg-gray-300"></div>
          <div className="flex items-center gap-2 px-3">
            <span className="text-xs text-gray-500 font-medium">Sampai</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm bg-transparent outline-none text-gray-700"
            />
          </div>
          <button
            onClick={handleSetToday}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Hari Ini
          </button>
        </div>

        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{user?.email?.split('@')[0]}</p>
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
