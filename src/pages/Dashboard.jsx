export default function Dashboard() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm text-gray-500 mb-2">Total Penjualan Hari Ini</h3>
          <p className="text-3xl font-bold text-[#0058A3]">Rp 0</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm text-gray-500 mb-2">Transaksi</h3>
          <p className="text-3xl font-bold text-gray-800">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm text-gray-500 mb-2">Stok Menipis</h3>
          <p className="text-3xl font-bold text-orange-500">0</p>
        </div>
      </div>
    </div>
  )
}
