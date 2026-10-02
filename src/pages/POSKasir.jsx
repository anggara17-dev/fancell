import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Search, ShoppingCart, Trash2, Plus, Minus, X, Image, CreditCard, Check, Printer, RefreshCw, Shield } from 'lucide-react'

export default function POSKasir() {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [cart, setCart] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [processing, setProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastTransaction, setLastTransaction] = useState(null)

  // Fitur tambahan
  const [discountType, setDiscountType] = useState('none') // none, rp, percent
  const [discountValue, setDiscountValue] = useState(0)
  const [useTradeIn, setUseTradeIn] = useState(false)
  const [tradeInDevice, setTradeInDevice] = useState({ name: '', imei: '', condition: '', value: 0 })
  const [warrantyType, setWarrantyType] = useState('none')
  const [warrantyMonths, setWarrantyMonths] = useState(0)
  const [useSplitPayment, setUseSplitPayment] = useState(false)
  const [splitPayments, setSplitPayments] = useState([])

  useEffect(() => {
    loadProducts()
    loadPaymentMethods()
  }, [])

  useEffect(() => { filterProducts() }, [products, searchQuery, selectedCategory])

  async function loadProducts() {
    try {
      const { data } = await supabase.from('products').select('*').eq('status', 'available').order('name')
      if (data) setProducts(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function loadPaymentMethods() {
    try {
      const { data } = await supabase.from('payment_methods').select('*').eq('is_active', true).order('name')
      if (data) setPaymentMethods(data)
    } catch (err) { console.error(err) }
  }

  function filterProducts() {
    let filtered = products
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(p => p.name?.toLowerCase().includes(q) || p.imei?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q))
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }
    setFilteredProducts(filtered)
  }

  function addToCart(product) {
    const existing = cart.find(item => item.id === product.id)
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item))
    } else {
      setCart([...cart, { ...product, qty: 1 }])
    }
  }

  function removeFromCart(productId) {
    setCart(cart.filter(item => item.id !== productId))
  }

  function updateQty(productId, delta) {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQty = item.qty + delta
        return newQty > 0 ? { ...item, qty: newQty } : item
      }
      return item
    }).filter(item => item.qty > 0))
  }

  function clearCart() {
    setCart([])
    setCustomerName('')
    setDiscountType('none')
    setDiscountValue(0)
    setUseTradeIn(false)
    setTradeInDevice({ name: '', imei: '', condition: '', value: 0 })
    setWarrantyType('none')
    setWarrantyMonths(0)
    setUseSplitPayment(false)
    setSplitPayments([])
  }

  // Kalkulasi
  const subtotal = cart.reduce((sum, item) => sum + ((item.harga_jual || 0) * item.qty), 0)
  
  const discountAmount = (() => {
    if (discountType === 'rp') return discountValue
    if (discountType === 'percent') return subtotal * (discountValue / 100)
    return 0
  })()

  const afterDiscount = subtotal - discountAmount
  const afterTradeIn = useTradeIn ? afterDiscount - (tradeInDevice.value || 0) : afterDiscount
  const total = Math.max(0, afterTradeIn)

  const categories = [
    { id: 'all', label: 'Semua' },
    { id: 'hp', label: 'Handphone' },
    { id: 'aksesoris', label: 'Aksesoris' }
  ]

  const warrantyOptions = [
    { value: 'none', label: 'Tidak Bergaransi' },
    { value: 'toko_1', label: 'Garansi Toko 1 Bulan' },
    { value: 'toko_3', label: 'Garansi Toko 3 Bulan' },
    { value: 'toko_6', label: 'Garansi Toko 6 Bulan' },
    { value: 'toko_12', label: 'Garansi Toko 12 Bulan' },
    { value: 'resmi', label: 'Garansi Resmi' }
  ]

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0)

  // Payment logic
  function handleCheckout() {
    if (cart.length === 0) { alert('Keranjang masih kosong'); return }
    setShowPaymentModal(true)
  }

  async function processPayment(selectedMethod) {
    setProcessing(true)
    try {
      // 1. Insert transaksi
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          customer_name: customerName || 'Walk-in Customer',
          subtotal: subtotal,
          discount_amount: discountAmount,
          total_amount: total,
          payment_status: 'paid',
          transaction_type: 'sale',
          discount_type: discountType,
          discount_value: discountValue,
          trade_in_value: useTradeIn ? tradeInDevice.value : 0,
          warranty_type: warrantyType,
          warranty_months: warrantyMonths,
          notes: `Via ${selectedMethod.name}`
        })
        .select()
        .single()

      if (txError) throw txError

      // 2. Insert items
      const itemsToInsert = cart.map(item => ({
        transaction_id: transaction.id,
        product_id: item.id,
        product_name: item.name,
        imei: item.imei,
        qty: item.qty,
        price_at_sale: item.harga_jual,
        hpp_at_sale: item.hpp || 0
      }))
      await supabase.from('transaction_items').insert(itemsToInsert)

      // 3. Insert payment
      const adminFee = (total * (selectedMethod.admin_fee_percentage || 0) / 100) + (selectedMethod.admin_fee_fixed || 0)
      await supabase.from('payments').insert({
        transaction_id: transaction.id,
        payment_method_id: selectedMethod.id,
        amount: total,
        admin_fee: adminFee,
        reference_number: `TRX-${Date.now()}`,
        notes: selectedMethod.name
      })

      // 4. Insert trade-in jika ada
      if (useTradeIn && tradeInDevice.name) {
        await supabase.from('trade_ins').insert({
          transaction_id: transaction.id,
          device_name: tradeInDevice.name,
          device_imei: tradeInDevice.imei,
          device_condition: tradeInDevice.condition,
          trade_in_value: tradeInDevice.value
        })
      }

      // 5. Update status produk jadi sold
      for (const item of cart) {
        await supabase.from('products').update({ status: 'sold' }).eq('id', item.id)
      }

      setLastTransaction({ id: transaction.id, total, items: cart, payment: selectedMethod, customer: customerName })
      setShowSuccess(true)
      clearCart()
      loadProducts()
    } catch (err) {
      alert('Gagal: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <div className="p-8 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"></div></div>
  }

  return (
    <div className="flex h-[calc(100vh-73px)]">
      {/* LEFT: Product Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari produk / Scan IMEI..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] outline-none" />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat.id ? 'bg-[#0058A3] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat.label}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center"><Image className="w-16 h-16 mx-auto mb-2 opacity-30" /><p>Tidak ada produk ditemukan</p></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map(product => (
                <button key={product.id} onClick={() => addToCart(product)} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group text-left">
                  <div className="aspect-square bg-gray-100 flex items-center justify-center relative overflow-hidden">
                    {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" /> : <div className="text-4xl font-bold text-gray-300">{product.name?.charAt(0)}</div>}
                    <div className="absolute top-2 right-2 bg-[#0058A3] text-white text-xs px-2 py-0.5 rounded">{product.category === 'hp' ? 'HP' : 'ACC'}</div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">{product.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{product.storage && `${product.storage} · `}{product.color || 'Various'}</p>
                    <p className="text-sm font-bold text-[#0058A3]">{formatRupiah(product.harga_jual)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart Sidebar */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><ShoppingCart className="w-5 h-5" />Keranjang</h2>
            {cart.length > 0 && <button onClick={clearCart} className="text-xs text-red-600 hover:text-red-700 font-medium">Kosongkan</button>}
          </div>
          <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama Konsumen (Opsional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0058A3] outline-none" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center"><ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" /><p className="text-sm">Keranjang kosong</p><p className="text-xs mt-1">Klik produk untuk menambahkan</p></div>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                    <p className="text-xs text-gray-500">{item.storage} · {item.color}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100"><Minus className="w-3 h-3" /></button>
                    <span className="text-sm font-semibold w-6 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100"><Plus className="w-3 h-3" /></button>
                  </div>
                  <span className="text-sm font-bold text-[#0058A3]">{formatRupiah((item.harga_jual || 0) * item.qty)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer dengan semua fitur */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3 max-h-[50%] overflow-y-auto">
          {/* Subtotal */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold text-gray-900">{formatRupiah(subtotal)}</span>
          </div>

          {/* Diskon */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 w-32">Diskon</span>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm bg-white">
              <option value="none">Tanpa Diskon</option>
              <option value="rp">Rp (Nominal)</option>
              <option value="percent">% (Persen)</option>
            </select>
            {discountType !== 'none' && (
              <input type="number" value={discountValue} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm text-right" placeholder="0" />
            )}
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-sm text-green-600">
              <span>Diskon</span>
              <span>- {formatRupiah(discountAmount)}</span>
            </div>
          )}

          {/* Tukar Tambah */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 flex-1">Pakai Tukar Tambah?</span>
            <input type="checkbox" checked={useTradeIn} onChange={(e) => setUseTradeIn(e.target.checked)} className="w-4 h-4 text-[#0058A3]" />
          </div>
          {useTradeIn && (
            <div className="bg-blue-50 p-3 rounded-lg space-y-2">
              <input type="text" value={tradeInDevice.name} onChange={(e) => setTradeInDevice({...tradeInDevice, name: e.target.value})} placeholder="Nama unit lama" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
              <input type="text" value={tradeInDevice.imei} onChange={(e) => setTradeInDevice({...tradeInDevice, imei: e.target.value})} placeholder="IMEI (opsional)" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
              <input type="number" value={tradeInDevice.value} onChange={(e) => setTradeInDevice({...tradeInDevice, value: parseFloat(e.target.value) || 0})} placeholder="Harga tukar tambah" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
            </div>
          )}
          {useTradeIn && tradeInDevice.value > 0 && (
            <div className="flex items-center justify-between text-sm text-green-600">
              <span>Tukar Tambah</span>
              <span>- {formatRupiah(tradeInDevice.value)}</span>
            </div>
          )}

          {/* Garansi */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 w-32">Pilih Garansi</span>
            <select value={warrantyType} onChange={(e) => setWarrantyType(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm bg-white">
              {warrantyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Total */}
          <div className="border-t border-gray-300 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-[#0058A3]">{formatRupiah(total)}</span>
            </div>
          </div>

          <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full bg-[#0058A3] text-white py-3 rounded-lg font-semibold hover:bg-[#004080] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5" />
            Bayar Sekarang
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Pilih Metode Pembayaran</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Pembayaran</p>
                <p className="text-2xl font-bold text-[#0058A3]">{formatRupiah(total)}</p>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {paymentMethods.map(method => (
                  <button key={method.id} onClick={() => processPayment(method)} className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 hover:border-[#0058A3] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><CreditCard className="w-5 h-5 text-gray-600" /></div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{method.name}</p>
                        <p className="text-xs text-gray-500">{method.admin_fee_percentage > 0 ? `Fee ${method.admin_fee_percentage}%` : 'Tanpa biaya admin'}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="w-full mt-4 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && lastTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-green-600" /></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Transaksi Berhasil!</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">No. Transaksi</span><span className="font-mono text-xs">{lastTransaction.id.slice(0, 8)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Customer</span><span className="font-medium">{lastTransaction.customer || 'Walk-in'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Metode</span><span className="font-medium">{lastTransaction.payment.name}</span></div>
                <div className="flex justify-between pt-2 border-t border-gray-200"><span className="font-semibold">Total</span><span className="font-bold text-[#0058A3]">{formatRupiah(lastTransaction.total)}</span></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowSuccess(false); setLastTransaction(null) }} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2"><Printer className="w-4 h-4" />Cetak Struk</button>
                <button onClick={() => { setShowSuccess(false); setLastTransaction(null) }} className="flex-1 px-4 py-2.5 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] font-medium">Transaksi Baru</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
