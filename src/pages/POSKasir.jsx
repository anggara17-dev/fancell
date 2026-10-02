import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Search, ShoppingCart, Trash2, Plus, Minus, X, Image, CreditCard, Check, Printer } from 'lucide-react'

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
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastTransaction, setLastTransaction] = useState(null)

  useEffect(() => {
    loadProducts()
    loadPaymentMethods()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [products, searchQuery, selectedCategory])

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'available')
        .order('name')
      
      if (!error) setProducts(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadPaymentMethods() {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (!error) setPaymentMethods(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  function filterProducts() {
    let filtered = products
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query) || 
        p.imei?.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query)
      )
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }
    
    setFilteredProducts(filtered)
  }

  function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id)
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, qty: item.qty + 1 }
          : item
      ))
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
  }

  const subtotal = cart.reduce((sum, item) => sum + ((item.harga_jual || 0) * item.qty), 0)
  const total = subtotal

  const categories = [
    { id: 'all', label: 'Semua' },
    { id: 'hp', label: 'Handphone' },
    { id: 'aksesoris', label: 'Aksesoris' }
  ]

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0)
  }

  async function handlePayment() {
    if (!selectedPayment) {
      alert('Pilih metode pembayaran terlebih dahulu')
      return
    }

    setProcessing(true)

    try {
      // 1. Hitung admin fee
      const adminFee = (subtotal * (selectedPayment.admin_fee_percentage || 0) / 100) + (selectedPayment.admin_fee_fixed || 0)

      // 2. Insert transaksi
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          cashier_id: null, // Akan di-set dari user yang login
          customer_name: customerName || 'Walk-in Customer',
          subtotal: subtotal,
          discount_amount: 0,
          total_amount: total,
          payment_status: 'paid',
          transaction_type: 'sale',
          notes: `Pembayaran via ${selectedPayment.name}`
        })
        .select()
        .single()

      if (txError) throw txError

      // 3. Insert transaction items
      const itemsToInsert = cart.map(item => ({
        transaction_id: transaction.id,
        product_id: item.id,
        product_name: item.name,
        imei: item.imei,
        qty: item.qty,
        price_at_sale: item.harga_jual,
        hpp_at_sale: item.hpp || 0
      }))

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      // 4. Insert payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          transaction_id: transaction.id,
          payment_method_id: selectedPayment.id,
          amount: total,
          admin_fee: adminFee,
          reference_number: `TRX-${Date.now()}`,
          notes: selectedPayment.name
        })

      if (paymentError) throw paymentError

      // 5. Update status produk jadi 'sold'
      for (const item of cart) {
        await supabase
          .from('products')
          .update({ status: 'sold' })
          .eq('id', item.id)
      }

      // 6. Success
      setLastTransaction({
        id: transaction.id,
        total: total,
        items: cart,
        payment: selectedPayment,
        customer: customerName
      })
      setShowSuccess(true)
      clearCart()
      loadProducts() // Reload produk yang available

    } catch (err) {
      console.error('Error processing payment:', err)
      alert('Gagal memproses transaksi: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  function handleCheckout() {
    if (cart.length === 0) {
      alert('Keranjang masih kosong')
      return
    }
    setShowPaymentModal(true)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-73px)]">
      {/* Left: Product Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search & Filter */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk / Scan IMEI..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0058A3] focus:border-transparent outline-none"
              />
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#0058A3] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Image className="w-16 h-16 mx-auto mb-2 opacity-30" />
                <p>Tidak ada produk ditemukan</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group text-left"
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center relative overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-4xl font-bold text-gray-300">
                        {product.name?.charAt(0)}
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-[#0058A3] text-white text-xs px-2 py-0.5 rounded">
                      {product.category === 'hp' ? 'HP' : 'ACC'}
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">{product.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {product.storage && `${product.storage} · `}
                      {product.color || 'Various'}
                    </p>
                    <p className="text-sm font-bold text-[#0058A3]">{formatRupiah(product.harga_jual)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart Sidebar */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Keranjang
            </h2>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Kosongkan
              </button>
            )}
          </div>
          
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nama Konsumen (Opsional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0058A3] focus:border-transparent outline-none"
          />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Keranjang kosong</p>
                <p className="text-xs mt-1">Klik produk untuk menambahkan</p>
              </div>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-3 animate-fade-in">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                    <p className="text-xs text-gray-500">{item.storage} · {item.color}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-[#0058A3]">
                    {formatRupiah((item.harga_jual || 0) * item.qty)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-gray-900">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-lg font-bold">
              <span className="text-gray-900">TOTAL</span>
              <span className="text-[#0058A3]">{formatRupiah(total)}</span>
            </div>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-[#0058A3] text-white py-3 rounded-lg font-semibold hover:bg-[#004080] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Bayar — Metode & Split Payment
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Pilih Metode Pembayaran</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Pembayaran</p>
                <p className="text-2xl font-bold text-[#0058A3]">{formatRupiah(total)}</p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {paymentMethods.map(method => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPayment(method)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      selectedPayment?.id === method.id
                        ? 'border-[#0058A3] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{method.name}</p>
                        <p className="text-xs text-gray-500">
                          {method.admin_fee_percentage > 0 && `Fee ${method.admin_fee_percentage}%`}
                          {method.admin_fee_fixed > 0 && ` + ${formatRupiah(method.admin_fee_fixed)}`}
                          {method.admin_fee_percentage === 0 && method.admin_fee_fixed === 0 && 'Tanpa biaya admin'}
                        </p>
                      </div>
                    </div>
                    {selectedPayment?.id === method.id && (
                      <Check className="w-5 h-5 text-[#0058A3]" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={handlePayment}
                  disabled={!selectedPayment || processing}
                  className="flex-1 px-4 py-2.5 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Bayar Sekarang
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && lastTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Transaksi Berhasil!</h3>
              <p className="text-sm text-gray-500 mb-4">Pembayaran telah diproses</p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">No. Transaksi</span>
                    <span className="font-mono text-xs">{lastTransaction.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer</span>
                    <span className="font-medium">{lastTransaction.customer || 'Walk-in'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Metode</span>
                    <span className="font-medium">{lastTransaction.payment.name}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-900 font-semibold">Total</span>
                    <span className="font-bold text-[#0058A3]">{formatRupiah(lastTransaction.total)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSuccess(false)
                    setLastTransaction(null)
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Struk
                </button>
                <button
                  onClick={() => {
                    setShowSuccess(false)
                    setLastTransaction(null)
                  }}
                  className="flex-1 px-4 py-2.5 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] transition-colors font-medium"
                >
                  Transaksi Baru
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
