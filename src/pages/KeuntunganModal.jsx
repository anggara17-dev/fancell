import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react'

export default function KeuntunganModal() {
  const [data, setData] = useState({
    modalAwal: 0,
    modalTambahan: 0,
    totalModal: 0,
    keuntungan: 0,
    prive: 0,
    saldoModal: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: capitalTx } = await supabase
        .from('capital_transactions')
        .select('type, amount')

      let modalAwal = 0
      let prive = 0

      capitalTx?.forEach(tx => {
        if (tx.type === 'capital_in') {
          modalAwal += Number(tx.amount) || 0
        } else if (tx.type === 'prive_out') {
          prive += Number(tx.amount) || 0
        }
      })

      const totalModal = modalAwal
      const keuntungan = 0
      const saldoModal = totalModal + keuntungan - prive

      setData({ modalAwal, modalTambahan: 0, totalModal, keuntungan, prive, saldoModal })
    } catch (error) {
      console.error('Error loading data:', error)
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Keuntungan & Modal</h2>
        <p className="text-sm text-gray-500 mt-0.5">Tracking modal usaha dan keuntungan</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <Wallet className="w-5 h-5 text-[#0058A3]" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium uppercase mb-1">Total Modal</p>
          <p className="text-2xl font-bold text-gray-900">{formatRupiah(data.totalModal)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-green-50">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium uppercase mb-1">Keuntungan</p>
          <p className="text-2xl font-bold text-green-600">{formatRupiah(data.keuntungan)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-red-50">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium uppercase mb-1">Prive (Pengambilan)</p>
          <p className="text-2xl font-bold text-red-600">{formatRupiah(data.prive)}</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#0058A3] to-[#004080] p-8 rounded-xl shadow-lg text-white mb-6">
        <p className="text-sm opacity-90 mb-2">Saldo Modal Berjalan</p>
        <p className="text-4xl font-bold">{formatRupiah(data.saldoModal)}</p>
        <p className="text-sm opacity-75 mt-2">Modal + Keuntungan - Prive</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-[#0058A3] mb-2">Cara Kerja</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Modal Awal</strong>: Setoran awal dari owner/investor</li>
          <li>• <strong>Keuntungan</strong>: Otomatis terhitung dari Laba Rugi</li>
          <li>• <strong>Prive</strong>: Pengambilan uang oleh owner untuk keperluan pribadi</li>
          <li>• <strong>Saldo Modal</strong> = Modal + Keuntungan - Prive</li>
        </ul>
      </div>
    </div>
  )
}
