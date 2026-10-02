import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { DollarSign, Package, TrendingUp, TrendingDown, Receipt, Percent } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { id } from 'date-fns/locale'
const rp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0)
export default function LabaRugi() {
  const [from,setFrom]=useState(format(startOfMonth(new Date()),'yyyy-MM-dd'))
  const [to,setTo]=useState(format(endOfMonth(new Date()),'yyyy-MM-dd'))
  const [d,setD]=useState({rev:0,hpp:0,gross:0,fee:0,opex:0,net:0})
  const [load,setLoad]=useState(true)
  useEffect(()=>{ run() },[from,to])
  async function run(){
    setLoad(true)
    const [tx,op]=await Promise.all([
      supabase.from('transactions').select('total_amount, transaction_items(hpp_at_sale,qty), payments(admin_fee)').gte('created_at',from).lte('created_at',to+'T23:59:59'),
      supabase.from('operational_costs').select('amount').gte('date',from).lte(to)
    ])
    let rev=0,hpp=0,fee=0
    ;(tx.data||[]).forEach(t=>{ rev+=+t.total_amount||0; (t.transaction_items||[]).forEach(i=>hpp+=(+i.hpp_at_sale||0)*(i.qty||1)); (t.payments||[]).forEach(p=>fee+=+p.admin_fee||0) })
    const opex=(op.data||[]).reduce((a,c)=>a+(+c.amount||0),0)
    const gross=rev-hpp
    setD({rev,hpp,gross,fee,opex,net:gross-fee-opex})
    setLoad(false)
  }
  const Box=({icon:I,label,val,color})=>(<div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><div className={`p-2.5 rounded-lg w-fit mb-3 ${color.bg}`}><I className={`w-5 h-5 ${color.txt}`}/></div><p className="text-xs text-gray-500 uppercase font-medium mb-1">{label}</p><p className={`text-2xl font-bold ${color.val}`}>{val}</p></div>)
  if(load) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <div className="p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Laba Rugi</h2><p className="text-sm text-gray-500 mt-0.5">{format(new Date(from),'dd MMM yyyy',{locale:id})} — {format(new Date(to),'dd MMM yyyy',{locale:id})}</p></div>
        <div className="flex items-center gap-2 bg-gray-50 border rounded-lg p-1"><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="text-sm bg-transparent px-2 outline-none"/><span className="text-gray-400">-</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="text-sm bg-transparent px-2 outline-none"/></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Box icon={DollarSign} label="Pendapatan" val={rp(d.rev)} color={{bg:'bg-blue-50',txt:'text-[#0058A3]',val:'text-gray-900'}}/>
        <Box icon={Package} label="HPP" val={rp(d.hpp)} color={{bg:'bg-orange-50',txt:'text-orange-600',val:'text-gray-900'}}/>
        <Box icon={TrendingUp} label="Laba Kotor" val={rp(d.gross)} color={{bg:'bg-green-50',txt:'text-green-600',val:'text-green-600'}}/>
        <Box icon={d.net>=0?TrendingUp:TrendingDown} label="Laba Bersih" val={rp(d.net)} color={{bg:d.net>=0?'bg-green-50':'bg-red-50',txt:d.net>=0?'text-green-600':'text-red-600',val:d.net>=0?'text-green-600':'text-red-600'}}/>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b"><h3 className="text-lg font-bold">Detail Perhitungan</h3></div>
        <div className="p-6 space-y-3 text-sm">
          <Line l="Total Pendapatan (Penjualan)" v={rp(d.rev)}/>
          <Line l="Harga Pokok Penjualan (HPP)" v={'- '+rp(d.hpp)} red/>
          <div className="flex justify-between py-3 px-4 rounded-lg bg-blue-50 border-b-2 border-[#0058A3]"><span className="font-bold text-[#0058A3]">Laba Kotor</span><span className="font-bold text-[#0058A3]">{rp(d.gross)}</span></div>
          <Line l={<span className="flex items-center gap-1"><Percent className="w-3 h-3"/>Biaya Admin Paylater/EDC/QRIS</span>} v={'- '+rp(d.fee)} red/>
          <Line l={<span className="flex items-center gap-1"><Receipt className="w-3 h-3"/>Biaya Operasional</span>} v={'- '+rp(d.opex)} red/>
          <div className="flex justify-between py-4 px-4 rounded-lg bg-green-50"><span className="font-bold text-green-700 text-base">Laba Bersih</span><span className={`font-bold text-base ${d.net>=0?'text-green-700':'text-red-700'}`}>{rp(d.net)}</span></div>
        </div>
      </div>
    </div> )
}
function Line({l,v,red}){return <div className="flex justify-between py-3 border-b border-gray-100"><span className="text-gray-700">{l}</span><span className={`font-semibold ${red?'text-red-600':'text-gray-900'}`}>{v}</span></div>}
