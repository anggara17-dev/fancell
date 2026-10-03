import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
export const DEFAULT_SETTINGS = { store_name:'FANCELL', address:'', whatsapp:'', struk_footer:'Terima kasih atas kunjungannya', logo_sidebar_url:null, logo_struk_url:null, updated_at:null }
let cache = null
async function fetchSettings(){ const { data } = await supabase.from('settings').select('*').eq('id',1).maybeSingle(); cache = data ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS; return cache }
export function useStoreSettings(){
  const [s, setS] = useState(cache || DEFAULT_SETTINGS)
  useEffect(() => {
    let alive = true
    if (!cache) fetchSettings().then(v => { if (alive) setS(v) })
    const refresh = () => fetchSettings().then(v => { if (alive) setS(v) })
    window.addEventListener('fancell-settings-updated', refresh)
    return () => { alive = false; window.removeEventListener('fancell-settings-updated', refresh) }
  }, [])
  return s
}
export function invalidateSettings(){ cache = null; window.dispatchEvent(new Event('fancell-settings-updated')) }
