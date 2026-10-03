import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Search, ShoppingCart, Trash2, Plus, Minus, X, Image, CreditCard, Check, Printer, Percent, Repeat, ShieldCheck, Smartphone } from 'lucide-react'
const rp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0)
const STORE = { name:'FANCELL', addr:'Jl. Jenderal Ahmad Yani, Pandeglang, Banten 42211', phone:'+62 812-9054-0051 / +62 812-2003-3589', tagline:'Toko HP & Aksesoris Terpercaya' }

function RupiahInput({ value, onChange, className, placeholder }) {
  const fmt = v => (v===''||v==null) ? '' : Number(String(v).replace(/\D/g,'')).toLocaleString('id-ID')
  return <input inputMode="numeric" value={fmt(value)} onChange={e=>{ const d=e.target.value.replace(/\D/g,''); onChange(d?Number(d):0) }} className={className} placeholder={placeholder}/>
}
const vlabel = v => [v.color,v.storage].filter(x=>x&&x!=='-').join(' - ') || 'Standar'

export default function POSKasir() {
  const { user } = useAuth()
  const [products,setProducts]=useState([]); const [methods,setMethods]=useState([])
  const [cart,setCart]=useState([]); const [q,setQ]=useState(''); const [cat,setCat]=useState('all')
  const [loading,setLoading]=useState(true)
  const [discType,setDiscType]=useState('none'); const [discVal,setDiscVal]=useState(0)
  const [useTT,setUseTT]=useState(false); const [tt,setTT]=useState({name:'',imei:'',cond:'',value:0})
  const [warranty,setWarranty]=useState('none')
  const [showPay,setShowPay]=useState(false); const [custName,setCustName]=useState(''); const [custPhone,setCustPhone]=useState('')
  const [pays,setPays]=useState([]); const [processing,setProcessing]=useState(false); const [done,setDone]=useState(null)
  const [modalVar,setModalVar]=useState(null); const [modalImei,setModalImei]=useState(null)
  useEffect(()=>{ boot() },[])
  useEffect(()=>{ const h=e=>{ if(e.key==='Escape'){ if(modalImei)setModalImei(null); else if(modalVar)setModalVar(null); else if(showPay)setShowPay(false); else if(done)setDone(null) } }; window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h) },[modalImei,modalVar,showPay,done])

  async function boot(){
    const [p,v,i,m]=await Promise.all([
      supabase.from('products').select('*').eq('status','active').order('name'),
      supabase.from('product_variants').select('*'),
      supabase.from('product_imeis').select('variant_id,imei,status').eq('status','available'),
      supabase.from('payment_methods').select('*').eq('is_active',true).order('name')
    ])
    const byProd={}, avByVar={}
    ;(v.data||[]).forEach(x=>{ (byProd[x.product_id]=byProd[x.product_id]||[]).push(x) })
    ;(i.data||[]).forEach(x=>{ (avByVar[x.variant_id]=avByVar[x.variant_id]||[]).push(x.imei) })
    const list=(p.data||[]).map(prod=>{
      const vs=(byProd[prod.id]||[]).map(x=>({ ...x, imeis:avByVar[x.id]||[], stok: prod.category==='hp'?(avByVar[x.id]||[]).length:(+x.stock_qty||0) }))
      const avail = vs.some(x=>x.stok>0)
      const harga = vs.length?Math.min(...vs.map(x=>+x.harga_jual||0)):0
      return { ...prod, variants:vs, avail, harga }
    })
    setProducts(list); setMethods(m.data||[]); setLoading(false)
  }

  const filtered = products.filter(x=>{ const okCat=cat==='all'||x.category===cat; const s=q.toLowerCase(); const okQ=!s||x.name?.toLowerCase().includes(s)||x.brand?.toLowerCase().includes(s)||x.model?.toLowerCase().includes(s); return okCat&&okQ })

  function addAcc(prod,varr){ setCart(c=>[...c,{ key:Date.now()+Math.random(), isHp:false, variantId:varr.id, productName:`${prod.name} · ${vlabel(varr)}`, variantLabel:vlabel(varr), imei:null, harga_jual:+varr.harga_jual||0, hpp:+varr.hpp||0, qty:1, baseStock:varr.stok, image:prod.image_url }]) }
  function addHp(prod,varr,imei){ setCart(c=>[...c,{ key:Date.now()+Math.random(), isHp:true, variantId:varr.id, productName:`${prod.name} · ${vlabel(varr)}`, variantLabel:vlabel(varr), imei, harga_jual:+varr.harga_jual||0, hpp:+varr.hpp||0, qty:1, baseStock:0, image:prod.image_url }]); setModalImei(null); setModalVar(null) }
  function clickCard(prod){ if(!prod.avail) return; if(prod.category==='hp'){ setModalVar(prod); return } if(prod.variants.length===1){ addAcc(prod,prod.variants[0]) } else { setModalVar(prod) } }
  function clickVariant(prod,varr){ if(varr.stok<=0) return; if(prod.category==='hp'){ if(varr.imeis.length===1) addHp(prod,varr,varr.imeis[0]); else setModalImei({prod,varr}) } else { addAcc(prod,varr); setModalVar(null) } }
  function chQty(id,d){ setCart(c=>c.map(i=>{ if(i.key!==id||i.isHp) return i; const nq=i.qty+d; return nq>0?{...i,qty:nq}:i }).filter(i=>i.qty>0)) }
  function rm(id){ setCart(c=>c.filter(i=>i.key!==id)) }
  function clearAll(){ setCart([]); setDiscType('none'); setDiscVal(0); setUseTT(false); setTT({name:'',imei:'',cond:'',value:0}); setWarranty('none'); setCustName(''); setCustPhone(''); setPays([]) }

  const subtotal = cart.reduce((s,i)=>s+i.harga_jual*i.qty,0)
  const discAmt = discType==='rp'?Number(discVal)||0:discType==='percent'?subtotal*(Number(discVal)||0)/100:0
  const ttVal = useTT?Number(tt.value)||0:0
  const tagihan = Math.max(0, subtotal-discAmt-ttVal)
  const paid = pays.reduce((s,p)=>s+(Number(p.amount)||0),0)
  const sisa = tagihan-paid
  const lunas = Math.abs(sisa)<1 && pays.length>0
  function addPay(){ setPays(p=>[...p,{ key:Date.now()+Math.random(), method_id:methods[0]?.id||'', method_name:methods[0]?.name||'', amount:0 }]) }
  function setPay(key,field,val){ setPays(p=>p.map(r=>{ if(r.key!==key) return r; if(field==='method_id'){ const m=methods.find(x=>x.id===val); return {...r,method_id:val,method_name:m?.name||''} } return {...r,[field]:val} })) }
  function rmPay(key){ setPays(p=>p.filter(r=>r.key!==key)) }
  function fillSisa(){ setPays(p=>p.map((r,idx)=>idx===p.length-1?{...r,amount:Math.max(0,sisa)}:r)) }
  function openPay(){ if(!cart.length){ alert('Keranjang kosong'); return } if(!pays.length) addPay(); setShowPay(true) }

  async function checkout(){
    if(!lunas){ alert('Belum lunas. Sisa: '+rp(sisa)); return }
    setProcessing(true)
    try {
      for(const it of cart){ const prod=products.find(p=>p.variants.some(v=>v.id===it.variantId)); const varr=prod?.variants.find(v=>v.id===it.variantId); if(!varr) throw new Error(it.productName+' tidak tersedia'); if(it.isHp && !varr.imeis.includes(it.imei)) throw new Error('IMEI '+it.imei+' sudah terjual'); if(!it.isHp && varr.stok<it.qty) throw new Error('Stok '+it.productName+' kurang') }
      const wM = warranty==='none'?0:parseInt(warranty.split('_')[1]||0)
      const inv = 'INV'+new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14)+Math.random().toString(36).slice(2,6).toUpperCase()
      const { data:tx, error:e1 } = await supabase.from('transactions').insert({ cashier_id:user?.id||null, cashier_name:user?.username||'Kasir', customer_name:custName||'Umum', customer_phone:custPhone||null, subtotal, discount_type:discType, discount_value:Number(discVal)||0, discount_amount:discAmt, trade_in_value:ttVal, warranty_type:warranty, warranty_months:wM, total_amount:tagihan, amount_paid:paid, payment_status:'paid', transaction_type:'sale', invoice_no:inv }).select().single()
      if(e1) throw e1
      const items = cart.map(i=>({ transaction_id:tx.id, product_id:i.variantId, product_name:i.productName, variant_label:i.variantLabel, imei:i.imei, qty:i.qty, price_at_sale:i.harga_jual, hpp_at_sale:i.hpp, line_total:i.harga_jual*i.qty, line_profit:(i.harga_jual-i.hpp)*i.qty }))
      const { error:e2 }=await supabase.from('transaction_items').insert(items); if(e2) throw e2
      let fee=0; const payRows=pays.map(r=>{ const m=methods.find(x=>x.id===r.method_id); const f=(Number(r.amount)||0)*((m?.admin_fee_percentage)||0)/100+(m?.admin_fee_fixed||0); fee+=f; return { transaction_id:tx.id, payment_method_id:r.method_id, method_name:r.method_name, amount:Number(r.amount)||0, admin_fee:f, reference_number:inv } })
      const { error:e3 }=await supabase.from('payments').insert(payRows); if(e3) throw e3
      await supabase.from('transactions').update({ total_admin_fee:fee }).eq('id',tx.id)
      if(useTT&&tt.name) await supabase.from('trade_ins').insert({ transaction_id:tx.id, device_name:tt.name, device_imei:tt.imei, device_condition:tt.cond, trade_in_value:ttVal })
      for(const i of cart){ if(i.isHp) await supabase.from('product_imeis').update({ status:'sold' }).eq('imei',i.imei); else await supabase.from('product_variants').update({ stock_qty: Math.max(0,i.baseStock-i.qty) }).eq('id',i.variantId) }
      setDone({ ...tx, items, payments:payRows, cashier:user?.username||'Kasir' }); setShowPay(false); clearAll(); boot()
    } catch(err){ alert('Gagal: '+err.message) } finally { setProcessing(false) }
  }

  function strukHTML(t){
    const rows=(t.items||[]).map(i=>`<div class=r><span>${i.product_name}${i.qty>1?' x'+i.qty:''}${i.imei?'<br><small>'+i.imei+'</small>':''}</span><span>${rp(i.line_total)}</span></div>`).join('')
    const ps=(t.payments||[]).map(p=>`<div class=r><span>Bayar (${p.method_name})</span><span>${rp(p.amount)}</span></div>`).join('')
    return `<div class="c b big">${STORE.name}</div><div class="c small">${STORE.addr}</div><div class="c small">${STORE.phone}</div><div class=hr></div><div class=r><span>No</span><span>${t.invoice_no||t.id.slice(0,8)}</span></div><div class=r><span>Tgl</span><span>${new Date(t.created_at).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div><div class=r><span>Kasir</span><span>${t.cashier||'-'}</span></div><div class=r><span>Pelanggan</span><span>${t.customer_name||'Umum'}</span></div><div class=hr></div>${rows}<div class=hr></div><div class=r><span>Subtotal</span><span>${rp(t.subtotal)}</span></div>${+t.discount_amount>0?`<div class=r><span>Diskon</span><span>-${rp(t.discount_amount)}</span></div>`:''}${+t.trade_in_value>0?`<div class=r><span>Tukar Tambah</span><span>-${rp(t.trade_in_value)}</span></div>`:''}<div class="r b big"><span>Total</span><span>${rp(t.total_amount)}</span></div>${ps}<div class=hr></div><div class="c b">${STORE.tagline}</div>`
  }
  function printStruk(t){ const w=window.open('','_blank','width=380,height=680'); if(!w){ alert('Izinkan pop-up untuk cetak'); return } w.document.write(`<html><head><title>${t.invoice_no||'Struk'}</title><style>@page{margin:4mm}body{font-family:'Courier New',monospace;font-size:11px;width:268px;margin:0 auto;padding:6px;color:#000;line-height:1.5}.c{text-align:center}.b{font-weight:bold}.hr{border-top:1px dashed #000;margin:5px 0}.r{display:flex;justify-content:space-between;gap:8px;margin:1px 0}.r span:last-child{white-space:nowrap;text-align:right}small{font-size:9px;color:#444}.big{font-size:15px}.small{font-size:9px;line-height:1.3}</style></head><body>${strukHTML(t)}</body></html>`); w.document.close(); w.focus(); setTimeout(()=>w.print(),350) }

  if(loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"/></div>
  const wOpts=[['none','Tidak Bergaransi'],['toko_1','Garansi Toko 1 Bulan'],['toko_3','Garansi Toko 3 Bulan'],['toko_6','Garansi Toko 6 Bulan'],['toko_12','Garansi Toko 12 Bulan'],['resmi','Garansi Resmi']]

  return (
    <div className="flex h-[calc(100vh-73px)]">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="relative mb-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari produk / Scan IMEI (Enter)..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] outline-none"/></div>
          <div className="flex gap-2">{[['all','Semua'],['hp','Handphone'],['aksesoris','Aksesoris']].map(([id,l])=>(<button key={id} onClick={()=>setCat(id)} className={`px-4 py-1.5 rounded-full text-sm font-medium ${cat===id?'bg-[#0058A3] text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{l}</button>))}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {!filtered.length?<div className="h-full flex items-center justify-center text-gray-400"><div className="text-center"><Image className="w-16 h-16 mx-auto mb-2 opacity-30"/><p>Tidak ada produk</p></div></div>:
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(p=>{ const inC=cart.filter(i=>i.productName.startsWith(p.name)).length; return (
              <button key={p.id} onClick={()=>clickCard(p)} disabled={!p.avail} className={`bg-white border rounded-lg overflow-hidden transition-all text-left relative ${p.avail?'hover:shadow-lg hover:-translate-y-1 border-gray-200':'opacity-60 cursor-not-allowed border-gray-200'} ${inC?'ring-2 ring-[#0058A3]/40':''}`}>
                <div className="aspect-square bg-gray-100 flex items-center justify-center relative overflow-hidden">
                  {p.image_url?<img src={p.image_url} alt={p.name} className="w-full h-full object-cover"/>:<div className="text-4xl font-bold text-gray-300">{p.name?.charAt(0)}</div>}
                  <span className="absolute top-2 right-2 bg-[#0058A3] text-white text-[10px] px-2 py-0.5 rounded">{p.category==='hp'?'HP':'ACC'}</span>
                  {!p.avail&&<span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold">Stok habis</span>}
                  {inC>0&&<span className="absolute bottom-2 right-2 bg-[#0058A3] text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">{inC}</span>}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{p.name}</h3>
                  <p className="text-xs text-gray-500 mb-1 truncate">{p.category==='hp'?`${p.variants.length} Pilihan Varian`:(p.variants[0]?vlabel(p.variants[0]):'—')}{!p.avail?' · Stok habis':''}</p>
                  <p className="text-sm font-bold text-[#0058A3]">{rp(p.harga)}</p>
                </div>
              </button> ) })}
          </div>}
        </div>
      </div>

      <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between"><h2 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5"/>Keranjang <span className="text-sm text-gray-400">({cart.length})</span></h2>{cart.length>0&&<button onClick={clearAll} className="text-xs text-red-600 hover:underline">Kosongkan</button>}</div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!cart.length?<div className="h-full flex items-center justify-center text-gray-400 text-sm text-center"><div><ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30"/>Klik produk untuk menambah</div></div>:
          cart.map(i=>(<div key={i.key} className="bg-gray-50 rounded-lg p-3 flex gap-2">
            <div className="w-10 h-10 rounded bg-gray-200 overflow-hidden flex-shrink-0">{i.image?<img src={i.image} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">{i.productName.charAt(0)}</div>}</div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-1"><p className="text-sm font-medium truncate">{i.productName}</p><button onClick={()=>rm(i.key)} className="text-red-500 hover:bg-red-50 rounded p-0.5 flex-shrink-0"><Trash2 className="w-4 h-4"/></button></div>
              {i.imei&&<p className="text-[10px] font-mono text-gray-400 truncate">{i.imei}</p>}
              <div className="flex justify-between items-center mt-1">
                <div className="flex items-center gap-1.5"><button onClick={()=>chQty(i.key,-1)} disabled={i.isHp} className="w-6 h-6 bg-white border rounded disabled:opacity-30 text-xs"><Minus className="w-3 h-3 mx-auto"/></button><span className="w-5 text-center text-sm font-semibold">{i.qty}</span><button onClick={()=>chQty(i.key,1)} disabled={i.isHp} className="w-6 h-6 bg-white border rounded disabled:opacity-30 text-xs"><Plus className="w-3 h-3 mx-auto"/></button></div>
                <span className="text-sm font-bold text-[#0058A3]">{rp(i.harga_jual*i.qty)}</span>
              </div>
            </div>
          </div>))}
        </div>
        <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50 max-h-[46%] overflow-y-auto">
          <Row label="Subtotal" val={rp(subtotal)}/>
          <div className="flex items-center gap-2"><Percent className="w-4 h-4 text-gray-500"/><span className="text-sm text-gray-700 flex-1">Diskon</span><select value={discType} onChange={e=>setDiscType(e.target.value)} className="text-sm border rounded px-2 py-1 bg-white"><option value="none">None</option><option value="rp">Rp</option><option value="percent">%</option></select>{discType==='rp'&&<RupiahInput value={discVal} onChange={setDiscVal} className="w-28 text-sm border rounded px-2 py-1 text-right" placeholder="0"/>}{discType==='percent'&&<div className="flex items-center"><input type="number" value={discVal} onChange={e=>setDiscVal(e.target.value)} className="w-16 text-sm border rounded-l px-2 py-1 text-right outline-none"/><span className="text-sm text-gray-500 border border-l-0 rounded-r px-2 py-1 bg-gray-50">%</span></div>}</div>
          {discAmt>0&&<Row label="Potongan diskon" val={'- '+rp(discAmt)} green/>}
          <div className="flex items-center gap-2"><Repeat className="w-4 h-4 text-gray-500"/><span className="text-sm text-gray-700 flex-1">Pakai Tukar Tambah?</span><input type="checkbox" checked={useTT} onChange={e=>setUseTT(e.target.checked)} className="w-4 h-4 accent-[#0058A3]"/></div>
          {useTT&&<div className="bg-blue-50 rounded p-2 space-y-1"><input value={tt.name} onChange={e=>setTT({...tt,name:e.target.value})} placeholder="Unit lama (mis. iPhone 11)" className="w-full text-sm border rounded px-2 py-1"/><div className="flex gap-1"><input value={tt.imei} onChange={e=>setTT({...tt,imei:e.target.value})} placeholder="IMEI" className="flex-1 text-sm border rounded px-2 py-1"/><RupiahInput value={tt.value} onChange={x=>setTT({...tt,value:x})} className="w-32 text-sm border rounded px-2 py-1 text-right" placeholder="Nilai"/></div></div>}
          {ttVal>0&&<Row label="Potongan tukar tambah" val={'- '+rp(ttVal)} green/>}
          <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gray-500"/><span className="text-sm text-gray-700 flex-1">Pilih Garansi</span><select value={warranty} onChange={e=>setWarranty(e.target.value)} className="text-sm border rounded px-2 py-1 bg-white max-w-[180px]">{wOpts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
          <div className="border-t border-gray-300 pt-2 flex justify-between items-center"><span className="text-lg font-bold">TOTAL</span><span className="text-2xl font-bold text-[#0058A3]">{rp(tagihan)}</span></div>
          <button onClick={openPay} disabled={!cart.length} className="w-full bg-[#0058A3] text-white py-3 rounded-lg font-semibold hover:bg-[#004080] disabled:opacity-40 flex items-center justify-center gap-2"><CreditCard className="w-5 h-5"/>Bayar — Metode & Split Payment</button>
        </div>
      </div>

      {modalVar&&<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"><div className="p-5 border-b"><h3 className="font-bold text-lg">Pilih Varian {modalVar.name}</h3></div><div className="p-5"><p className="text-sm text-gray-500 mb-3">Pilih kapasitas penyimpanan yang tersedia:</p><div className="space-y-2">{modalVar.variants.map(v=>{ const dis=v.stok<=0; return (
        <button key={v.id} onClick={()=>clickVariant(modalVar,v)} disabled={dis} className={`w-full flex justify-between items-center p-3 rounded-lg border-2 transition-all ${dis?'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed':'border-gray-200 hover:border-[#0058A3] hover:bg-blue-50'}`}>
          <div className="text-left"><p className={`font-semibold ${dis?'text-gray-400':'text-gray-900'}`}>{vlabel(v)}</p><p className={`text-xs ${dis?'text-gray-400':'text-gray-500'}`}>Stok: {v.stok}{dis?' (Habis)':''}</p></div>
          <span className={`font-bold ${dis?'text-gray-400':'text-[#0058A3]'}`}>{rp(v.harga_jual)}</span>
        </button> ) })}</div><button onClick={()=>setModalVar(null)} className="w-full mt-4 px-4 py-2.5 border rounded-lg font-medium hover:bg-gray-50">Batal</button></div></div></div>}

      {modalImei&&<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md"><div className="p-5 border-b"><h3 className="font-bold text-lg">Pilih IMEI · {vlabel(modalImei.varr)}</h3></div><div className="p-5"><p className="text-sm text-gray-500 mb-3">Pilih unit yang tersedia:</p><div className="space-y-2">{modalImei.varr.imeis.map(im=>(<button key={im} onClick={()=>addHp(modalImei.prod,modalImei.varr,im)} className="w-full flex justify-between items-center p-3 rounded-lg border-2 border-gray-200 hover:border-[#0058A3] hover:bg-blue-50 transition-all"><span className="font-mono text-sm text-gray-800 flex items-center gap-2"><Smartphone className="w-4 h-4 text-[#0058A3]"/>{im}</span><span className="font-bold text-[#0058A3]">{rp(modalImei.varr.harga_jual)}</span></button>))}</div><button onClick={()=>setModalImei(null)} className="w-full mt-4 px-4 py-2.5 border rounded-lg font-medium hover:bg-gray-50">Kembali</button></div></div></div>}

      {showPay&&<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white"><h3 className="font-bold text-lg">Pembayaran</h3><button onClick={()=>setShowPay(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5"/></button></div><div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-500">Nama Customer</label><input value={custName} onChange={e=>setCustName(e.target.value)} placeholder="Umum" className="w-full border rounded px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-[#0058A3] outline-none"/></div><div><label className="text-xs text-gray-500">No. HP</label><input value={custPhone} onChange={e=>setCustPhone(e.target.value)} placeholder="Opsional" className="w-full border rounded px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-[#0058A3] outline-none"/></div></div>
        <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center"><span className="text-sm text-gray-600">Tagihan</span><span className="text-xl font-bold text-[#0058A3]">{rp(tagihan)}</span></div>
        <div><div className="flex justify-between items-center mb-2"><span className="text-sm font-semibold">Metode Bayar (Split)</span><button onClick={addPay} className="text-xs text-[#0058A3] font-medium flex items-center gap-1"><Plus className="w-3 h-3"/>Tambah</button></div>
          <div className="space-y-2">{pays.map(r=>(<div key={r.key} className="flex gap-2 items-center"><select value={r.method_id} onChange={e=>setPay(r.key,'method_id',e.target.value)} className="flex-1 border rounded px-2 py-2 text-sm bg-white">{methods.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><RupiahInput value={r.amount} onChange={x=>setPay(r.key,'amount',x)} className="w-36 border rounded px-2 py-2 text-sm text-right" placeholder="0"/><button onClick={()=>rmPay(r.key)} disabled={pays.length===1} className="p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-30"><Trash2 className="w-4 h-4"/></button></div>))}</div>
          <div className="flex justify-between items-center mt-2 text-sm"><span className={sisa>0?'text-red-600 font-medium':'text-green-600 font-medium'}>{sisa>0?'Sisa: '+rp(sisa):sisa<0?'Berlebih: '+rp(-sisa):'Lunas ✓'}</span>{sisa>0&&<button onClick={fillSisa} className="text-[#0058A3] text-xs font-medium underline">Isi sisanya</button>}</div>
        </div>
        <button onClick={checkout} disabled={!lunas||processing} className="w-full bg-[#0058A3] text-white py-3 rounded-lg font-semibold hover:bg-[#004080] disabled:opacity-40 flex items-center justify-center gap-2">{processing?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Memproses...</>:<><Check className="w-5 h-5"/>Selesaikan Pembayaran</>}</button>
      </div></div></div>}

      {done&&<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto">
        <div className="p-5 text-center border-b"><div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2"><Check className="w-7 h-7 text-green-600"/></div><h3 className="text-lg font-bold">Transaksi Berhasil</h3><p className="text-xs text-gray-500">Stok & laporan otomatis terupdate</p></div>
        <div className="p-4"><div className="struk border border-dashed border-gray-300 rounded-lg p-3" dangerouslySetInnerHTML={{__html: strukHTML(done)}}/></div>
        <div className="p-4 pt-0 flex gap-3"><button onClick={()=>printStruk(done)} className="flex-1 bg-[#0058A3] text-white rounded-lg py-2.5 font-semibold flex items-center justify-center gap-2 hover:bg-[#004080] transition-colors"><Printer className="w-4 h-4"/>Print Struk</button><button onClick={()=>setDone(null)} className="flex-1 border border-[#0058A3] text-[#0058A3] rounded-lg py-2.5 font-medium hover:bg-blue-50 transition-colors">Tutup [Esc]</button></div>
      </div></div>}
    </div> )
}
function Row({label,val,green}){return <div className="flex justify-between text-sm"><span className="text-gray-600">{label}</span><span className={green?'text-green-600 font-medium':'text-gray-900 font-semibold'}>{val}</span></div>}
