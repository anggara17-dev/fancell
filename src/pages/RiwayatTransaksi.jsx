import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { History, Search, Eye, Printer, X } from 'lucide-react'
const rp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0)

export default function Riwayat() {
  const [list,setList]=useState([]); const [q,setQ]=useState(''); const [det,setDet]=useState(null); const [load,setLoad]=useState(true)
  useEffect(()=>{ run() },[])
  async function run(){ const {data}=await supabase.from('transactions').select('*, transaction_items(count), payments(count)').order('created_at',{ascending:false}); setList(data||[]); setLoad(false) }
  async function open(id){ const {data}=await supabase.from('transactions').select('*, transaction_items(*), payments(*), trade_ins(*)').eq('id',id).single(); setDet(data) }
  const f=list.filter(t=>!q||t.customer_name?.toLowerCase().includes(q.toLowerCase())||t.id.includes(q))
  const print=t=>{ const w=window.open('','_blank','width=380,height=640'); if(!w)return; const rows=(t.transaction_items||[]).map(i=>`<div class=r><span>${i.product_name}${i.qty>1?' x'+i.qty:''}</span><span>${rp(i.line_total)}</span></div>`).join(''); const ps=(t.payments||[]).map(p=>`<div class=r><span>${p.method_name}</span><span>${rp(p.amount)}</span></div>`).join(''); w.document.write(`<html><head><style>body{font-family:monospace;font-size:12px;width:280px;margin:auto;padding:8px}.c{text-align:center}.b{font-weight:bold}.hr{border-top:1px dashed #000;margin:6px 0}.r{display:flex;justify-content:space-between;margin:2px 0}</style></head><body><div class="c b">FANCELL POS</div><div class=hr></div><div class=r><span>No</span><span>${t.id.slice(0,8)}</span></div><div class=r><span>Tanggal</span><span>${new Date(t.created_at).toLocaleString('id-ID')}</span></div><div class=r><span>Customer</span><span>${t.customer_name}</span></div><div class=hr></div>${rows}<div class=hr></div><div class="r b"><span>TOTAL</span><span>${rp(t.total_amount)}</span></div><div class=hr></div>${ps}</body></html>`); w.document.close(); w.focus(); setTimeout(()=>w.print(),300) }
  if(load) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari customer / ID transaksi..." className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#0058A3] outline-none"/></div></div>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">ID</th><th className="text-left p-3">Tanggal</th><th className="text-left p-3">Customer</th><th className="text-left p-3">Item</th><th className="text-left p-3">Total</th><th className="text-left p-3">Status</th><th className="text-right p-3">Aksi</th></tr></thead>
        <tbody className="divide-y">
          {f.map(t=>(<tr key={t.id} className="hover:bg-gray-50"><td className="p-3 font-mono text-xs text-gray-500">{t.id.slice(0,8)}</td><td className="p-3 text-sm">{new Date(t.created_at).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td><td className="p-3 text-sm font-medium">{t.customer_name}</td><td className="p-3 text-sm text-gray-500">{t.transaction_items?.[0]?.count||0} item</td><td className="p-3 text-sm font-bold text-[#0058A3]">{rp(t.total_amount)}</td><td className="p-3"><span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{t.payment_status?.toUpperCase()}</span></td><td className="p-3 text-right"><button onClick={()=>open(t.id)} className="p-1.5 hover:bg-blue-50 rounded text-[#0058A3]"><Eye className="w-4 h-4"/></button></td></tr>))}
          {!f.length && <tr><td colSpan={7} className="p-12 text-center text-gray-400">Belum ada transaksi</td></tr>}
        </tbody></table>
      </div>
      {det && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white"><h3 className="font-bold">Detail Transaksi <span className="font-mono text-xs text-gray-400">{det.id.slice(0,8)}</span></h3><button onClick={()=>setDet(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5"/></button></div>
        <div className="p-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2"><Info l="Customer" v={det.customer_name}/><Info l="Tanggal" v={new Date(det.created_at).toLocaleString('id-ID')}/><Info l="Garansi" v={det.warranty_type!=='none'?det.warranty_months+' bulan':'Tidak'}/><Info l="Status" v={det.payment_status}/></div>
          <div><p className="font-semibold mb-2">Item</p>{(det.transaction_items||[]).map(i=>(<div key={i.id} className="flex justify-between py-1 border-b border-gray-100"><span>{i.product_name} x{i.qty}</span><span className="font-medium">{rp(i.line_total)}</span></div>))}</div>
          {det.trade_ins?.length>0 && <div><p className="font-semibold mb-1">Tukar Tambah</p>{det.trade_ins.map(t=>(<div key={t.id} className="flex justify-between text-gray-600"><span>{t.device_name}</span><span>-{rp(t.trade_in_value)}</span></div>))}</div>}
          <div><p className="font-semibold mb-2">Pembayaran</p>{(det.payments||[]).map(p=>(<div key={p.id} className="flex justify-between py-1"><span>{p.method_name}</span><span>{rp(p.amount)} {p.admin_fee>0&&<span className="text-xs text-red-500">(fee {rp(p.admin_fee)})</span>}</span></div>))}</div>
          <div className="flex justify-between pt-3 border-t-2 border-[#0058A3] text-base font-bold"><span>TOTAL</span><span className="text-[#0058A3]">{rp(det.total_amount)}</span></div>
          <button onClick={()=>print(det)} className="w-full border border-gray-300 rounded-lg py-2.5 font-medium flex items-center justify-center gap-2 hover:bg-gray-50"><Printer className="w-4 h-4"/>Cetak Ulang Struk</button>
        </div>
      </div></div>}
    </div>
  )
}
function Info({l,v}){return <div className="bg-gray-50 rounded p-2"><p className="text-xs text-gray-500">{l}</p><p className="font-medium">{v||'—'}</p></div>}
