import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { DollarSign, Package, TrendingUp, ShoppingCart, Layers, AlertTriangle, Archive, Wallet } from 'lucide-react'
const rp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0)

export default function Dashboard() {
  const [s, setS] = useState({sales:0,hpp:0,profit:0,tx:0,totalTx:0,totalProd:0,totalStock:0,low:0,capital:0})
  const [chart, setChart] = useState([])
  const [lowList, setLowList] = useState([])
  const [load, setLoad] = useState(true)

  useEffect(() => { run() }, [])
  async function run() {
    const today = new Date()
    const [txToday, allTx, prods, cap] = await Promise.all([
      supabase.from('transactions').select('total_amount, transaction_items(hpp_at_sale, qty)').gte('created_at', startOfDay(today).toISOString()).lte('created_at', endOfDay(today).toISOString()),
      supabase.from('transactions').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('name, category, stock_qty, status, storage, color'),
      supabase.from('capital_transactions').select('type, amount')
    ])
    let sales=0, hpp=0
    ;(txToday.data||[]).forEach(t=>{ sales+=+t.total_amount||0; (t.transaction_items||[]).forEach(i=>{ hpp+=(+i.hpp_at_sale||0)*(i.qty||1) }) })
    const avail = (prods.data||[]).filter(p=>p.status==='available')
    const hpCount = avail.filter(p=>p.category==='hp').length
    const acc = avail.filter(p=>p.category==='aksesoris')
    const stock = hpCount + acc.reduce((a,p)=>a+(+p.stock_qty||0),0)
    const lowArr = acc.filter(p=>(+p.stock_qty||0)<=5)
    let capital=0; (cap.data||[]).forEach(c=>{ capital += c.type==='capital_in'?(+c.amount||0):-(+c.amount||0) })
    const ch=[]
    for(let i=6;i>=0;i--){ const d=subDays(today,i); const r=await supabase.from('transactions').select('total_amount').gte('created_at',startOfDay(d).toISOString()).lte('created_at',endOfDay(d).toISOString()); ch.push({date:format(d,'dd MMM',{locale:id}), penjualan:(r.data||[]).reduce((a,t)=>a+(+t.total_amount||0),0)}) }
    setS({sales,hpp,profit:sales-hpp,tx:(txToday.data||[]).length,totalTx:allTx.count||0,totalProd:(prods.data||[]).length,totalStock:stock,low:lowArr.length,capital})
    setChart(ch); setLowList(lowArr); setLoad(false)
  }
  const Card=({icon:I,label,value,delay})=>(<div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all animate-fade-in ${delay}`}><div className="p-2.5 rounded-lg bg-blue-50 w-fit mb-4"><I className="w-5 h-5 text-[#0058A3]"/></div><p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1.5">{label}</p><p className="text-2xl font-bold text-gray-900">{value}</p></div>)
  if(load) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={DollarSign} label="Penjualan (Hari Ini)" value={rp(s.sales)} delay="stagger-1"/>
        <Card icon={Package} label="HPP (Hari Ini)" value={rp(s.hpp)} delay="stagger-2"/>
        <Card icon={TrendingUp} label="Laba Kotor (Hari Ini)" value={rp(s.profit)} delay="stagger-3"/>
        <Card icon={ShoppingCart} label="Transaksi (Hari Ini)" value={s.tx} delay="stagger-4"/>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Layers} label="Total Transaksi" value={s.totalTx} delay="stagger-5"/>
        <Card icon={Archive} label="Total Produk" value={s.totalProd} delay="stagger-6"/>
        <Card icon={Wallet} label="Total Stok" value={s.totalStock} delay="stagger-7"/>
        <Card icon={AlertTriangle} label="Stok Menipis" value={s.low} delay="stagger-8"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold mb-1">Grafik Penjualan (7 Hari)</h3><p className="text-sm text-gray-500 mb-4">Performa mingguan</p>
          {chart.every(c=>c.penjualan===0)?<div className="h-[320px] flex items-center justify-center text-gray-400 text-sm">Belum ada penjualan — checkout di POS untuk melihat data</div>:
          <ResponsiveContainer width="100%" height={320}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/><XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false}/><YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v=>(v/1e6).toFixed(0)+'jt'}/><Tooltip formatter={v=>rp(v)} contentStyle={{background:'#1f2937',border:'none',borderRadius:8,color:'#fff'}}/><Bar dataKey="penjualan" fill="#0058A3" radius={[6,6,0,0]} maxBarSize={50}/></BarChart></ResponsiveContainer>}
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Stok Menipis</h3><AlertTriangle className="w-5 h-5 text-[#0058A3]"/></div>
          {!lowList.length?<div className="h-[320px] flex items-center justify-center text-gray-400 text-sm">Semua stok aman</div>:
          <div className="space-y-1 max-h-[320px] overflow-y-auto">{lowList.map((p,i)=>(<div key={i} className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 rounded"><div className="min-w-0"><p className="text-sm font-medium truncate">{p.name}</p><p className="text-xs text-gray-500">{[p.color,p.storage].filter(Boolean).join(' · ')||'—'}</p></div><span className="text-sm font-bold text-[#0058A3] bg-blue-50 px-2.5 py-1 rounded">{p.stock_qty||0} pcs</span></div>))}</div>}
        </div>
      </div>
      <p className="text-center text-xs text-gray-400">Design & Develop By <span className="font-semibold text-gray-600">Fancell Team</span></p>
    </div>
  )
}
