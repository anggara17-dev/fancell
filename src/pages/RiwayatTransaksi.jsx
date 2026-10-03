import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { History, Search, Eye, Printer, X, Package } from 'lucide-react'
const rp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0)

function ringkasProduk(t){
  const items = t.transaction_items || []
  if(!items.length) return '—'
  const names = [...new Set(items.map(i=>i.product_name))]
  const totalQty = items.reduce((a,i)=>a+(+i.qty||1),0)
  if(names.length>1) return `${names.length} produk: ${names.join(', ')}`
  if(totalQty>1) return `${names[0]} x${totalQty}`
  return names[0]
}

export default function Riwayat() {
  const [list,setList]=useState([]); const [q,setQ]=useState(''); const [det,setDet]=useState(null); const [load,setLoad]=useState(true)
  useEffect(()=>{ run() },[])
  async function run(){ const {data}=await supabase.from('transactions').select('*, transaction_items(product_name, imei, qty), payments(count)').order('created_at',{ascending:false}); setList(data||[]); setLoad(false) }
  async function open(id){ const {data}=await supabase.from('transactions').select('*, transaction_items(*), payments(*), trade_ins(*)').eq('id',id).single(); setDet(data) }
  const f=list.filter(t=>!q||t.customer_name?.toLowerCase().includes(q.toLowerCase())||t.invoice_no?.toLowerCase().includes(q.toLowerCase())||(t.transaction_items||[]).some(i=>i.product_name?.toLowerCase().includes(q.toLowerCase())))
  const print=t=>{ const w=window.open('','_blank','width=380,height=680'); if(!w)return; const rows=(t.transaction_items||[]).map(i=>`<div class=r><span>${i.product_name}${i.qty>1?' x'+i.qty:''}${i.imei?'<br><small>'+i.imei+'</small>':''}</span><span>${rp(i.line_total)}</span></div>`).join(''); const ps=(t.payments||[]).map(p=>`<div class=r><span>Bayar (${p.method_name})</span><span>${rp(p.amount)}</span></div>`).join(''); w.document.write(`<html><head><title>${t.invoice_no||'Struk'}</title><style>@page{margin:4mm}body{font-family:'Courier New',monospace;font-size:11px;width:268px;margin:0 auto;padding:6px;color:#000;line-height:1.5}.c{text-align:center}.b{font-weight:bold}.hr{border-top:1px dashed #000;margin:5px 0}.r{display:flex;justify-content:space-between;gap:8px;margin:1px 0}.r span:last-child{white-space:nowrap;text-align:right}small{font-size:9px;color:#444}.big{font-size:15px}</style></head><body><div class="c b big">FANCELL</div><div class=hr></div><div class=r><span>No</span><span>${t.invoice_no||t.id.slice(0,8)}</span></div><div class=r><span>Tgl</span><span>${new Date(t.created_at).toLocaleString('id-ID')}</span></div><div class=r><span>Kasir</span><span>${t.cashier_name||'-'}</span></div><div class=r><span>Pelanggan</span><span>${t.customer_name||'Umum'}</span></div><div class=hr></div>${rows}<div class=hr></div><div class="r b big"><span>Total</span><span>${rp(t.total_amount)}</span></div>${ps}<div class=hr></div><div class="c b">Toko HP & Aksesoris Terpercaya</div></body></html>`); w.document.close(); w.focus(); setTimeout(()=>w.print(),350) }
  if(load) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari customer / nama produk / no invoice..." className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#0058A3] outline-none"/></div>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left p-3">Tanggal</th><th className="text-left p-3">Customer</th><th className="text-left p-3">Produk</th><th className="text-left p-3">Total</th><th className="text-left p-3">Status</th><th className="text-right p-3">Aksi</th></tr></thead>
          <tbody className="divide-y">{f.map(t=>(<tr key={t.id} className="hover:bg-gray-50">
            <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{new Date(t.created_at).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
            <td className="p-3 text-sm font-medium text-gray-900">{t.customer_name||'Umum'}</td>
            <td className="p-3 text-sm text-gray-700 max-w-[280px]"><div className="flex items-center gap-2"><Package className="w-4 h-4 text-gray-400 flex-shrink-0"/><span className="truncate">{ringkasProduk(t)}</span></div></td>
            <td className="p-3 text-sm font-bold text-[#0058A3] whitespace-nowrap">{rp(t.total_amount)}</td>
            <td className="p-3"><span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{t.payment_status?.toUpperCase()}</span></td>
            <td className="p-3 text-right"><button onClick={()=>open(t.id)} className="p-1.5 hover:bg-blue-50 rounded text-[#0058A3]" title="Lihat detail"><Eye className="w-4 h-4"/></button></td>
          </tr>))}{!f.length&&<tr><td colSpan={6} className="p-12 text-center text-gray-400">Belum ada transaksi</td></tr>}</tbody></table>
      </div>
      {det&&<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white"><h3 className="font-bold">Detail Transaksi <span className="font-mono text-xs text-gray-400 ml-1">{det.invoice_no||det.id.slice(0,8)}</span></h3><button onClick={()=>setDet(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5"/></button></div>
        <div className="p-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2"><Info l="Customer" v={det.customer_name}/><Info l="Tanggal" v={new Date(det.created_at).toLocaleString('id-ID')}/><Info l="Kasir" v={det.cashier_name}/><Info l="Garansi" v={det.warranty_type!=='none'?det.warranty_months+' bulan':'Tidak'}/></div>
          <div><p className="font-semibold mb-2">Item</p>{(det.transaction_items||[]).map(i=>(<div key={i.id} className="flex justify-between py-1 border-b border-gray-100"><span>{i.product_name} x{i.qty}{i.imei&&<span className="block text-[10px] font-mono text-gray-400">{i.imei}</span>}</span><span className="font-medium">{rp(i.line_total)}</span></div>))}</div>
          {det.trade_ins?.length>0&&<div><p className="font-semibold mb-1">Tukar Tambah</p>{det.trade_ins.map(t=>(<div key={t.id} className="flex justify-between text-gray-600"><span>{t.device_name}</span><span>-{rp(t.trade_in_value)}</span></div>))}</div>}
          <div><p className="font-semibold mb-2">Pembayaran</p>{(det.payments||[]).map(p=>(<div key={p.id} className="flex justify-between py-1"><span>{p.method_name}</span><span>{rp(p.amount)} {p.admin_fee>0&&<span className="text-xs text-red-500">(fee {rp(p.admin_fee)})</span>}</span></div>))}</div>
          <div className="flex justify-between pt-3 border-t-2 border-[#0058A3] text-base font-bold"><span>TOTAL</span><span className="text-[#0058A3]">{rp(det.total_amount)}</span></div>
          <button onClick={()=>print(det)} className="w-full bg-[#0058A3] text-white rounded-lg py-2.5 font-medium flex items-center justify-center gap-2 hover:bg-[#004080] transition-colors"><Printer className="w-4 h-4"/>Cetak Ulang Struk</button>
        </div>
      </div></div>}
    </div> )
}
function Info({l,v}){return <div className="bg-gray-50 rounded p-2"><p className="text-xs text-gray-500">{l}</p><p className="font-medium">{v||'—'}</p></div>}
