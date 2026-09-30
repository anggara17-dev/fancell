import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Search, ShoppingCart, Trash2, Plus, Minus, X, Image } from 'lucide-react'

export default function POSKasir() {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [cart, setCart] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
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

  function filterProducts() {
    let filtered = products
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.imei?.toLowerCase().includes(query)
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

  const subtotal = cart.reduce((sum, item) => sum + (item.harga_jual * item.qty), 0)
  const total = subtotal

  const categories = [
    { id: 'all', label: 'Semua' },
    { id: 'hp', label: 'Handphone' },
    { id: 'aksesoris', label: 'Aksesoris' }
  ]

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin-slow"></div>
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
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
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
                    {formatRupiah(item.harga_jual * item.qty)}
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
            disabled={cart.length === 0}
            className="w-full bg-[#0058A3] text-white py-3 rounded-lg font-semibold hover:bg-[#004080] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            Bayar — Metode & Split Payment
          </button>
        </div>
      </div>
    </div>
  )
}
