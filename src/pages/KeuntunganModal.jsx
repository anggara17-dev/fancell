import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Wallet, TrendingUp, TrendingDown, Plus, X, Check } from 'lucide-react'
const rp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0)
export default function KeuntunganModal() {
  const [data,setData]=useState({modal:0,keuntungan:0,prive:0,saldo:0})
  const [load,setLoad]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [fd,setFd]=useState({type:'capital_in',amount:0,description:''})
  const [msg,setMsg]=useState({type:'',text:''})
  useEffect(()=>{ run() },[])
  async function run(){
    const [cap, tx] = await Promise.all([ supabase.from('capital_transactions').select('type, amount'), supabase.from('transactions').select('total_amount, transaction_items(hpp_at_sale,qty), payments(admin_fee)') ])
    let modal=0, prive=0
    ;(cap.data||[]).forEach(c=>{ if(c.type==='capital_in') modal+=+c.amount||0; else prive+=+c.amount||0 })
    let rev=0,hpp=0,fee=0
    ;(tx.data||[]).forEach(t=>{ rev+=+t.total_amount||0; (t.transaction_items||[]).forEach(i=>hpp+=(+i.hpp_at_sale||0)*(i.qty||1)); (t.payments||[]).forEach(p=>fee+=+p.admin_fee||0) })
    const keuntungan = rev-hpp-fee
    setData({modal, keuntungan, prive, saldo:modal+keuntungan-prive})
    setLoad(false)
  }
  async function submit(e){ e.preventDefault(); setMsg({type:'',text:''}); try { const {error}=await supabase.from('capital_transactions').insert({ type:fd.type, amount:Number(fd.amount)||0, description:fd.description, date:new Date().toISOString().slice(0,10) }); if(error) throw error; setMsg({type:'success',text:'Tercatat'}); setShowForm(false); setFd({type:'capital_in',amount:0,description:''}); run(); setTimeout(()=>setMsg({type:'',text:''}),3000) } catch(err){ setMsg({type:'error',text:err.message}) } }
  const Box=({icon:I,label,val,color})=>(<div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><div className={`p-2.5 rounded-lg w-fit mb-3 ${color.bg}`}><I className={`w-5 h-5 ${color.txt}`}/></div><p className="text-xs text-gray-500 uppercase font-medium mb-1">{label}</p><p className={`text-2xl font-bold ${color.val}`}>{val}</p></div>)
  if(load) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <div className="p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6"><div><h2 className="text-2xl font-bold text-gray-900">Keuntungan & Modal</h2><p className="text-sm text-gray-500 mt-0.5">Tracking modal & keuntungan berjalan</p></div><button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] shadow-sm"><Plus className="w-4 h-4"/><span className="text-sm font-medium">Catat Modal/Prive</span></button></div>
      {msg.text&&<div className={`mb-4 px-4 py-3 rounded-lg text-sm animate-fade-in ${msg.type==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Box icon={Wallet} label="Total Modal" val={rp(data.modal)} color={{bg:'bg-blue-50',txt:'text-[#0058A3]',val:'text-gray-900'}}/>
        <Box icon={TrendingUp} label="Keuntungan (Akumulasi)" val={rp(data.keuntungan)} color={{bg:'bg-green-50',txt:'text-green-600',val:'text-green-600'}}/>
        <Box icon={TrendingDown} label="Prive (Pengambilan)" val={rp(data.prive)} color={{bg:'bg-red-50',txt:'text-red-600',val:'text-red-600'}}/>
      </div>
      <div className="bg-gradient-to-br from-[#0058A3] to-[#004080] p-8 rounded-xl shadow-lg text-white mb-6"><p className="text-sm opacity-90 mb-2">Saldo Modal Berjalan</p><p className="text-4xl font-bold">{rp(data.saldo)}</p><p className="text-sm opacity-75 mt-2">Modal + Keuntungan - Prive</p></div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><h4 className="text-sm font-semibold text-[#0058A3] mb-2">Cara Kerja</h4><ul className="text-sm text-gray-700 space-y-1"><li>• <strong>Modal</strong>: setoran owner/investor</li><li>• <strong>Keuntungan</strong>: laba bersih otomatis dari semua transaksi</li><li>• <strong>Prive</strong>: pengambilan owner untuk pribadi</li><li>• <strong>Saldo</strong> = Modal + Keuntungan - Prive</li></ul></div>
      {showForm&&<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md"><div className="flex justify-between items-center p-6 border-b"><h3 className="font-bold text-lg">Catat Modal / Prive</h3><button onClick={()=>setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5"/></button></div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Jenis</label><select value={fd.type} onChange={e=>setFd({...fd,type:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg bg-white"><option value="capital_in">Setoran Modal (+)</option><option value="prive_out">Peng Prive (-)</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nominal (Rp)</label><input type="number" required value={fd.amount} onChange={e=>setFd({...fd,amount:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg outline-none" placeholder="0"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Keterangan</label><input value={fd.description} onChange={e=>setFd({...fd,description:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg outline-none" placeholder="Opsional"/></div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={()=>setShowForm(false)} className="flex-1 px-4 py-2.5 border text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Batal</button><button type="submit" className="flex-1 px-4 py-2.5 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4"/>Simpan</button></div>
        </form></div></div>}
    </div> )
}
