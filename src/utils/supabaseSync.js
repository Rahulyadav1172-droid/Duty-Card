import { supabase } from './supabaseClient';

const EVENTS_TABLE = 'police_events';

/**
 * Fetch all events from Supabase.
 * Returns null if Supabase table does not exist or network is unavailable.
 */
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
      return data.map(row => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        startDate: row.start_date || row.created_at || '16.08.2026 से अग्रिम आदेश तक',
        status: row.status || 'active',
        created_at: row.created_at,
        signatoryText: row.signatory_text || 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
        signatureImg: row.signature_img || '',
        note: row.note || '',
        isNoteEnabled: row.is_note_enabled ?? false,
        briefing: row.briefing || '',
        isBriefingEnabled: row.is_briefing_enabled ?? false,
        records: row.records || [],
        attendanceMap: row.attendance_map || {}
      }));
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
    const row = {
      id: eventObj.id,
      title: eventObj.title,
      subtitle: eventObj.subtitle,
      start_date: eventObj.startDate || eventObj.created_at,
      status: eventObj.status || 'active',
      signatory_text: eventObj.signatoryText,
      signature_img: eventObj.signatureImg,
      note: eventObj.note,
      is_note_enabled: eventObj.isNoteEnabled,
      briefing: eventObj.briefing,
      is_briefing_enabled: eventObj.isBriefingEnabled,
      records: eventObj.records || [],
      attendance_map: eventObj.attendanceMap || {}
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
 * Subscribe to realtime changes on police_events table.
 */
export function subscribeToEventsRealtime(onUpdateCallback) {
  try {
    const channel = supabase
      .channel('public:police_events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: EVENTS_TABLE },
        async () => {
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
