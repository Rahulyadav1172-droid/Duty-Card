import { supabase } from './supabaseClient';

const EVENTS_TABLE = 'police_events';
const CLOUD_MASTER_FORCE_ID = 'global-master-force-registry';
const CLOUD_AUTH_CONFIG_ID = 'global-auth-config-registry';

/**
 * Fetch all events from Supabase.
 * Returns null if Supabase table does not exist or network is unavailable.
 */
function ensureUniqueRecordIds(records = []) {
  if (!Array.isArray(records) || records.length === 0) return [];
  const seen = new Set();
  let hasDuplicates = false;
  for (const r of records) {
    if (!r.id || seen.has(r.id)) {
      hasDuplicates = true;
      break;
    }
    seen.add(r.id);
  }

  if (!hasDuplicates) return records;

  return records.map((r, idx) => ({
    ...r,
    id: `DUTY-${String(idx + 1).padStart(4, '0')}`
  }));
}

export async function fetchEventsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error (will use local cache):', error.message);
      return null;
    }

    if (Array.isArray(data) && data.length > 0) {
      return data
        .filter(row => row.id !== 'global-pdf-booklets' && !String(row.id).startsWith('global-'))
        .map(row => {
          const rawExtra = row.attendance_map?._extra || {};
          return {
            id: row.id,
            title: row.title,
            subtitle: row.subtitle,
            startDate: row.start_date || row.created_at || '16.08.2026 से अग्रिम आदेश तक',
            status: row.status === 'archived' ? 'archived' : 'active',
            created_at: row.created_at,
            signatoryText: row.signatory_text || 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
            signatureImg: row.signature_img || '',
            note: row.note || '',
            isNoteEnabled: row.is_note_enabled ?? false,
            briefing: row.briefing || '',
            isBriefingEnabled: row.is_briefing_enabled ?? false,
            records: ensureUniqueRecordIds(row.records || []),
            attendanceMap: (typeof row.attendance_map === 'object' && row.attendance_map !== null)
              ? Object.fromEntries(Object.entries(row.attendance_map).filter(([k]) => k !== '_extra'))
              : {},
            helplineList: rawExtra.helplineList || [],
            isHelplineEnabled: rawExtra.isHelplineEnabled ?? true,
            customLabels: rawExtra.customLabels || {},
            attendanceByDate: rawExtra.attendanceByDate || {},
            allocationData: rawExtra.allocationData || {},
            bookletInstructions: rawExtra.bookletInstructions || [],
            patrank: rawExtra.patrank || ''
          };
        });
    }
    return [];
  } catch (err) {
    console.warn('Supabase network error:', err);
    return null;
  }
}

/**
 * Upsert an event object to Supabase.
 */
export async function upsertEventToSupabase(eventObj) {
  try {
    const rawAttendance = eventObj.attendanceMap || {};
    const attendanceMapWithExtra = {
      ...rawAttendance,
      _extra: {
        helplineList: eventObj.helplineList || [],
        isHelplineEnabled: eventObj.isHelplineEnabled !== false,
        customLabels: eventObj.customLabels || {},
        attendanceByDate: eventObj.attendanceByDate || {},
        allocationData: eventObj.allocationData || {},
        bookletInstructions: eventObj.bookletInstructions || [],
        patrank: eventObj.patrank || ''
      }
    };

    const row = {
      id: eventObj.id,
      title: eventObj.title,
      subtitle: eventObj.subtitle,
      start_date: eventObj.startDate || eventObj.created_at,
      status: eventObj.status === 'archived' ? 'archived' : 'active',
      signatory_text: eventObj.signatoryText,
      signature_img: eventObj.signatureImg,
      note: eventObj.note,
      is_note_enabled: eventObj.isNoteEnabled,
      briefing: eventObj.briefing,
      is_briefing_enabled: eventObj.isBriefingEnabled,
      records: eventObj.records || [],
      attendance_map: attendanceMapWithExtra
    };

    const { error } = await supabase
      .from(EVENTS_TABLE)
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase upsert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save error:', err);
    return false;
  }
}

/**
 * Delete an event from Supabase.
 */
export async function deleteEventFromSupabase(eventId) {
  try {
    const { error } = await supabase
      .from(EVENTS_TABLE)
      .delete()
      .eq('id', eventId);

    if (error) {
      console.warn('Supabase delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase delete error:', err);
    return false;
  }
}

/**
 * Fetch Universal Master Force Pool from Supabase
 */
export async function fetchMasterForceFromSupabase() {
  try {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select('records')
      .eq('id', CLOUD_MASTER_FORCE_ID)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch error for Master Force (using local):', error.message);
      return null;
    }

    if (data && Array.isArray(data.records)) {
      return data.records;
    }
    return null;
  } catch (err) {
    console.warn('Network error fetching Master Force from Supabase:', err);
    return null;
  }
}

/**
 * Save Universal Master Force Pool to Supabase
 */
export async function saveMasterForceToSupabase(forceRecords = []) {
  try {
    const row = {
      id: CLOUD_MASTER_FORCE_ID,
      title: 'GLOBAL_MASTER_FORCE_REGISTRY',
      subtitle: 'Master Police Personnel Pool for All Events',
      status: 'active',
      records: forceRecords,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(EVENTS_TABLE)
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase upsert error for Master Force:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Network error saving Master Force:', err);
    return false;
  }
}

/**
 * Fetch Universal Auth Config from Supabase
 */
export async function fetchAuthConfigFromSupabase() {
  try {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select('attendance_map')
      .eq('id', CLOUD_AUTH_CONFIG_ID)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch error for Auth Config:', error.message);
      return null;
    }

    if (data && data.attendance_map && data.attendance_map.authConfig) {
      return data.attendance_map.authConfig;
    }
    return null;
  } catch (err) {
    console.warn('Network error fetching Auth Config:', err);
    return null;
  }
}

/**
 * Save Universal Auth Config to Supabase
 */
export async function saveAuthConfigToSupabase(authConfig) {
  try {
    const row = {
      id: CLOUD_AUTH_CONFIG_ID,
      title: 'GLOBAL_AUTH_CONFIG_REGISTRY',
      subtitle: 'Universal Admin & Senior Officer Credentials',
      status: 'active',
      attendance_map: { authConfig },
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(EVENTS_TABLE)
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase upsert error for Auth Config:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Network error saving Auth Config:', err);
    return false;
  }
}

/**
 * Subscribe to realtime changes on police_events table.
 */
export function subscribeToEventsRealtime(onUpdateCallback) {
  try {
    const channel = supabase
      .channel('public:police_events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: EVENTS_TABLE },
        async (payload) => {
          // If master force row updated
          if (payload?.new?.id === CLOUD_MASTER_FORCE_ID) {
            // Handled by master force listener
            return;
          }
          // If auth row updated
          if (payload?.new?.id === CLOUD_AUTH_CONFIG_ID) {
            return;
          }

          const freshData = await fetchEventsFromSupabase();
          if (freshData && freshData.length > 0) {
            onUpdateCallback(freshData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}

