import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  DollarSign,
  Package,
  TrendingUp,
  ShoppingCart,
  Layers,
  AlertTriangle,
  Archive
} from 'lucide-react'

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

      const { count: totalTransactions } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })

      const { data: allProducts } = await supabase
        .from('products')
        .select('id, status')

      const totalProducts = allProducts?.length || 0
      const totalStock = allProducts?.filter(p => p.status === 'available').length || 0

      const { data: lowStockData } = await supabase
        .from('products')
        .select('name, storage, color, status')
        .eq('status', 'available')
        .limit(10)

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

  const StatCard = ({ icon: Icon, label, value, delay }) => (
    <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 animate-fade-in ${delay}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-lg bg-blue-50">
          <Icon className="w-5 h-5 text-[#0058A3]" />
        </div>
      </div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-2xl font-bold text-gray-900 animate-count-up">{value}</p>
    </div>
  )

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#0058A3] border-t-transparent rounded-full animate-spin-slow"></div>
          <span className="text-gray-500">Memuat dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Row 1: Periode Ini */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Penjualan (Periode Ini)"
          value={formatRupiah(stats.todaySales)}
          delay="stagger-1"
        />
        <StatCard
          icon={Package}
          label="HPP (Periode Ini)"
          value={formatRupiah(stats.todayHPP)}
          delay="stagger-2"
        />
        <StatCard
          icon={TrendingUp}
          label="Laba Kotor (Periode Ini)"
          value={formatRupiah(stats.todayGrossProfit)}
          delay="stagger-3"
        />
        <StatCard
          icon={ShoppingCart}
          label="Transaksi (Periode Ini)"
          value={stats.todayTransactions}
          delay="stagger-4"
        />
      </div>

      {/* Row 2: Sepanjang Waktu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Layers}
          label="Total Transaksi (Sepanjang Waktu)"
          value={stats.totalTransactions}
          delay="stagger-5"
        />
        <StatCard
          icon={Archive}
          label="Total Produk"
          value={stats.totalProducts}
          delay="stagger-6"
        />
        <StatCard
          icon={Layers}
          label="Total Stok"
          value={stats.totalStock}
          delay="stagger-7"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stok Hampir Habis"
          value={stats.lowStock}
          delay="stagger-8"
        />
      </div>

      {/* Grafik & Produk Hampir Habis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in stagger-5">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900">Grafik Penjualan (7 Hari)</h3>
            <p className="text-sm text-gray-500 mt-0.5">Performa penjualan minggu ini</p>
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
                <Bar dataKey="penjualan" fill="#0058A3" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in stagger-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Produk Hampir Habis</h3>
            <AlertTriangle className="w-5 h-5 text-[#0058A3]" />
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
                  className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">
                      {product.color && `${product.color}`}
                      {product.storage && ` · ${product.storage}`}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#0058A3] bg-blue-50 px-2.5 py-1 rounded-md ml-2">
                    0 pcs
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 pt-4 pb-2">
        Design & Develop By <span className="font-semibold text-gray-600">Depgo</span>
      </div>
    </div>
  )
}
