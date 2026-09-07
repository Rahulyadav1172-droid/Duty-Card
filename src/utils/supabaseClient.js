import { createClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'police_custom_supabase_url';
const STORAGE_ANON_KEY = 'police_custom_supabase_key';

const DEFAULT_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://oriksrcvmzxnvysfqiuf.supabase.co';
const DEFAULT_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_EsFmeOul48I88-4ilvoQtQ_RQvgrIEC';

export function getSupabaseConfig() {
  try {
    const customUrl = localStorage.getItem(STORAGE_URL_KEY);
    const customKey = localStorage.getItem(STORAGE_ANON_KEY);
    return {
      url: (customUrl && customUrl.trim()) ? customUrl.trim() : DEFAULT_URL,
      key: (customKey && customKey.trim()) ? customKey.trim() : DEFAULT_KEY,
      isCustom: Boolean(customUrl && customKey)
    };
  } catch (e) {
    return { url: DEFAULT_URL, key: DEFAULT_KEY, isCustom: false };
  }
}

export function saveSupabaseConfig(url, key) {
  try {
    if (url && key) {
      localStorage.setItem(STORAGE_URL_KEY, url.trim());
      localStorage.setItem(STORAGE_ANON_KEY, key.trim());
      return true;
    }
  } catch (e) {}
  return false;
}

export function resetSupabaseConfig() {
  try {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_ANON_KEY);
    return true;
  } catch (e) {}
  return false;
}

const currentConfig = getSupabaseConfig();

export const supabase = createClient(currentConfig.url, currentConfig.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
