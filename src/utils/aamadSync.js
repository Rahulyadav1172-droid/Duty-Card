import { supabase } from './supabaseClient';

const EVENTS_TABLE = 'police_events';
const CLOUD_AAMAD_ROW_ID = 'global-force-aamad-registry';
export const AAMAD_STORAGE_KEY = 'police_force_aamad_records_v1';
export const AAMAD_AUDIT_LOG_KEY = 'police_force_aamad_audit_logs_v1';

/**
 * Fetch all Force Aamad records & audit logs from Supabase Cloud
 */
export async function fetchAamadFromSupabase() {
  try {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select('records, attendance_map')
      .eq('id', CLOUD_AAMAD_ROW_ID)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch error for Aamad (will use local cache):', error.message);
      return null;
    }

    if (data) {
      const records = Array.isArray(data.records) ? data.records : [];
      const auditLogs = Array.isArray(data.attendance_map?.auditLogs) ? data.attendance_map.auditLogs : [];
      
      // Update local storage cache
      try {
        localStorage.setItem(AAMAD_STORAGE_KEY, JSON.stringify(records));
        localStorage.setItem(AAMAD_AUDIT_LOG_KEY, JSON.stringify(auditLogs));
      } catch (e) {}

      return { records, auditLogs };
    }
    return { records: [], auditLogs: [] };
  } catch (err) {
    console.warn('Network error fetching Aamad from Supabase:', err);
    return null;
  }
}

/**
 * Save / Sync Force Aamad records & audit logs to Supabase Cloud
 */
export async function saveAamadToSupabase(aamadRecords = [], auditLogs = []) {
  try {
    // 1. Immediately persist locally
    try {
      localStorage.setItem(AAMAD_STORAGE_KEY, JSON.stringify(aamadRecords));
      localStorage.setItem(AAMAD_AUDIT_LOG_KEY, JSON.stringify(auditLogs));
    } catch (e) {}

    // 2. Sync to Supabase Cloud for universal access across all devices
    const row = {
      id: CLOUD_AAMAD_ROW_ID,
      title: 'GLOBAL_FORCE_AAMAD_REGISTRY',
      subtitle: 'Universal Aamad & Rawangi Register for All Devices',
      status: 'active',
      records: aamadRecords,
      attendance_map: { auditLogs },
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(EVENTS_TABLE)
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase upsert error for Aamad:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to sync Aamad to Supabase Cloud:', err);
    return { success: false, error: err };
  }
}

/**
 * Log Duty Replacement / Substitution event to Audit Trail
 */
export async function logReplacementToAuditTrail(entry) {
  try {
    const cloud = await fetchAamadFromSupabase();
    const existingLogs = cloud?.auditLogs || [];
    const newLog = {
      id: `AUDIT-REP-${Date.now()}`,
      type: entry.replacementType || 'REPLACEMENT',
      deletedAt: new Date().toLocaleString('hi-IN'),
      deletedRecord: {
        pno: entry.oldRecord?.pno || '-',
        name: entry.oldRecord?.name || '-',
        rank: entry.oldRecord?.rank || 'का0',
        posting: entry.oldRecord?.posting || '-',
        district: entry.oldRecord?.district || '-',
        mobile: entry.oldRecord?.mobile || '-'
      },
      newRecord: {
        pno: entry.newRecord?.pno || '-',
        name: entry.newRecord?.name || '-',
        rank: entry.newRecord?.rank || 'का0',
        mobile: entry.newRecord?.mobile || '-'
      },
      remark: `${entry.reason || 'ड्यूटी प्रतिस्थानी'} (${entry.oldRecord?.name || ''} ➡️ ${entry.newRecord?.name || ''})`,
      deletedBy: entry.adminName || 'सुपर एडमिन'
    };

    const updatedLogs = [newLog, ...existingLogs];
    await saveAamadToSupabase(cloud?.records || [], updatedLogs);
    return true;
  } catch (e) {
    console.error('Error logging replacement to audit trail:', e);
    return false;
  }
}


/**
 * Subscribe to realtime changes on Force Aamad records
 */
export function subscribeToAamadRealtime(onUpdateCallback) {
  try {
    const channel = supabase
      .channel('public:force_aamad_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: EVENTS_TABLE, filter: `id=eq.${CLOUD_AAMAD_ROW_ID}` },
        async () => {
          const freshData = await fetchAamadFromSupabase();
          if (freshData) {
            onUpdateCallback(freshData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error for Aamad:', err);
    return () => {};
  }
}
