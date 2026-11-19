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
 * Transform database row into normalized Event object.
 */
function transformEventRow(row, withRecords = false) {
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
    records: withRecords && Array.isArray(row.records) ? ensureUniqueRecordIds(row.records) : [],
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
        .map(row => transformEventRow(row, false));
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
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { data, error } = await supabase
        .from(EVENTS_TABLE)
        .select('records')
        .eq('id', eventId)
        .maybeSingle();

      if (error) {
        console.warn(`Supabase fetch records error for event ${eventId} (attempt ${attempt}):`, error.message);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 800));
          continue;
        }
        return null;
      }

      if (data && Array.isArray(data.records)) {
        return ensureUniqueRecordIds(data.records);
      }
      return [];
    } catch (err) {
      console.warn(`Network error fetching records for event ${eventId}:`, err);
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 800));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * High-Reliability Multi-Event Fetcher:
 * 1. Fetches ALL active events WITH full records (Panch Kosi + 14 Kosi in ~1.2s).
 * 2. Fetches archived events metadata (200ms).
 * 3. If targetActiveEventId is an archived event, also fetches its records on demand.
 * 4. Implements 3-attempt exponential retry to survive Supabase cold starts without failing.
 */
export async function fetchEventsFromSupabase(targetActiveEventId = null) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        supabase
          .from(EVENTS_TABLE)
          .select('*')
          .eq('status', 'active')
          .not('id', 'like', 'global-%')
          .order('created_at', { ascending: false }),
        supabase
          .from(EVENTS_TABLE)
          .select('id, title, subtitle, status, start_date, created_at, updated_at, signatory_text, signature_img, note, is_note_enabled, briefing, is_briefing_enabled, attendance_map')
          .eq('status', 'archived')
          .not('id', 'like', 'global-%')
          .order('created_at', { ascending: false })
      ]);

      if (activeRes.error) throw activeRes.error;
      if (archivedRes.error) throw archivedRes.error;

      const activeEvents = (activeRes.data || [])
        .filter(row => row.id !== 'global-pdf-booklets' && !String(row.id).startsWith('global-'))
        .map(row => transformEventRow(row, true));

      const archivedEvents = (archivedRes.data || [])
        .filter(row => row.id !== 'global-pdf-booklets' && !String(row.id).startsWith('global-'))
        .map(row => transformEventRow(row, false));

      const allEvents = [...activeEvents, ...archivedEvents];

      // If target event is in archived list, load its records on demand
      if (targetActiveEventId) {
        const targetArchived = archivedEvents.find(e => e.id === targetActiveEventId);
        if (targetArchived && (!Array.isArray(targetArchived.records) || targetArchived.records.length === 0)) {
          const recs = await fetchSingleEventRecords(targetActiveEventId);
          if (Array.isArray(recs) && recs.length > 0) {
            targetArchived.records = recs;
          }
        }
      }

      return allEvents;
    } catch (err) {
      console.warn(`fetchEventsFromSupabase attempt ${attempt} notice:`, err.message || err);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 1000));
      } else {
        // Fall back to metadata-only fetch if parallel query failed
        console.warn('Falling back to metadata-only event fetch...');
        const fallback = await fetchEventsMetadataFromSupabase();
        return fallback;
      }
    }
  }
  return null;
}

/**
 * Upsert an event object to Supabase with automatic retry.
 */
