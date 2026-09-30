import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { TrendingUp, Package, ShoppingCart, AlertTriangle, DollarSign, Target, Layers, TrendingDown } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayHPP: 0,
    todayGrossProfit: 0,
    todayTransactions: 0,
    totalTransactions: 0,
    totalProducts: 0,
    totalStock: 0,
    lowStock: 0
  })
  const [salesChart, setSalesChart] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const today = new Date()
      const todayStart = startOfDay(today).toISOString()
      const todayEnd = endOfDay(today).toISOString()

      // 1. Transaksi hari ini dengan item (untuk hitung HPP & Laba Kotor)
      const { data: todayTransactions } = await supabase
        .from('transactions')
        .select(`
          id,
          total_amount,
          transaction_items (
            hpp_at_sale,
            price_at_sale,
            qty
          )
        `)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

      let todaySales = 0
      let todayHPP = 0
      todayTransactions?.forEach(tx => {
        todaySales += Number(tx.total_amount) || 0
        tx.transaction_items?.forEach(item => {
          todayHPP += (Number(item.hpp_at_sale) || 0) * (item.qty || 1)
        })
      })
      const todayGrossProfit = todaySales - todayHPP

      // 2. Total semua transaksi
      const { count: totalTransactions } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })

      // 3. Total produk & stok
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, status')

      const totalProducts = allProducts?.length || 0
      const totalStock = allProducts?.filter(p => p.status === 'available').length || 0

      // 4. Stok hampir habis (ambil 10 produk available dengan stok terendah - simulasi)
      const { data: lowStockData } = await supabase
        .from('products')
        .select('name, storage, color, status')
        .eq('status', 'available')
        .limit(10)

      // 5. Grafik 7 hari
      const chartData = []
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i)
        const dayStart = startOfDay(date).toISOString()
        const dayEnd = endOfDay(date).toISOString()

        const { data: dayTx } = await supabase
          .from('transactions')
          .select('total_amount')
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd)

        const daySales = dayTx?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0
        chartData.push({
          date: format(date, 'dd MMM', { locale: id }),
          penjualan: daySales
        })
      }

      setStats({
        todaySales,
        todayHPP,
        todayGrossProfit,
        todayTransactions: todayTransactions?.length || 0,
        totalTransactions: totalTransactions || 0,
        totalProducts,
        totalStock,
        lowStock: lowStockData?.length || 0
      })
      setSalesChart(chartData)
      setLowStockProducts(lowStockData || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0)
  }

  const StatCard = ({ icon: Icon, label, value, color, delay, trend }) => (
    <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in ${delay}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs font-medium flex items-center gap-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 animate-count-up">{value}</p>
    </div>
  )

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500">Memuat dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Stats Cards - Row 1: Periode Ini */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Penjualan (Periode Ini)"
          value={formatRupiah(stats.todaySales)}
          color="bg-blue-100 text-blue-600"
          delay="stagger-1"
          trend={12.5}
        />
        <StatCard
          icon={Package}
          label="HPP (Periode Ini)"
          value={formatRupiah(stats.todayHPP)}
          color="bg-orange-100 text-orange-600"
          delay="stagger-2"
        />
        <StatCard
          icon={TrendingUp}
          label="Laba Kotor (Periode Ini)"
          value={formatRupiah(stats.todayGrossProfit)}
          color="bg-green-100 text-green-600"
          delay="stagger-3"
          trend={8.2}
        />
        <StatCard
          icon={ShoppingCart}
          label="Transaksi (Periode Ini)"
          value={stats.todayTransactions}
          color="bg-purple-100 text-purple-600"
          delay="stagger-4"
        />
      </div>

      {/* Stats Cards - Row 2: Sepanjang Waktu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Layers}
          label="Total Transaksi (Sepanjang Waktu)"
          value={stats.totalTransactions}
          color="bg-indigo-100 text-indigo-600"
          delay="stagger-5"
        />
        <StatCard
          icon={Package}
          label="Total Produk"
          value={stats.totalProducts}
          color="bg-pink-100 text-pink-600"
          delay="stagger-6"
        />
        <StatCard
          icon={Layers}
          label="Total Stok"
          value={stats.totalStock}
          color="bg-cyan-100 text-cyan-600"
          delay="stagger-7"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stok Hampir Habis"
          value={stats.lowStock}
          color="bg-red-100 text-red-600"
          delay="stagger-8"
        />
      </div>

      {/* Grafik & Produk Hampir Habis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Penjualan */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in stagger-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Grafik Penjualan (7 Hari)</h3>
              <p className="text-sm text-gray-500 mt-0.5">Performa penjualan minggu ini</p>
            </div>
          </div>
          {salesChart.every(d => d.penjualan === 0) ? (
            <div className="h-[320px] flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-30" />
              <p className="text-sm">Belum ada data penjualan</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={salesChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000000).toFixed(0)}jt`} />
                <Tooltip
                  formatter={(value) => formatRupiah(value)}
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Bar dataKey="penjualan" radius={[8, 8, 0, 0]} maxBarSize={50}>
                  {salesChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#0a0a0a" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Produk Hampir Habis */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in stagger-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Produk Hampir Habis</h3>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="h-[320px] flex flex-col items-center justify-center text-gray-400">
              <Package className="w-12 h-12 mb-2 opacity-30" />
              <p className="text-sm">Semua stok aman</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[320px] overflow-y-auto scrollbar-thin">
              {lowStockProducts.map((product, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.color && `${product.color}`}
                      {product.storage && ` · ${product.storage}`}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md ml-2">
                    0 pcs
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 pt-4 pb-2">
        Design & Develop By <span className="font-semibold text-gray-600">Fancell Team</span>
      </div>
    </div>
  )
}
