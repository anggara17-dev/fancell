import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
export default function Header({ user, role, title, showDateFilter = false }) {
  const [greeting, setGreeting] = useState('')
  const [from, setFrom] = useState(format(new Date(),'yyyy-MM-dd'))
  const [to, setTo] = useState(format(new Date(),'yyyy-MM-dd'))
  useEffect(() => { const h = new Date().getHours(); setGreeting(h<11?'Selamat Pagi':h<15?'Selamat Siang':h<18?'Selamat Sore':'Selamat Malam') }, [])
  const today = () => { const t = format(new Date(),'yyyy-MM-dd'); setFrom(t); setTo(t) }
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div><h1 className="text-2xl font-bold text-gray-900">{title}</h1>{showDateFilter && <p className="text-sm text-gray-500 mt-0.5">{greeting}, <span className="font-semibold text-[#0058A3]">{user?.username||user?.email?.split('@')[0]}</span>!</p>}</div>
      {showDateFilter && (<div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
          <div className="flex items-center gap-2 px-3"><span className="text-xs text-gray-500 font-medium">Dari</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="text-sm bg-transparent outline-none text-gray-700"/></div>
          <div className="w-px h-6 bg-gray-300"></div>
          <div className="flex items-center gap-2 px-3"><span className="text-xs text-gray-500 font-medium">Sampai</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="text-sm bg-transparent outline-none text-gray-700"/></div>
          <button onClick={today} className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100">Hari Ini</button>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-lg relative"><Bell className="w-5 h-5 text-gray-600"/><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0058A3] rounded-full"></span></button>
      </div>)}
    </header> )
}
