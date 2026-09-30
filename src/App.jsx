import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

function App() {
  const [status, setStatus] = useState('Mengecek koneksi...')

  useEffect(() => {
    // Tes koneksi ke Supabase
    const testConnection = async () => {
      const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true })
      
      if (error) {
        setStatus('❌ Gagal konek ke Supabase: ' + error.message)
      } else {
        setStatus('✅ Berhasil konek ke Supabase! Database siap digunakan.')
      }
    }
    testConnection()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center p-8 border border-blue-200 rounded-xl shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-[#0058A3] mb-4">Toko HP POS</h1>
        <p className="text-lg text-gray-700 mb-2">Status Sistem:</p>
        <div className={`p-4 rounded-lg font-semibold ${status.includes('Berhasil') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {status}
        </div>
        <p className="text-sm text-gray-400 mt-6">Fencell POS System v1.0</p>
      </div>
    </div>
  )
}

export default App
