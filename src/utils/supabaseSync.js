import { supabase } from './supabaseClient';
import { extractDistrictFromText } from './fileParser';

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

const DEFAULT_OFFICIAL_HELPLINES = [
  { id: '1', title: 'पुलिस कंट्रोल रूम (अयोध्या)', number: '9454417465' },
  { id: '2', title: 'पुलिस सिटी कन्ट्रोल रुम (अयोध्या)', number: '9454402648' },
  { id: '3', title: 'मेला नियंत्रण कक्ष / ड्यूटी हेल्पडेस्क', number: '9454402655' }
];

/**
 * Check connectivity to Supabase and detect status (Quota exceeded / Offline / Connected)
 */
export async function checkSupabaseHealth() {
  try {
    const { error, status } = await supabase
      .from(EVENTS_TABLE)
      .select('id')
      .limit(1);

    if (error) {
      const isQuotaExceeded = status === 402 || 
        Boolean(error.message && (error.message.includes('quota') || error.message.includes('restricted') || error.message.includes('Payment Required')));
      
      return {
        ok: false,
        status,
        isQuotaExceeded,
        message: error.message || 'Supabase error'
      };
    }
    return { ok: true, status: 200, isQuotaExceeded: false, message: 'Connected' };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      isQuotaExceeded: false,
      message: err?.message || 'Network connection failed'
    };
  }
}

/**
 * Fetch lightweight metadata for all events (excludes the multi-megabyte records column).
 * This executes in <1 second and prevents PostgreSQL statement timeouts (error 57014).
 */
export async function fetchEventsMetadataFromSupabase() {
  try {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select('id, title, subtitle, status, start_date, created_at, updated_at, signatory_text, signature_img, note, is_note_enabled, briefing, is_briefing_enabled, attendance_map')
      .not('id', 'like', 'global-%')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase metadata fetch error (will use local cache):', error.message);
      return null;
    }

    if (Array.isArray(data) && data.length > 0) {
      return data
        .filter(row => row.id !== 'global-pdf-booklets' && !String(row.id).startsWith('global-'))
        .map(row => {
          const rawExtra = row.attendance_map?._extra || {};
          const helplines = (Array.isArray(rawExtra.helplineList) && rawExtra.helplineList.length > 0)
            ? rawExtra.helplineList
            : DEFAULT_OFFICIAL_HELPLINES;

          return {
            id: row.id,
            title: row.title,
            subtitle: row.subtitle,
            startDate: row.start_date || row.created_at || '16.08.2026 से अग्रिम आदेश तक',
            status: row.status === 'archived' ? 'archived' : 'active',
            created_at: row.created_at,
            updated_at: row.updated_at || row.created_at,
            signatoryText: row.signatory_text || 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
            signatureImg: row.signature_img || '',
            note: row.note || '',
            isNoteEnabled: row.is_note_enabled ?? false,
            briefing: row.briefing || '',
            isBriefingEnabled: row.is_briefing_enabled ?? false,
            records: [], // Loaded on demand via fetchSingleEventRecords
            attendanceMap: (typeof row.attendance_map === 'object' && row.attendance_map !== null)
              ? Object.fromEntries(Object.entries(row.attendance_map).filter(([k]) => k !== '_extra'))
              : {},
            helplineList: helplines,
            isHelplineEnabled: rawExtra.isHelplineEnabled ?? true,
            customLabels: rawExtra.customLabels || {},
            attendanceByDate: rawExtra.attendanceByDate || {},
            allocationData: rawExtra.allocationData || {},
            bookletInstructions: rawExtra.bookletInstructions || [],
            manualInstructions: rawExtra.manualInstructions || rawExtra.bookletInstructions || null,
            patrank: rawExtra.patrank || ''
          };
        });
    }
    return [];
  } catch (err) {
    console.warn('Supabase network error on metadata fetch:', err);
    return null;
  }
}

/**
 * Fetch records for a single event on demand.
 */
export async function fetchSingleEventRecords(eventId) {
  if (!eventId) return null;
  try {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select('records')
      .eq('id', eventId)
      .maybeSingle();

    if (error) {
      console.warn(`Supabase fetch records error for event ${eventId}:`, error.message);
      return null;
    }

    if (data && Array.isArray(data.records)) {
      return ensureUniqueRecordIds(data.records);
    }
    return [];
  } catch (err) {
    console.warn(`Network error fetching records for event ${eventId}:`, err);
    return null;
  }
}