export async function upsertEventToSupabase(eventObj) {
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

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { error } = await supabase
        .from(EVENTS_TABLE)
        .upsert(row, { onConflict: 'id' });

      if (error) {
        console.warn(`Supabase upsert error (attempt ${attempt}):`, error.message);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 1000));
          continue;
        }
        return false;
      }
      return true;
    } catch (err) {
      console.warn(`Supabase save error (attempt ${attempt}):`, err);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 1000));
        continue;
      }
      return false;
    }
  }
  return false;
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
          // If any global registry row updated (master force, auth, visitor counter, active event id, booklets)
          if (payload?.new?.id && String(payload.new.id).startsWith('global-')) {
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

const CLOUD_VISITOR_COUNTER_ID = 'global-visitor-counter';
const DEFAULT_BASELINE_VISITS = 10427;
const DEFAULT_BASELINE_UNIQUE = 8121;
const VISITOR_CACHE_KEY = 'ayodhya_police_visitor_count';
const VISITOR_SESSION_KEY = 'ayodhya_police_visited_session';
const VISITOR_DEVICE_KEY = 'ayodhya_police_unique_visitor_id';

/**
 * Fetch current Visitor Counter from Supabase Cloud with local fallback
 */
export async function fetchVisitorCountFromSupabase() {
  let fallback = { totalVisits: DEFAULT_BASELINE_VISITS, uniqueVisitors: DEFAULT_BASELINE_UNIQUE };
  try {
    const cached = localStorage.getItem(VISITOR_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (typeof parsed?.totalVisits === 'number') {
        fallback = parsed;
      }
    }
  } catch (e) {}

  try {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select('id, subtitle, attendance_map')
      .eq('id', CLOUD_VISITOR_COUNTER_ID)
      .maybeSingle();

    if (error || !data) {
      return fallback;
    }

    let totalVisits = fallback.totalVisits;
    let uniqueVisitors = fallback.uniqueVisitors;

    if (data.attendance_map && typeof data.attendance_map.totalVisits === 'number') {
      totalVisits = data.attendance_map.totalVisits;
      uniqueVisitors = data.attendance_map.uniqueVisitors || uniqueVisitors;
    } else if (data.subtitle && !isNaN(Number(data.subtitle))) {
      totalVisits = Number(data.subtitle);
    }

    const result = { totalVisits, uniqueVisitors };
    try {
      localStorage.setItem(VISITOR_CACHE_KEY, JSON.stringify(result));
    } catch (e) {}

    return result;
  } catch (err) {
    return fallback;
  }
}

/**
 * Record a new visitor session and increment count in Supabase
 */
export async function recordVisitorSessionToSupabase() {
  let fallback = { totalVisits: DEFAULT_BASELINE_VISITS, uniqueVisitors: DEFAULT_BASELINE_UNIQUE };
  try {
    const cached = localStorage.getItem(VISITOR_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (typeof parsed?.totalVisits === 'number') {
        fallback = parsed;
      }
    }
  } catch (e) {}

  try {
    const alreadyVisitedSession = sessionStorage.getItem(VISITOR_SESSION_KEY);
    if (alreadyVisitedSession) {
      // Just fetch latest count
      return await fetchVisitorCountFromSupabase();
    }

    // Mark current session as visited
    sessionStorage.setItem(VISITOR_SESSION_KEY, 'true');

    // Check if new unique device
    let isNewUnique = false;
    let deviceId = localStorage.getItem(VISITOR_DEVICE_KEY);
    if (!deviceId) {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(VISITOR_DEVICE_KEY, deviceId);
      isNewUnique = true;
    }

    // Fetch current count to increment
    const current = await fetchVisitorCountFromSupabase();
    const nextTotal = (current.totalVisits || DEFAULT_BASELINE_VISITS) + 1;
    const nextUnique = isNewUnique ? ((current.uniqueVisitors || DEFAULT_BASELINE_UNIQUE) + 1) : (current.uniqueVisitors || DEFAULT_BASELINE_UNIQUE);

    const row = {
      id: CLOUD_VISITOR_COUNTER_ID,
      title: 'GLOBAL_VISITOR_COUNTER',
      subtitle: String(nextTotal),
      status: 'active',
      attendance_map: {
        totalVisits: nextTotal,
        uniqueVisitors: nextUnique,
        lastVisitedAt: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    };

    // Upsert with retry
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { error } = await supabase
        .from(EVENTS_TABLE)
        .upsert(row, { onConflict: 'id' });
      if (!error) break;
      if (attempt < 2) await new Promise(r => setTimeout(r, 600));
    }

    const updatedResult = { totalVisits: nextTotal, uniqueVisitors: nextUnique };
    try {
      localStorage.setItem(VISITOR_CACHE_KEY, JSON.stringify(updatedResult));
    } catch (e) {}

    return updatedResult;
  } catch (err) {
    console.warn('Visitor counter recording error:', err);
    return fallback;
  }
}

/**
 * Subscribe to realtime changes on Visitor Counter across all devices
 */
export function subscribeToVisitorCounterRealtime(onUpdateCallback) {
  try {
    const channel = supabase
      .channel('public:visitor_counter_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: EVENTS_TABLE, filter: `id=eq.${CLOUD_VISITOR_COUNTER_ID}` },
        (payload) => {
          if (payload?.new) {
            const raw = payload.new;
            let totalVisits = null;
            let uniqueVisitors = null;
            if (raw.attendance_map && typeof raw.attendance_map.totalVisits === 'number') {
              totalVisits = raw.attendance_map.totalVisits;
              uniqueVisitors = raw.attendance_map.uniqueVisitors;
            } else if (raw.subtitle && !isNaN(Number(raw.subtitle))) {
              totalVisits = Number(raw.subtitle);
            }
            if (totalVisits !== null) {
              onUpdateCallback({ totalVisits, uniqueVisitors });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Visitor counter realtime subscription error:', err);
    return () => {};
  }
}

