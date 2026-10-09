import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { DollarSign, Package, TrendingUp, ShoppingCart, Layers, AlertTriangle, Archive, Wallet, Users } from 'lucide-react'
const rp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0)
const vlabel = v => [v.color,v.storage].filter(x=>x&&x!=='-').join(' - ') || 'Standar'
const isoFrom = d => new Date(d + 'T00:00:00').toISOString()
const isoTo = d => new Date(d + 'T23:59:59.999').toISOString()
export default function Dashboard({ from, to }) {
  const [s,setS]=useState({sales:0,hpp:0,profit:0,tx:0,totalTx:0,totalProd:0,totalStock:0,low:0,hutang:0})
  const [chart,setChart]=useState([]); const [lowList,setLowList]=useState([]); const [load,setLoad]=useState(true)
  useEffect(()=>{ run() },[from, to])
  async function run(){
    setLoad(true)
    // 1 query utk seluruh rentang terpilih → dipakai untuk kartu + grafik
    const [txRange,allTx,prods,vars,imeis,mv,pays]=await Promise.all([
      supabase.from('transactions').select('total_amount, created_at, transaction_items(hpp_at_sale,qty)').gte('created_at',isoFrom(from)).lte('created_at',isoTo(to)).eq('payment_status','paid'),
      supabase.from('transactions').select('id',{count:'exact',head:true}).eq('payment_status','paid'),
      supabase.from('products').select('id,name,category,stock_type,status').eq('status','active'),
      supabase.from('product_variants').select('id,product_id,storage,color,stock_qty'),
      supabase.from('product_imeis').select('variant_id,status'),
      supabase.from('stock_movements').select('direction,reason,qty,unit_value').not('mitra_id','is',null),
      supabase.from('consignment_payments').select('amount')
    ])
    let sales=0,hpp=0,txCount=0; const byKey={}
    ;(txRange.data||[]).forEach(t=>{ const amt=+t.total_amount||0; sales+=amt; txCount++
      const key=format(new Date(t.created_at),'yyyy-MM-dd'); byKey[key]=(byKey[key]||0)+amt
      ;(t.transaction_items||[]).forEach(i=>{ hpp+=(+i.hpp_at_sale||0)*(i.qty||1) }) })
    const profit=sales-hpp
    // GRAFIK mengikuti rentang: per hari (≤60 hari) / per bulan (>60 hari)
    const spanDays=Math.round((new Date(to+'T00:00:00')-new Date(from+'T00:00:00'))/864e5)
    const ch=[]
    if(spanDays<=60 && spanDays>=0){
      for(let i=0;i<=spanDays;i++){ const d=new Date(from+'T00:00:00'); d.setDate(d.getDate()+i); const key=format(d,'yyyy-MM-dd')
        ch.push({ date: format(d, spanDays>14?'dd/MM':'dd MMM',{locale:id}), penjualan: byKey[key]||0 }) }
    } else {
      const byMonth={}; (txRange.data||[]).forEach(t=>{ const key=format(new Date(t.created_at),'yyyy-MM'); byMonth[key]=(byMonth[key]||0)+(+t.total_amount||0) })
      const d0=new Date(from+'T00:00:00'), d1=new Date(to+'T00:00:00')
      const cur=new Date(d0.getFullYear(), d0.getMonth(), 1), end=new Date(d1.getFullYear(), d1.getMonth(), 1)
      let guard=0
      while(cur<=end && guard<240){ const key=format(cur,'yyyy-MM'); ch.push({ date: format(cur,'MMM yy',{locale:id}), penjualan: byMonth[key]||0 }); cur.setMonth(cur.getMonth()+1); guard++ }
    }
    const stMap={}; (prods.data||[]).forEach(p=>stMap[p.id]=p.stock_type)
    const nameMap={}; (prods.data||[]).forEach(p=>nameMap[p.id]=p.name)
    const catMap={}; (prods.data||[]).forEach(p=>catMap[p.id]=p.category)
    const avByVar={}; (imeis.data||[]).forEach(x=>{ if(x.status==='available') avByVar[x.variant_id]=(avByVar[x.variant_id]||0)+1 })
    let stock=0; const low=[]
    ;(vars.data||[]).forEach(v=>{ const st=stMap[v.product_id]; if(!st) return
      if(st==='imei'){ const a=avByVar[v.id]||0; stock+=a; if(a===0) low.push({ name:nameMap[v.product_id], cat:catMap[v.product_id], label:vlabel(v), sisa:0, kind:'Habis' }) }
      else { const qq=+v.stock_qty||0; stock+=qq; if(qq<=5) low.push({ name:nameMap[v.product_id], cat:catMap[v.product_id], label:vlabel(v), sisa:qq, kind:'Menipis' }) }
    })
    let hutang=0; (mv.data||[]).forEach(m=>{ const v=(+m.qty||0)*(+m.unit_value||0); if(m.direction==='in'&&m.reason==='konsinyasi') hutang+=v; else if(m.direction==='out'&&m.reason==='konsinyasi_retur') hutang-=v })
    hutang-=(pays.data||[]).reduce((a,p)=>a+(+p.amount||0),0)
    hutang=Math.max(0,hutang)
    setS({sales,hpp,profit,tx:txCount,totalTx:allTx.count||0,totalProd:(prods.data||[]).length,totalStock:stock,low:low.length,hutang})
    setChart(ch); setLowList(low.sort((a,b)=>a.sisa-b.sisa)); setLoad(false)
  }
  const periodLabel = from===to ? format(new Date(from+'T00:00:00'),'dd MMM yyyy',{locale:id}) : format(new Date(from+'T00:00:00'),'dd MMM',{locale:id})+' – '+format(new Date(to+'T00:00:00'),'dd MMM',{locale:id})
  const Card=({icon:I,label,value,delay,sub})=>(<div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all animate-fade-in ${delay}`}><div
