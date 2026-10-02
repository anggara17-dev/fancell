import { useState } from 'react'
import { Printer } from 'lucide-react'
export default function CetakPrinter() {
  const [status,setStatus]=useState('idle')
  const test=()=>{ setStatus('printing'); setTimeout(()=>{ setStatus('success'); setTimeout(()=>setStatus('idle'),2000) },1500) }
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6"><h2 className="text-2xl font-bold text-gray-900">Cetak / Printer</h2><p className="text-sm text-gray-500 mt-0.5">Konfigurasi printer thermal untuk cetak struk</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><h3 className="text-lg font-bold mb-4">Status Printer</h3><div className="space-y-4"><div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"><div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full ${status==='success'?'bg-green-500':status==='printing'?'bg-yellow-500 animate-pulse':'bg-gray-400'}`}></div><span className="text-sm font-medium text-gray-700">{status==='success'?'Test Print Berhasil':status==='printing'?'Sedang Mencetak...':'Belum Terhubung'}</span></div></div><button onClick={test} disabled={status==='printing'} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0058A3] text-white rounded-lg hover:bg-[#004080] disabled:opacity-50 font-medium"><Printer className="w-4 h-4"/>Test Print</button></div></div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><h3 className="text-lg font-bold mb-4">Pengaturan</h3><div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700 mb-1.5">Ukuran Kertas</label><select className="w-full px-4 py-2.5 border rounded-lg bg-white"><option value="58mm">58mm (Standar)</option><option value="80mm">80mm (Lebar)</option></select></div><div><label className="block text-sm font-medium text-gray-700 mb-1.5">Jenis Printer</label><select className="w-full px-4 py-2.5 border rounded-lg bg-white"><option value="thermal">Thermal (USB/Bluetooth)</option><option value="pdf">PDF / AirPrint</option></select></div><div className="flex items-center gap-2"><input type="checkbox" id="ap" className="w-4 h-4 accent-[#0058A3]"/><label htmlFor="ap" className="text-sm text-gray-700">Auto-print setelah transaksi</label></div></div></div>
      </div>
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4"><h4 className="text-sm font-semibold text-[#0058A3] mb-2">Informasi Printer</h4><ul className="text-sm text-gray-700 space-y-1"><li>• Printer thermal USB/Bluetooth didukung via Web USB API (Chrome/Edge)</li><li>• Untuk iPhone/Safari, gunakan mode PDF/AirPrint</li><li>• Pastikan printer ON dan terhubung sebelum test print</li></ul></div>
    </div> )
}
