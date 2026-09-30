import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { id } from 'date-fns/locale'

export default function LabaRugi() {
  const [data, setData] = useState({
    pendapatan: 0,
    hpp: 0,
    labaKotor: 0,
    biayaOperasional: 0,
    labaBersih: 0
  })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })

  useEffect(() => {
    loadLabaRugi()
  }, [period])

  async function loadLabaRugi() {
    try {
      const { data: transactions } = await supabase
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
        .gte('created_at', period.from)
        .lte('created_at', period.to)

      let pendapatan = 0
      let hpp = 0

      transactions?.forEach(tx => {
        pendapatan += Number(tx.total_amount) || 0
        tx.transaction_items?.forEach(item => {
          hpp += (Number(item.hpp_at_sale) || 0) * (item.qty || 1)
        })
      })

      const labaKotor = pendapatan - hpp
      const biayaOperasional = 0
      const labaBersih = labaKotor - biayaOperasional

      setData({ pendapatan, hpp, labaKotor, biayaOperasional, labaBersih })
    } catch (error) {
      console.error('Error loading laba rugi:', error)
    } finally {
      setLoading(false)
    }
  }

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
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Laba Rugi</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Periode {format(new Date(period.from), 'dd MMM yyyy', { locale: id })} - {format(new Date(period.to), 'dd MMM yyyy', { locale: id })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
          <input
            type="date"
            value={period.from}
            onChange={(e) => setPeriod({ ...period, from: e.target.value })}
            className="text-sm bg-transparent outline-none text-gray-700 px-2"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={period.to}
            onChange={(e) => setPeriod({ ...period, to: e.target.value })}
            className="text-sm bg-transparent outline-none text-gray-700 px-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <DollarSign className="w-5 h-5 text-[#0058A3]" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium uppercase mb-1">Pendapatan</p>
          <p className="text-2xl font-bold text-gray-900">{formatRupiah(data.pendapatan)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-orange-50">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium uppercase mb-1">HPP</p>
          <p className="text-2xl font-bold text-gray-900">{formatRupiah(data.hpp)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-green-50">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium uppercase mb-1">Laba Kotor</p>
          <p className="text-2xl font-bold text-green-600">{formatRupiah(data.labaKotor)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-lg ${data.labaBersih >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              {data.labaBersih >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium uppercase mb-1">Laba Bersih</p>
          <p className={`text-2xl font-bold ${data.labaBersih >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatRupiah(data.labaBersih)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Detail Perhitungan</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-700">Total Pendapatan (Penjualan)</span>
            <span className="font-semibold text-gray-900">{formatRupiah(data.pendapatan)}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-700">Harga Pokok Penjualan (HPP)</span>
            <span className="font-semibold text-red-600">- {formatRupiah(data.hpp)}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b-2 border-[#0058A3] bg-blue-50 px-4 rounded-lg">
            <span className="font-bold text-[#0058A3]">Laba Kotor</span>
            <span className="font-bold text-[#0058A3]">{formatRupiah(data.labaKotor)}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-700">Biaya Operasional</span>
            <span className="font-semibold text-red-600">- {formatRupiah(data.biayaOperasional)}</span>
          </div>
          <div className="flex items-center justify-between py-4 bg-green-50 px-4 rounded-lg">
            <span className="font-bold text-green-700 text-lg">Laba Bersih</span>
            <span className={`font-bold text-lg ${data.labaBersih >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatRupiah(data.labaBersih)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
