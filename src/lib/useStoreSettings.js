import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
export const DEFAULT_SETTINGS = { store_name:'FANCELL', address:'', whatsapp:'', struk_footer:'Terima kasih atas kunjungannya', logo_sidebar_url:null, logo_struk_url:null }
let cache = null
export function useStoreSettings(){
  const [s,setS]=useState(cache||DEFAULT_SETTINGS)
  useEffect(()=>{ if(cache) return; supabase.from('settings').select('*').eq('id',1).maybeSingle().then(({data})=>{ if(data){ cache={...DEFAULT_SETTINGS,...data}; setS(cache) } }) },[])
  return s
}
export function invalidateSettings(){ cache=null }
