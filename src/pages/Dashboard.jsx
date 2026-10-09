import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays, startOfDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { DollarSign, Package, TrendingUp, ShoppingCart, Layers, AlertTriangle, Archive, Wallet, Users } from 'lucide-react'
const rp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0)
const vlabel = v => [v.color,v.storage].filter(x=>x&&x!=='-').join(' - ') || 'Standar'
export default function Dashboard() {
  const [s,setS]=useState({sales:0,hpp:0,profit:0,tx:0,totalTx:0,totalProd:0,totalStock:0,low:0,hutang:0})
  const [chart,setChart]=useState([]); const [lowList,setLowList]=useState([]); const [load,setLoad]=useState(true)
  useEffect(()=>{ run() },[])
  async function run(){
    const today=new Date()
    // 1 query utk grafik 7 hari, lalu dikelompokkan di client
    const [txWeek,allTx,prods,vars,imeis,mv,pays]=await Promise.all([
      supabase.from('transactions').select('total_amount, created_at, transaction_items(hpp_at_sale,qty)').gte('created_at',startOfDay(subDays(today,6)).toISOString()).eq('payment_status','paid'),
      supabase.from('transactions').select('id',{count:'exact',head:true}).eq('payment_status','paid'),
      supabase.from('products').select('id,name,category,stock_type,status').eq('status','active'),
      supabase.from('product_variants').select('id,product_id,storage,color,stock_qty'),
      supabase.from('product_imeis').select('variant_id,status'),
      supabase.from('stock_movements').select('direction,reason,qty,unit_value').not('mitra_id','is',null),
      supabase.from('consignment_payments').select('amount')
    ])
    const todayKey=format(today,'yyyy-MM-dd'); const byDay={}
    let sales=0,hpp=0,txToday=0
    ;(txWeek.data||[]).forEach(t=>{ const key=format(new Date(t.created_at),'yyyy-MM-dd'); const amt=+t.total_amount||0; byDay[key]=(byDay[key]||0)+amt
      if(key===todayKey){ sales+=amt; txToday++; (t.transaction_items||[]).forEach(i=>{ hpp+=(+i.hpp_at_sale||0)*(i.qty||1) }) } })
    const ch=[]
    for(let i=6;i>=0;i--){ const d=subDays(today,i); ch.push({date:format(d,'dd MMM',{locale:id}), penjualan:byDay[format(d,'yyyy-MM-dd')]||0}) }
    const stMap={}; (prods.data||[]).forEach(p=>stMap[p.id]=p.stock_type)
    const nameMap={}; (prods.data||[]).forEach(p=>nameMap[p.id]=p.name)
    const catMap={}; (prods.data||[]).forEach(p=>catMap[p.id]=p.category)
    const avByVar={}; (imeis.data||[]).forEach(x=>{ if(x.status==='available') avByVar[x.variant_id]=(avByVar[x.variant_id]||0)+1 })
    let stock=0; const low=[]
    ;(vars.data||[]).forEach(v=>{ const st=stMap[v.product_id]; if(!st) return
      if(st==='imei'){ const a=avByVar[v.id]||0; stock+=a; if(a===0) low.push({ name:nameMap[v.product_id], cat:catMap[v.product_id], label:vlabel(v), sisa:0, kind:'Habis' }) }
      else { const qq=+v.stock_qty||0; stock+=qq; if(qq<=5) low.push({ name:nameMap[v.product_id], cat:catMap[v.product_id], label:vlabel(v), sisa:qq, kind:'Menipis' }) }
    })
    // HUTANG KONSINYASI (sama dengan halaman Keuntungan & Modal)
    let hutang=0; (mv.data||[]).forEach(m=>{ const v=(+m.qty||0)*(+m.unit_value||0); if(m.direction==='in'&&m.reason==='konsinyasi') hutang+=v; else if(m.direction==='out'&&m.reason==='konsinyasi_retur') hutang-=v })
    hutang-=(pays.data||[]).reduce((a,p)=>a+(+p.amount||0),0)
    hutang=Math.max(0,hutang)
    setS({sales,hpp,profit:sales-hpp,tx:txToday,totalTx:allTx.count||0,totalProd:(prods.data||[]).length,totalStock:stock,low:low.length,hutang})
    setChart(ch); setLowList(low.sort((a,b)=>a.sisa-b.sisa)); setLoad(false)
  }
  const Card=({icon:I,label,value,delay,sub})=>(<div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all animate-fade-in ${delay}`}><div className="p-2.5 rounded-lg bg-blue-50 w-fit mb-4"><I className="w-5 h-5 text-[#0058A3]"/></div><p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1.5">{label}</p><p className="text-2xl font-bold text-gray-900">{value}</p>{sub&&<p className="text-[11px] text-gray-400 mt-1">{sub}</p>}</div>)
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
        <Card icon={Archive} label="Total Produk Aktif" value={s.totalProd} delay="stagger-6"/>
        <Card icon={Wallet} label="Total Stok (unit/pcs)" value={s.totalStock} delay="stagger-7"/>
        <Card icon={Users} label="Hutang Konsinyasi" value={rp(s.hutang)} delay="stagger-8" sub="belum dibayar ke mitra"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold mb-1">Grafik Penjualan (7 Hari)</h3><p className="text-sm text-gray-500 mb-4">Performa mingguan</p>
          {chart.every(c=>c.penjualan===0)?<div className="h-[320px] flex items-center justify-center text-gray-400 text-sm">Belum ada penjualan — checkout di POS untuk melihat data</div>:
          <ResponsiveContainer width="100%" height={320}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/><XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false}/><YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v=>(v/1e6).toFixed(0)+'jt'}/><Tooltip formatter={v=>rp(v)} contentStyle={{background:'#1f2937',border:'none',borderRadius:8,color:'#fff'}}/><Bar dataKey="penjualan" fill="#0058A3" radius={[6,6,0,0]} maxBarSize={50}/></BarChart></ResponsiveContainer>}
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Stok Menipis / Habis</h3><AlertTriangle className="w-5 h-5 text-[#0058A3]"/></div>
          {!lowList.length?<div className="h-[320px] flex items-center justify-center text-gray-400 text-sm">Semua stok aman</div>:
          <div className="space-y-1 max-h-[320px] overflow-y-auto">{lowList.map((p,i)=>(<div key={i} className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 rounded"><div className="min-w-0"><p className="text-sm font-medium truncate">{p.name}</p><p className="text-xs text-gray-500">{p.cat} · {p.label}</p></div><span className={`text-sm font-bold px-2.5 py-1 rounded ${p.kind==='Habis'?'text-red-600 bg-red-50':'text-[#0058A3] bg-blue-50'}`}>{p.sisa} {p.kind}</span></div>))}</div>}
        </div>
      </div>
      <p className="text-center text-xs text-gray-400">Design & Develop By <span className="font-semibold text-gray-600">Fancell Team</span></p>
    </div> )
}
