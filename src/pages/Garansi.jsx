import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ShieldCheck, Search, Calendar, Printer, X } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'
const rp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0)
const today = () => format(new Date(),'yyyy-MM-dd')

export default function Garansi() {
  const [rows,setRows]=useState([]); const [load,setLoad]=useState(true)
  const [q,setQ]=useState(''); const [from,setFrom]=useState(format(startOfMonth(new Date()),'yyyy-MM-dd')); const [to,setTo]=useState(today())
  const [det,setDet]=useState(null)
  useEffect(()=>{ run() },[from,to])
  async function run(){ setLoad(true); const { data } = await supabase.from('transactions').select('id, invoice_no, customer_name, customer_phone, created_at, warranty_type, warranty_months, total_amount, transaction_items(product_name, variant_label, imei, price_at_sale)').gte('created_at', from+'T00:00:00').lte('created_at', to+'T23:59:59').neq('warranty_type','none').order('created_at',{ascending:false}); setRows(data||[]); setLoad(false) }
  const f = rows.filter(r=>{ const s=q.toLowerCase(); if(!s) return true; return r.customer_name?.toLowerCase().includes(s)||r.invoice_no?.toLowerCase().includes(s)||(r.transaction_items||[]).some(i=>i.imei?.toLowerCase().includes(s)||i.product_name?.toLowerCase().includes(s)) })
  const expiry = r => { const d=new Date(r.created_at); d.setMonth(d.getMonth()+(+r.warranty_months||0)); return d }
  const statusG = r => { const e=expiry(r); const now=new Date(); if(e<now) return {t:'HABIS',c:'bg-red-100 text-red-700'}; const days=Math.ceil((e-now)/864e5); return days<=14?{t:`SISA ${days} HARI`,c:'bg-amber-100 text-amber-700'}:{t:'AKTIF',c:'bg-green-100 text-green-700'} }
  const printKlaim=r=>{ const w=window.open('','_blank','width=380,height=520'); if(!w)return; const items=(r.transaction_items||[]).map(i=>`<div class=r><span>${i.product_name}${i.imei?' ('+i.imei+')':''}</span><span>${rp(i.price_at_sale)}</span></div>`).join(''); w.document.write(`<html><head><title>Klaim ${r.invoice_no}</title><style>@page{margin:6mm}body{font-family:Arial,sans-serif;font-size:12px;width:300px;margin:0 auto;color:#000}.c{text-align:center}.b{font-weight:bold}.hr{border-top:1px solid #000;margin:8px 0}.r{display:flex;justify-content:space-between;margin:2px 0}</style></head><body><div class="c b" style="font-size:16px">SURAT KLAM GARANSI</div><div class=hr></div><div class=r><span>No Invoice</span><span class=b>${r.invoice_no||'-'}</span></div><div class=r><span>Tgl Beli</span><span>${new Date(r.created_at).toLocaleDateString('id-ID')}</span></div><div class=r><span>Pelanggan</span><span>${r.customer_name}</span></div><div class=r><span>No. HP</span><span>${r.customer_phone||'-'}</span></div><div class=r><span>Garansi</span><span class=b>${r.warranty_months} bulan</span></div><div class=r><span>Berlaku s/d</span><span class=b>${expiry(r).toLocaleDateString('id-ID')}</span></div><div class=hr></div><div class="b">Unit</div>${items}<div class=hr></div><p>Syarat: kerusakan bukan akibat air/bakar/benturan keras. Serahkan unit + surat ini.</p><div style="margin-top:30px;display:flex;justify-content:space-between"><div class="c">Petugas<br><br><br>____________</div><div class="c">Pelanggan<br><br><br>____________</div></div></body></html>`); w.document.close(); w.focus(); setTimeout(()=>w.print(),300) }
  if(load) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-4"><h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-[#0058A3]"/>Tracking Garansi</h2><p className="text-sm text-gray-500 mt-0.5">Cari via nama konsumen, invoice, atau IMEI · {f.length} unit bergaransi</p></div>
      <div className="bg-white border rounded-xl p-3 mb-4 flex items-center gap-2 flex-wrap">
        <Calendar className="w-4 h-4 text-gray-400"/><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="text-sm border rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#0058A3]"/><span className="text-gray-400">s/d</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="text-sm border rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#0058A3]"/>
        <button onClick={()=>{setFrom(format(startOfMonth(new Date()),'yyyy-MM-dd'));setTo(today())}} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium hover:bg-gray-200">Bulan Ini</button>
        <button onClick={()=>{setFrom(today());setTo(today())}} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium hover:bg-gray-200">Hari Ini</button>
        <div className="flex-1 min-w-[200px] relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari nama / invoice / IMEI / produk..." className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0058A3]"/></div>
      </div>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">Invoice</th><th className="text-left p-3">Pelanggan</th><th className="text-left p-3">Unit / IMEI</th><th className="text-left p-3">Garansi</th><th className="text-left p-3">Berlaku s/d</th><th className="text-left p-3">Status</th><th className="text-right p-3">Aksi</th></tr></thead>
          <tbody className="divide-y">{f.map(r=>{ const st=statusG(r); const it=r.transaction_items||[]; return (<tr key={r.id} className="hover:bg-gray-50">
            <td className="p-3 font-mono text-xs text-gray-500">{r.invoice_no||r.id.slice(0,8)}</td>
            <td className="p-3 text-sm"><p className="font-medium">{r.customer_name}</p><p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString('id-ID')}</p></td>
            <td className="p-3 text-sm max-w-[220px]">{it.map((i,idx)=>(<div key={idx} className="truncate">{i.product_name}{i.imei&&<span className="block text-[10px] font-mono text-gray-400">{i.imei}</span>}</div>))}</td>
            <td className="p-3 text-sm font-medium text-[#0058A3]">{r.warranty_months} bln</td>
            <td className="p-3 text-sm text-gray-600">{expiry(r).toLocaleDateString('id-ID')}</td>
            <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${st.c}`}>{st.t}</span></td>
            <td className="p-3 text-right"><button onClick={()=>printKlaim(r)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 text-[#0058A3] flex items-center gap-1 ml-auto"><Printer className="w-3.5 h-3.5"/>Surat Klaim</button></td>
          </tr>) })}{!f.length&&<tr><td colSpan={7} className="p-12 text-center text-gray-400">Tidak ada unit bergaransi pada periode ini</td></tr>}</tbody></table>
      </div>
    </div> )
}
