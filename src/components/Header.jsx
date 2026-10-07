import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
export default function Header({ user, role, title, showDateFilter = false }) {
  const [greeting, setGreeting] = useState('')
  const [from, setFrom] = useState(format(new Date(),'yyyy-MM-dd'))
  const [to, setTo] = useState(format(new Date(),'yyyy-MM-dd'))
  const [alerts, setAlerts] = useState([]); const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef(null)
  useEffect(() => { const h = new Date().getHours(); setGreeting(h<11?'Selamat Pagi':h<15?'Selamat Siang':h<18?'Selamat Sore':'Selamat Malam') }, [])
  useEffect(() => { loadAlerts() }, [])
  useEffect(() => { const h = e => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false) }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  async function loadAlerts() {
    try {
      const [prods, vars, imeis] = await Promise.all([
        supabase.from('products').select('id,name,category,stock_type').eq('status','active'),
        supabase.from('product_variants').select('id,product_id,storage,color,stock_qty'),
        supabase.from('product_imeis').select('variant_id,status').eq('status','available')
      ])
      const pmap = {}; (prods.data||[]).forEach(p=>pmap[p.id]=p)
      const av = {}; (imeis.data||[]).forEach(x=>{ av[x.variant_id]=(av[x.variant_id]||0)+1 })
      const out = []
      ;(vars.data||[]).forEach(v=>{ const p=pmap[v.product_id]; if(!p) return; const sisa = p.stock_type==='imei' ? (av[v.id]||0) : (+v.stock_qty||0); if(sisa<=0) out.push({ name:p.name, cat:p.category, label:[v.color,v.storage].filter(x=>x&&x!=='-').join(' - ')||'Standar' }) })
      setAlerts(out)
    } catch { setAlerts([]) }
  }
  const today = () => { const t = format(new Date(),'yyyy-MM-dd'); setFrom(t); setTo(t) }
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm flex-shrink-0">
      <div><h1 className="text-2xl font-bold text-gray-900">{title}</h1>{showDateFilter && <p className="text-sm text-gray-500 mt-0.5">{greeting}, <span className="font-semibold text-[#0058A3]">{user?.username||user?.email?.split('@')[0]}</span>!</p>}</div>
      <div className="flex items-center gap-3">
        {showDateFilter && (<div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
          <div className="flex items-center gap-2 px-3"><span className="text-xs text-gray-500 font-medium">Dari</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="text-sm bg-transparent outline-none text-gray-700"/></div>
          <div className="w-px h-6 bg-gray-300"></div>
          <div className="flex items-center gap-2 px-3"><span className="text-xs text-gray-500 font-medium">Sampai</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="text-sm bg-transparent outline-none text-gray-700"/></div>
          <button onClick={today} className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100">Hari Ini</button>
        </div>)}
        <div className="relative" ref={bellRef}>
          <button onClick={() => { if (!bellOpen) loadAlerts(); setBellOpen(!bellOpen) }} className="p-2 hover:bg-gray-100 rounded-lg relative" title="Notifikasi stok">
            <Bell className="w-5 h-5 text-gray-600"/>
            {alerts.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
          </button>
          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"><p className="text-sm font-bold text-gray-900">Notifikasi Stok</p><span className="text-xs text-gray-400">{alerts.length ? alerts.length + ' stok habis' : 'aman'}</span></div>
              <div className="max-h-72 overflow-y-auto scrollbar-thin">
                {alerts.length ? alerts.map((a, i) => (
                  <div key={i} className="px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-2">
                    <div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{a.name}</p><p className="text-xs text-gray-500 truncate">{a.cat} · {a.label}</p></div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-600 flex-shrink-0">HABIS</span>
                  </div>
                )) : <p className="px-4 py-8 text-center text-sm text-gray-400">✓ Semua stok aman, tidak ada notifikasi</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
