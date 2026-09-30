import { useState, useEffect } from 'react'
import { Calendar, Bell } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function Header({ user, role }) {
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {greeting}, <span className="font-semibold text-[#0058A3]">{user?.email?.split('@')[0]}</span>!
        </p>
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

        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0058A3] rounded-full"></span>
        </button>
      </div>
    </header>
  )
}
