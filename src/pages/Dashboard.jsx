import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { id } from 'date-fns/locale'

export default function Dashboard() {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayTransactions: 0,
    lowStock: 0,
    paylaterSales: 0
  })
  const [salesChart, setSalesChart] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const today = new Date()
      const todayStart = startOfDay(today).toISOString()
      const todayEnd = endOfDay(today).toISOString()

      // 1. Total penjualan & transaksi hari ini
      const { data: todayTransactions } = await supabase
        .from('transactions')
        .select('total_amount, created_at')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

      const todaySales = todayTransactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0
      const todayTransactionsCount = todayTransactions?.length || 0

      // 2. Stok tersedia
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available')

      // 3. Penjualan via Paylater/Kredit hari ini (Home Credit, Kredivo, SPayLater, dll)
      const { data: paylaterTx } = await supabase
        .from('transactions')
        .select(`
          total_amount,
          payments!inner (
            payment_methods!inner (name)
          )
        `)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

      let paylaterSales = 0
      paylaterTx?.forEach(tx => {
        const isPaylater = tx.payments?.some(p => {
          const methodName = p.payment_methods?.name.toLowerCase()
          return methodName.includes('credit') || methodName.includes('kredit') || methodName.includes('home') || methodName.includes('kredivo') || methodName.includes('spay') || methodName.includes('blibli')
        })
        if (isPaylater) {
          paylaterSales += Number(tx.total_amount)
        }
      })

      // 4. Grafik penjualan 7 hari terakhir
      const chartData = []
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i)
        const dayStart = startOfDay(date).toISOString()
        const dayEnd = endOfDay(date).toISOString()

        const { data: dayTransactions } = await supabase
          .from('transactions')
          .select('total_amount')
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd)

        const daySales = dayTransactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0
        chartData.push({
          date: format(date, 'dd MMM', { locale: id }),
          penjualan: daySales
        })
      }

      // 5. Barang terlaris
      const { data: topItems } = await supabase
        .from('transaction_items')
        .select('product_name, qty')
        .order('qty', { ascending: false })
        .limit(5)

      const productSales = {}
      topItems?.forEach(item => {
        productSales[item.product_name] = (productSales[item.product_name] || 0) + item.qty
      })
      const topProductsList = Object.entries(productSales)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)

      setStats({
        todaySales,
        todayTransactions: todayTransactionsCount,
        lowStock: lowStockCount || 0,
        paylaterSales
      })
      setSalesChart(chartData)
      setTopProducts(topProductsList)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-gray-500 animate-pulse">Memuat data dashboard...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Ringkasan performa toko hari ini</p>
      </div>

      {/* Cards Ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-500">Penjualan Hari Ini</h3>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold text-[#0058A3]">{formatRupiah(stats.todaySales)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-500">Total Transaksi</h3>
            <span className="text-2xl">🧾</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.todayTransactions}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-500">Stok Tersedia</h3>
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-3xl font-bold text-orange-500">{stats.lowStock}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-500">Penjualan via Paylater</h3>
            <span className="text-2xl">🏦</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">{formatRupiah(stats.paylaterSales)}</p>
          <p className="text-xs text-gray-400 mt-1">*Home Credit, Kredivo, SPayLater, dll</p>
        </div>
      </div>

      {/* Grafik & Tabel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik Penjualan 7 Hari */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Tren Penjualan 7 Hari Terakhir</h3>
          {salesChart.every(d => d.penjualan === 0) ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400">Belum ada data penjualan</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `${(v/1000000).toFixed(1)}jt`} />
                <Tooltip formatter={(value) => formatRupiah(value)} />
                <Bar dataKey="penjualan" fill="#0058A3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Barang Terlaris */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Barang Terlaris</h3>
          {topProducts.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400">Belum ada data penjualan</div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-[#0058A3] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{product.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 bg-gray-100 px-3 py-1 rounded-full">
                    {product.qty} unit
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