/**
 * 2-Tier Event Fetcher:
 * Tier 1: Fetches lightweight metadata for all events (never times out).
 * Tier 2: Fetches records for the active event (or targetActiveEventId).
 */
export async function fetchEventsFromSupabase(targetActiveEventId = null) {
  const metadataEvents = await fetchEventsMetadataFromSupabase();
  if (!metadataEvents) return null;
  if (metadataEvents.length === 0) return [];

  // Determine active event to fetch records for
  const activeEvent = (targetActiveEventId && metadataEvents.find(e => e.id === targetActiveEventId))
    || metadataEvents.find(e => e.status !== 'archived')
    || metadataEvents[0];

  if (activeEvent) {
    const records = await fetchSingleEventRecords(activeEvent.id);
    if (Array.isArray(records) && records.length > 0) {
      activeEvent.records = records;
    }
  }

  return metadataEvents;
}

/**
 * Upsert an event object to Supabase.
 */
export async function upsertEventToSupabase(eventObj) {
  try {
    const rawAttendance = eventObj.attendanceMap || {};
    const helplines = (Array.isArray(eventObj.helplineList) && eventObj.helplineList.length > 0)
      ? eventObj.helplineList
      : DEFAULT_OFFICIAL_HELPLINES;

    const attendanceMapWithExtra = {
      ...rawAttendance,
      _extra: {
        helplineList: helplines,
        isHelplineEnabled: eventObj.isHelplineEnabled !== false,
        customLabels: eventObj.customLabels || {},
        attendanceByDate: eventObj.attendanceByDate || {},
        allocationData: eventObj.allocationData || {},
        bookletInstructions: eventObj.manualInstructions || eventObj.bookletInstructions || [],
        manualInstructions: eventObj.manualInstructions || null,
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
      attendance_map: attendanceMapWithExtra,
      updated_at: new Date().toISOString()
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
 * Lightweight check: returns true ONLY if Supabase has newer events or modified timestamps.
 * Downloads only 2 columns (id, updated_at) to avoid eating database bandwidth & API quota.
 */
export async function checkIfEventsUpdated(localEvents = []) {
  try {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select('id, updated_at')
      .not('id', 'like', 'global-%');

    if (error || !Array.isArray(data)) return false;

    // If event count changed (event added or deleted)
    if (data.length !== localEvents.length) return true;

    const localMap = new Map(localEvents.map(e => [e.id, e.updated_at || e.created_at]));

    for (const row of data) {
      const localTime = localMap.get(row.id);
      if (!localTime) return true;
      if (row.updated_at && localTime) {
        if (new Date(row.updated_at).getTime() > new Date(localTime).getTime()) {
          return true;
        }
      }
    }
    return false;
  } catch (err) {
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

/**
 * Subscribe to realtime changes on Universal Master Force Pool
 */
export function subscribeToMasterForceRealtime(onUpdateCallback) {
  try {
    const channel = supabase
      .channel('public:master_force_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: EVENTS_TABLE, filter: `id=eq.${CLOUD_MASTER_FORCE_ID}` },
        async () => {
          const freshForce = await fetchMasterForceFromSupabase();
          if (freshForce && Array.isArray(freshForce)) {
            onUpdateCallback(freshForce);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Master Force Realtime subscription error:', err);
    return () => {};
  }
}

const CLOUD_ACTIVE_EVENT_STATE_ID = 'global-active-event-state';

/**
 * Fetch Global Active Event ID from Supabase Cloud
 */
export async function fetchGlobalActiveEventId() {
  try {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select('subtitle')
      .eq('id', CLOUD_ACTIVE_EVENT_STATE_ID)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch error for Active Event ID:', error.message);
      return null;
    }

    if (data && data.subtitle) {
      return data.subtitle;
    }
    return null;
  } catch (err) {
    console.warn('Network error fetching Active Event ID:', err);
    return null;
  }
}

/**
 * Save Global Active Event ID to Supabase Cloud for all devices
 */
export async function saveGlobalActiveEventId(eventId) {
  if (!eventId) return false;
  try {
    const row = {
      id: CLOUD_ACTIVE_EVENT_STATE_ID,
      title: 'GLOBAL_ACTIVE_EVENT_STATE',
      subtitle: eventId,
      status: 'active',
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(EVENTS_TABLE)
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase upsert error for Active Event ID:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Network error saving Active Event ID:', err);
    return false;
  }
}

/**
 * Subscribe to realtime changes on Global Active Event ID
 */
export function subscribeToActiveEventIdRealtime(onUpdateCallback) {
  try {
    const channel = supabase
      .channel('public:active_event_id_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: EVENTS_TABLE, filter: `id=eq.${CLOUD_ACTIVE_EVENT_STATE_ID}` },
        async () => {
          const freshId = await fetchGlobalActiveEventId();
          if (freshId) {
            onUpdateCallback(freshId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Active Event ID Realtime subscription error:', err);
    return () => {};
  }
}

/**
 * Universal Cross-Event Master Force Enrichment
 * Populates missing posting / district / pno across all events by matching mobile number or clean name.
 */
export function enrichEventsWithMasterForce(eventsList = [], masterForceList = []) {
  if (!Array.isArray(eventsList) || eventsList.length === 0) return { enrichedEvents: eventsList, hasChanges: false };

  const phoneMap = new Map();
  const nameMap = new Map();

  function registerRecord(r) {
    if (!r) return;
    const post = (r.posting || r.thana || '').trim();
    const dist = (r.district || '').trim();
    const pno = (r.pno || '').trim();
    if (!post && !dist && !pno) return;

    if (r.mobile) {
      const mob = String(r.mobile).replace(/\D/g, '').slice(-10);
      if (mob && mob.length >= 10) {
        const existing = phoneMap.get(mob) || {};
        phoneMap.set(mob, {
          posting: (post && post !== '-') ? post : existing.posting || '',
          district: (dist && dist !== '-') ? dist : existing.district || '',
          pno: (pno && pno !== '-') ? pno : existing.pno || ''
        });
      }
    }

    if (r.name) {
      const cleanN = String(r.name).trim();
      if (cleanN.length > 2) {
        const existing = nameMap.get(cleanN) || {};
        nameMap.set(cleanN, {
          posting: (post && post !== '-') ? post : existing.posting || '',
          district: (dist && dist !== '-') ? dist : existing.district || '',
          pno: (pno && pno !== '-') ? pno : existing.pno || ''
        });
      }
    }
  }

  // 1. Ingest Master Force
  if (Array.isArray(masterForceList)) {
    masterForceList.forEach(registerRecord);
  }

  // 2. Ingest records from all events
  eventsList.forEach(ev => {
    if (Array.isArray(ev.records)) {
      ev.records.forEach(registerRecord);
    }
  });

  let globalChanged = false;

  // 3. Enrich events that have missing posting / district
  const enrichedEvents = eventsList.map(ev => {
    if (!Array.isArray(ev.records) || ev.records.length === 0) return ev;
    let eventChanged = false;

    const newRecords = ev.records.map(r => {
      let posting = (r.posting || r.thana || '').trim();
      let district = (r.district || '').trim();
      let pno = (r.pno || '').trim();

      const mob = String(r.mobile || '').replace(/\D/g, '').slice(-10);
      const matched = (mob && phoneMap.get(mob)) || (r.name && nameMap.get(String(r.name).trim()));

      let modified = false;

      if ((!posting || posting === '-') && matched?.posting) {
        posting = matched.posting;
        modified = true;
      }
      if ((!district || district === '-') && matched?.district) {
        district = matched.district;
        modified = true;
      }
      if ((!pno || pno === '-') && matched?.pno) {
        pno = matched.pno;
        modified = true;
      }

      // Check if district is embedded in name or posting
      if (!district || district === '-') {
        const extracted = extractDistrictFromText(`${r.name || ''} ${posting}`);
        if (extracted) {
          district = extracted;
          modified = true;
        }
      }

      if (modified) {
        eventChanged = true;
        return {
          ...r,
          posting,
          district,
          pno: pno || r.pno
        };
      }
      return r;
    });

    if (eventChanged) {
      globalChanged = true;
      return {
        ...ev,
        records: newRecords
      };
    }
    return ev;
  });

  return { enrichedEvents, hasChanges: globalChanged };
}

