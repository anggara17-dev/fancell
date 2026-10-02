import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Search, ShoppingCart, Trash2, Plus, Minus, X, Image, CreditCard, Check, Printer, Percent, Banknote, Repeat, ShieldCheck } from 'lucide-react'

const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

export default function POSKasir() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)

  // Diskon / TT / Garansi
  const [discType, setDiscType] = useState('none')
  const [discVal, setDiscVal] = useState(0)
  const [useTT, setUseTT] = useState(false)
  const [tt, setTT] = useState({ name: '', imei: '', cond: '', value: 0 })
  const [warranty, setWarranty] = useState('none')

  // Pembayaran
  const [showPay, setShowPay] = useState(false)
  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [pays, setPays] = useState([])
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => { boot() }, [])

  async function boot() {
    const [p, m] = await Promise.all([
      supabase.from('products').select('*').eq('status', 'available').order('name'),
      supabase.from('payment_methods').select('*').eq('is_active', true).order('name')
    ])
    setProducts(p.data || [])
    setMethods(m.data || [])
    setLoading(false)
  }

  const filtered = products.filter(x => {
    const okCat = cat === 'all' || x.category === cat
    const s = q.toLowerCase()
    const okQ = !s || x.name?.toLowerCase().includes(s) || x.imei?.toLowerCase().includes(s) || x.brand?.toLowerCase().includes(s)
    return okCat && okQ
  })

  function add(p) {
    if (p.category === 'hp') {
      if (cart.find(i => i.id === p.id)) return // 1 IMEI = 1 unit
      setCart(c => [...c, { ...p, qty: 1 }])
    } else {
      const ex = cart.find(i => i.id === p.id)
      if (ex) setCart(c => c.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
      else setCart(c => [...c, { ...p, qty: 1 }])
    }
  }
  function chQty(id, d) {
    setCart(c => c.map(i => {
      if (i.id !== id) return i
      if (i.category === 'hp') return i
      const nq = i.qty + d
      return nq > 0 ? { ...i, qty: nq } : i
    }).filter(i => i.qty > 0))
  }
  function rm(id) { setCart(c => c.filter(i => i.id !== id)) }
  function clearAll() {
    setCart([]); setDiscType('none'); setDiscVal(0); setUseTT(false)
    setTT({ name: '', imei: '', cond: '', value: 0 }); setWarranty('none')
    setCustName(''); setCustPhone(''); setPays([])
  }

  // ===== KALKULASI =====
  const subtotal = cart.reduce((s, i) => s + (i.harga_jual || 0) * i.qty, 0)
  const discAmt = discType === 'rp' ? Number(discVal) || 0
                : discType === 'percent' ? subtotal * (Number(discVal) || 0) / 100 : 0
  const ttVal = useTT ? Number(tt.value) || 0 : 0
  const tagihan = Math.max(0, subtotal - discAmt - ttVal)

  const paid = pays.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const sisa = tagihan - paid
  const lunas = Math.abs(sisa) < 1 && pays.length > 0

  function addPay() { setPays(p => [...p, { key: Date.now() + Math.random(), method_id: methods[0]?.id || '', method_name: methods[0]?.name || '', amount: 0 }]) }
  function setPay(key, field, val) {
    setPays(p => p.map(r => {
      if (r.key !== key) return r
      if (field === 'method_id') {
        const m = methods.find(x => x.id === val)
        return { ...r, method_id: val, method_name: m?.name || '' }
      }
      return { ...r, [field]: val }
    }))
  }
  function rmPay(key) { setPays(p => p.filter(r => r.key !== key)) }
  function fillSisa() { setPays(p => p.map((r, idx) => idx === p.length - 1 ? { ...r, amount: Math.max(0, sisa) } : r)) }

  function openPay() {
    if (!cart.length) { alert('Keranjang kosong'); return }
    setCustName(custName || '')
    if (!pays.length) addPay()
    setShowPay(true)
  }

  // ===== CHECKOUT ATOMIK =====
  async function checkout() {
    if (!lunas) { alert('Pembayaran belum lunas. Sisa: ' + rupiah(sisa)); return }
    setProcessing(true)
    try {
      // validasi stok dulu
      for (const it of cart) {
        const fresh = products.find(p => p.id === it.id)
        if (!fresh) throw new Error(it.name + ' sudah tidak tersedia')
        if (it.category === 'hp' && fresh.status !== 'available') throw new Error(it.name + ' sudah terjual')
        if (it.category === 'aksesoris' && (fresh.stock_qty || 0) < it.qty) throw new Error('Stok ' + it.name + ' tidak cukup')
      }

      const wMonths = warranty === 'none' ? 0 : parseInt(warranty.split('_')[1] || 0)

      const { data: tx, error: e1 } = await supabase.from('transactions').insert({
        cashier_id: user?.id || null,
        customer_name: custName || 'Walk-in',
        customer_phone: custPhone || null,
        subtotal, discount_type: discType, discount_value: Number(discVal) || 0, discount_amount: discAmt,
        trade_in_value: ttVal, warranty_type: warranty, warranty_months: wMonths,
        total_amount: tagihan, amount_paid: paid, payment_status: 'paid', transaction_type: 'sale'
      }).select().single()
      if (e1) throw e1

      const items = cart.map(i => ({
        transaction_id: tx.id, product_id: i.id, product_name: i.name, imei: i.imei,
        qty: i.qty, price_at_sale: i.harga_jual, hpp_at_sale: i.hpp || 0,
        line_total: (i.harga_jual || 0) * i.qty, line_profit: ((i.harga_jual || 0) - (i.hpp || 0)) * i.qty
      }))
      const { error: e2 } = await supabase.from('transaction_items').insert(items)
      if (e2) throw e2

      let totalFee = 0
      const payRows = pays.map(r => {
        const m = methods.find(x => x.id === r.method_id)
        const fee = (Number(r.amount) || 0) * ((m?.admin_fee_percentage) || 0) / 100 + (m?.admin_fee_fixed || 0)
        totalFee += fee
        return { transaction_id: tx.id, payment_method_id: r.method_id, method_name: r.method_name, amount: Number(r.amount) || 0, admin_fee: fee, reference_number: 'TRX-' + tx.id.slice(0, 8) }
      })
      const { error: e3 } = await supabase.from('payments').insert(payRows)
      if (e3) throw e3
      await supabase.from('transactions').update({ total_admin_fee: totalFee }).eq('id', tx.id)

      if (useTT && tt.name) {
        await supabase.from('trade_ins').insert({ transaction_id: tx.id, device_name: tt.name, device_imei: tt.imei, device_condition: tt.cond, trade_in_value: ttVal })
      }

      // turunkan stok
      for (const i of cart) {
        if (i.category === 'hp') await supabase.from('products').update({ status: 'sold' }).eq('id', i.id)
        else await supabase.from('products').update({ stock_qty: (i.stock_qty || 0) - i.qty }).eq('id', i.id)
      }

      setDone({ ...tx, items, payments: payRows, discount_amount: discAmt, trade_in_value: ttVal })
      setShowPay(false)
      clearAll()
      boot() // reload stok → dashboard & master barang ikut terupdate
    } catch (err) {
      alert('Gagal: ' + err.message)
    } finally { setProcessing(false) }
  }

  function printStruk(t) {
    const w = window.open('', '_blank', 'width=380,height=640')
    if (!w) { alert('Izinkan pop-up untuk cetak struk'); return }
    const rows = (t.items || []).map(i => `<div class="r"><span>${i.product_name}${i.qty > 1 ? ' x' + i.qty : ''}</span><span>${rupiah(i.line_total)}</span></div>`).join('')
    const pays = (t.payments || []).map(p => `<div class="r"><span>${p.method_name}</span><span>${rupiah(p.amount)}</span></div>`).join('')
    w.document.write(`<html><head><title>Struk ${t.id.slice(0,8)}</title><style>
      body{font-family:monospace;font-size:12px;width:280px;margin:0 auto;padding:8px;color:#000}
      .c{text-align:center}.b{font-weight:bold}.hr{border-top:1px dashed #000;margin:6px 0}
      .r{display:flex;justify-content:space-between;margin:2px 0}.big{font-size:15px}
    </style></head><body>
      <div class="c b big">FANCELL POS</div><div class="c">Toko HP & Aksesoris</div>
      <div class="hr"></div>
      <div class="r"><span>No</span><span>${t.id.slice(0,8)}</span></div>
      <div class="r"><span>Tanggal</span><span>${new Date(t.created_at).toLocaleString('id-ID')}</span></div>
      <div class="r"><span>Customer</span><span>${t.customer_name || 'Walk-in'}</span></div>
      <div class="hr"></div>${rows}<div class="hr"></div>
      <div class="r"><span>Subtotal</span><span>${rupiah(t.subtotal)}</span></div>
      ${t.discount_amount > 0 ? `<div class="r"><span>Diskon</span><span>-${rupiah(t.discount_amount)}</span></div>` : ''}
      ${t.trade_in_value > 0 ? `<div class="r"><span>Tukar Tambah</span><span>-${rupiah(t.trade_in_value)}</span></div>` : ''}
      <div class="r b big"><span>TOTAL</span><span>${rupiah(t.total_amount)}</span></div>
      <div class="hr"></div>${pays}
      <div class="hr"></div><div class="c">Terima kasih atas kunjungannya!</div>
      <div class="c">${t.warranty_type !== 'none' ? 'Garansi ' + t.warranty_months + ' bulan' : ''}</div>
    </body></html>`)
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"></div></div>

  const wOpts = [['none','Tidak Bergaransi'],['toko_1','Garansi Toko 1 Bulan'],['toko_3','Garansi Toko 3 Bulan'],['toko_6','Garansi Toko 6 Bulan'],['toko_12','Garansi Toko 12 Bulan'],['resmi','Garansi Resmi']]

  return (
    <div className="flex h-[calc(100vh-73px)]">
      {/* PRODUK */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari produk / Scan IMEI (Enter)..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] outline-none" />
          </div>
          <div className="flex gap-2">
            {[['all','Semua'],['hp','Handphone'],['aksesoris','Aksesoris']].map(([id,l]) => (
              <button key={id} onClick={() => setCat(id)} className={`px-4 py-1.5 rounded-full text-sm font-medium ${cat===id?'bg-[#0058A3] text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {!filtered.length ? <div className="h-full flex items-center justify-center text-gray-400"><div className="text-center"><Image className="w-16 h-16 mx-auto mb-2 opacity-30"/><p>Tidak ada produk</p></div></div> :
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(p => {
              const inCart = cart.find(i => i.id === p.id)
              return (
                <button key={p.id} onClick={() => add(p)} className={`bg-white border rounded-lg overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all text-left relative ${inCart?'border-[#0058A3] ring-2 ring-[#0058A3]/30':'border-gray-200'}`}>
                  <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover"/> : <div className="text-4xl font-bold text-gray-300">{p.name?.charAt(0)}</div>}
                    <span className="absolute top-2 right-2 bg-[#0058A3] text-white text-[10px] px-2 py-0.5 rounded">{p.category==='hp'?'HP':'ACC'}</span>
                    {inCart && <span className="absolute bottom-2 right-2 bg-[#0058A3] text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">{inCart.qty}</span>}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{p.name}</h3>
                    <p className="text-xs text-gray-500 mb-1 truncate">{[p.storage,p.color].filter(Boolean).join(' · ')||'—'}</p>
                    <p className="text-sm font-bold text-[#0058A3]">{rupiah(p.harga_jual)}</p>
                    {p.category==='aksesoris' && <p className="text-[10px] text-gray-400">Stok: {p.stock_qty||0}</p>}
                  </div>
                </button>
              )
            })}
          </div>}
        </div>
      </div>

      {/* KERANJANG */}
      <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5"/>Keranjang <span className="text-sm text-gray-400">({cart.length})</span></h2>
          {cart.length>0 && <button onClick={clearAll} className="text-xs text-red-600 hover:underline">Kosongkan</button>}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!cart.length ? <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center"><div><ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30"/>Klik produk untuk menambah</div></div> :
          cart.map(i => (
            <div key={i.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{i.name}</p><p className="text-xs text-gray-500">{rupiah(i.harga_jual)} {i.category==='hp'?'· 1 unit':''}</p></div>
                <button onClick={()=>rm(i.id)} className="text-red-500 hover:bg-red-50 rounded p-1"><Trash2 className="w-4 h-4"/></button>
              </div>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2">
                  <button onClick={()=>chQty(i.id,-1)} disabled={i.category==='hp'} className="w-7 h-7 bg-white border rounded disabled:opacity-30"><Minus className="w-3 h-3 mx-auto"/></button>
                  <span className="w-6 text-center text-sm font-semibold">{i.qty}</span>
                  <button onClick={()=>chQty(i.id,1)} disabled={i.category==='hp'} className="w-7 h-7 bg-white border rounded disabled:opacity-30"><Plus className="w-3 h-3 mx-auto"/></button>
                </div>
                <span className="text-sm font-bold text-[#0058A3]">{rupiah((i.harga_jual||0)*i.qty)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* RINGKASAN + KONTROL */}
        <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50 max-h-[45%] overflow-y-auto">
          <Row label="Subtotal" val={rupiah(subtotal)} />
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-gray-500"/><span className="text-sm text-gray-700 flex-1">Diskon</span>
            <select value={discType} onChange={e=>setDiscType(e.target.value)} className="text-sm border rounded px-2 py-1 bg-white"><option value="none">None</option><option value="rp">Rp</option><option value="percent">%</option></select>
            {discType!=='none' && <input type="number" value={discVal} onChange={e=>setDiscVal(e.target.value)} className="w-24 text-sm border rounded px-2 py-1 text-right"/>}
          </div>
          {discAmt>0 && <Row label="Potongan diskon" val={'- '+rupiah(discAmt)} green/>}

          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-gray-500"/><span className="text-sm text-gray-700 flex-1">Tukar Tambah</span>
            <input type="checkbox" checked={useTT} onChange={e=>setUseTT(e.target.checked)} className="w-4 h-4 accent-[#0058A3]"/>
          </div>
          {useTT && <div className="bg-blue-50 rounded p-2 space-y-1">
            <input value={tt.name} onChange={e=>setTT({...tt,name:e.target.value})} placeholder="Unit lama (mis. iPhone 11)" className="w-full text-sm border rounded px-2 py-1"/>
            <div className="flex gap-1"><input value={tt.imei} onChange={e=>setTT({...tt,imei:e.target.value})} placeholder="IMEI" className="flex-1 text-sm border rounded px-2 py-1"/><input type="number" value={tt.value} onChange={e=>setTT({...tt,value:e.target.value})} placeholder="Nilai" className="w-28 text-sm border rounded px-2 py-1 text-right"/></div>
          </div>}
          {ttVal>0 && <Row label="Potongan tukar tambah" val={'- '+rupiah(ttVal)} green/>}

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-500"/><span className="text-sm text-gray-700 flex-1">Garansi</span>
            <select value={warranty} onChange={e=>setWarranty(e.target.value)} className="text-sm border rounded px-2 py-1 bg-white max-w-[180px]">{wOpts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
          </div>

          <div className="border-t border-gray-300 pt-2 flex justify-between items-center">
            <span className="text-lg font-bold">TOTAL</span><span className="text-2xl font-bold text-[#0058A3]">{rupiah(tagihan)}</span>
          </div>
          <button onClick={openPay} disabled={!cart.length} className="w-full bg-[#0058A3] text-white py-3 rounded-lg font-semibold hover:bg-[#004080] disabled:opacity-40 flex items-center justify-center gap-2"><CreditCard className="w-5 h-5"/>Bayar — Split Payment</button>
        </div>
      </div>

      {/* MODAL BAYAR */}
      {showPay && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white"><h3 className="font-bold text-lg">Pembayaran</h3><button onClick={()=>setShowPay(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5"/></button></div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500">Nama Customer</label><input value={custName} onChange={e=>setCustName(e.target.value)} placeholder="Opsional" className="w-full border rounded px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-[#0058A3] outline-none"/></div>
              <div><label className="text-xs text-gray-500">No. HP</label><input value={custPhone} onChange={e=>setCustPhone(e.target.value)} placeholder="Opsional" className="w-full border rounded px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-[#0058A3] outline-none"/></div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center"><span className="text-sm text-gray-600">Tagihan</span><span className="text-xl font-bold text-[#0058A3]">{rupiah(tagihan)}</span></div>

            <div>
              <div className="flex justify-between items-center mb-2"><span className="text-sm font-semibold">Metode Bayar (Split)</span><button onClick={addPay} className="text-xs text-[#0058A3] font-medium flex items-center gap-1"><Plus className="w-3 h-3"/>Tambah</button></div>
              <div className="space-y-2">
                {pays.map((r,idx)=>(
                  <div key={r.key} className="flex gap-2 items-center">
                    <select value={r.method_id} onChange={e=>setPay(r.key,'method_id',e.target.value)} className="flex-1 border rounded px-2 py-2 text-sm bg-white">{methods.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
                    <input type="number" value={r.amount||''} onChange={e=>setPay(r.key,'amount',e.target.value)} placeholder="0" className="w-32 border rounded px-2 py-2 text-sm text-right"/>
                    <button onClick={()=>rmPay(r.key)} disabled={pays.length===1} className="p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-30"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className={sisa>0?'text-red-600 font-medium':'text-green-600 font-medium'}>{sisa>0?'Sisa: '+rupiah(sisa):sisa<0?'Berlebih: '+rupiah(-sisa):'Lunas ✓'}</span>
                {sisa>0 && <button onClick={fillSisa} className="text-[#0058A3] text-xs font-medium underline">Isi sisanya</button>}
              </div>
            </div>

            <button onClick={checkout} disabled={!lunas||processing} className="w-full bg-[#0058A3] text-white py-3 rounded-lg font-semibold hover:bg-[#004080] disabled:opacity-40 flex items-center justify-center gap-2">
              {processing?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Memproses...</>:<><Check className="w-5 h-5"/>Selesaikan Pembayaran</>}
            </button>
          </div>
        </div>
      </div>}

      {/* SUKSES */}
      {done && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><Check className="w-8 h-8 text-green-600"/></div>
          <h3 className="text-xl font-bold mb-1">Transaksi Berhasil</h3>
          <p className="text-sm text-gray-500 mb-4">Stok & laporan otomatis terupdate</p>
          <div className="bg-gray-50 rounded-lg p-3 text-left text-sm space-y-1 mb-4">
            <div className="flex justify-between"><span className="text-gray-500">No</span><span className="font-mono">{done.id.slice(0,8)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{done.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Item</span><span>{done.items.length} produk</span></div>
            <div className="flex justify-between font-bold pt-1 border-t"><span>Total</span><span className="text-[#0058A3]">{rupiah(done.total_amount)}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>printStruk(done)} className="flex-1 border border-gray-300 rounded-lg py-2.5 font-medium flex items-center justify-center gap-2 hover:bg-gray-50"><Printer className="w-4 h-4"/>Cetak Struk</button>
            <button onClick={()=>setDone(null)} className="flex-1 bg-[#0058A3] text-white rounded-lg py-2.5 font-medium hover:bg-[#004080]">Transaksi Baru</button>
          </div>
        </div>
      </div>}
    </div>
  )
}

function Row({label,val,green}) { return <div className="flex justify-between text-sm"><span className="text-gray-600">{label}</span><span className={green?'text-green-600 font-medium':'text-gray-900 font-semibold'}>{val}</span></div> }
