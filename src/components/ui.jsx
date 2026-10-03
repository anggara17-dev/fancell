import { useState, useEffect, createContext, useContext } from 'react'
import { X, Check, AlertTriangle, Info, Loader2 } from 'lucide-react'

/* ===== TOAST (ganti alert/confirm browser) ===== */
const ToastCtx = createContext(null)
export function ToastProvider({ children }) {
  const [list, setList] = useState([])
  const push = (type, message) => { const id = Date.now() + Math.random(); setList(l => [...l, { id, type, message }]); setTimeout(() => setList(l => l.filter(x => x.id !== id)), 2800) }
  const api = { success: m => push('success', m), error: m => push('error', m), info: m => push('info', m) }
  const ic = { success: <Check className="w-4 h-4"/>, error: <AlertTriangle className="w-4 h-4"/>, info: <Info className="w-4 h-4"/> }
  const cl = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-[#0058A3]' }
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 w-80 max-w-[calc(100vw-2rem)]">
        {list.map(t => (
          <div key={t.id} className={`${cl[t.type]} text-white px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 animate-slide-in`}>{ic[t.type]}<span className="flex-1">{t.message}</span></div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx) || { success(){}, error(){}, info(){} }

/* ===== MODAL SHELL (overlay + Esc + klik luar) ===== */
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-md', footer }) {
  useEffect(() => { if (!open) return; const h = e => { if (e.key === 'Escape') onClose?.() }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} max-h-[92vh] flex flex-col`}>
        {title && <div className="flex justify-between items-center p-5 border-b flex-shrink-0"><h3 className="font-bold text-lg text-gray-900">{title}</h3><button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-500"/></button></div>}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="p-5 border-t flex-shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

/* ===== CONFIRM (ganti window.confirm) ===== */
export function Confirm({ open, message, title = 'Konfirmasi', confirmText = 'Ya, Lanjut', danger, busy, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false)
  useEffect(() => { if (!open) setLoading(false) }, [open])
  const run = async () => { setLoading(true); try { await onConfirm?.() } finally { setLoading(false) } }
  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title={title} maxWidth="max-w-sm" footer={
      <div className="flex gap-3">
        <button onClick={onClose} disabled={loading || busy} className="flex-1 px-4 py-2.5 border text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50">Batal</button>
        <button onClick={run} disabled={loading || busy} className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-60 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0058A3] hover:bg-[#004080]'}`}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin"/>Memproses...</> : confirmText}
        </button>
      </div>
    }>
      <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
    </Modal>
  )
}

/* ===== INPUT RUPIAH (ketik langsung bertitik) ===== */
export function RupiahInput({ value, onChange, className = '', placeholder = '0', disabled }) {
  const fmt = v => (v === '' || v == null) ? '' : Number(String(v).replace(/\D/g, '')).toLocaleString('id-ID')
  return <input inputMode="numeric" disabled={disabled} value={fmt(value)} onChange={e => { const d = e.target.value.replace(/\D/g, ''); onChange(d ? Number(d) : 0) }} className={className} placeholder={placeholder}/>
}
export const rp = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
