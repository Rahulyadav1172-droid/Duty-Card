// High-Reliability PDF Booklet Storage with Supabase Cloud Sync & Local IndexedDB Cache

import { supabase } from './supabaseClient';

const DB_NAME = 'PoliceDutyPortalDB';
const DB_VERSION = 2;
const STORE_NAME = 'pdf_booklets_list';
const CLOUD_PDF_ROW_ID = 'global-pdf-booklets';
const EVENTS_TABLE = 'police_events';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Convert ArrayBuffer to Base64 String
 */
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Convert Base64 String to Blob
 */
function base64ToBlob(base64, mimeType = 'application/pdf') {
  try {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  } catch (e) {
    console.error('Error converting base64 to blob:', e);
    return null;
  }
}

/**
 * Fetch all PDF booklets from Supabase Cloud
 */
async function fetchCloudPDFs() {
  try {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select('records')
      .eq('id', CLOUD_PDF_ROW_ID)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching cloud PDFs (will use local cache):', error.message);
      return null;
    }

    if (data && Array.isArray(data.records) && data.records.length > 0) {
      return data.records;
    }
    return [];
  } catch (err) {
    console.warn('Network error fetching cloud PDFs:', err);
    return null;
  }
}

/**
 * Save / Sync list of PDFs to Supabase Cloud
 */
async function syncPDFsToCloud(pdfRecords) {
  try {
    const row = {
      id: CLOUD_PDF_ROW_ID,
      title: 'GLOBAL_PDF_REGISTRY',
      subtitle: 'Uploaded Booklet PDFs for All Devices',
      status: 'active',
      records: pdfRecords,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(EVENTS_TABLE)
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('Error syncing PDF to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Network error saving PDF to Supabase:', err);
    return false;
  }
}

/**
 * Save / Add PDF File to Cloud and Local IndexedDB
 * @param {File} file - PDF File object
 * @returns {Promise<Object>}
 */
export async function saveBookletPDF(file) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const id = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const base64Data = arrayBufferToBase64(reader.result);

        const pdfRecord = {
          id,
          name: file.name,
          type: file.type || 'application/pdf',
          size: file.size,
          updatedAt: new Date().toISOString(),
          base64: base64Data
        };

        // 1. Save to Local IndexedDB Cache
        try {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          store.put({
            id,
            name: file.name,
            type: file.type || 'application/pdf',
            size: file.size,
            updatedAt: pdfRecord.updatedAt,
            data: reader.result
          });
        } catch (dbErr) {
          console.warn('IndexedDB write error:', dbErr);
        }

        // 2. Sync to Supabase Cloud (Across all devices)
        const currentCloud = (await fetchCloudPDFs()) || [];
        const updatedCloudList = [pdfRecord, ...currentCloud.filter(p => p.name !== file.name)];
        await syncPDFsToCloud(updatedCloudList);

        // 3. Create active Blob URL for immediate preview
        const blob = new Blob([reader.result], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        resolve({
          id,
          url: blobUrl,
          blobUrl,
          name: file.name,
          updatedAt: pdfRecord.updatedAt,
          size: file.size
        });
      } catch (e) {
        reject(e);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Load all PDF files across all devices (Cloud first, IndexedDB fallback)
 * @returns {Promise<Array<Object>>}
 */
export async function getAllBookletPDFs() {
  try {
    // 1. First attempt to load from Supabase Cloud (Universal across devices)
    const cloudRecords = await fetchCloudPDFs();

    if (Array.isArray(cloudRecords) && cloudRecords.length > 0) {
      const formattedCloud = cloudRecords.map((record) => {
        let blob = null;
        if (record.base64) {
          blob = base64ToBlob(record.base64, record.type || 'application/pdf');
        }

        const blobUrl = blob ? URL.createObjectURL(blob) : null;
        return {
          id: record.id,
          url: blobUrl,
          blobUrl,
          name: record.name || 'Duty_Booklet.pdf',
          updatedAt: record.updatedAt,
          size: record.size
        };
      }).filter(p => Boolean(p.blobUrl));

      if (formattedCloud.length > 0) {
        return formattedCloud;
      }
    }

    // 2. Fallback to Local IndexedDB
    const db = await openDB();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const records = request.result || [];
          const formatted = records.map((record) => {
            const blob = new Blob([record.data], { type: record.type || 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            return {
              id: record.id,
              url: blobUrl,
              blobUrl,
              name: record.name || 'Duty_Booklet.pdf',
              updatedAt: record.updatedAt,
              size: record.size
            };
          });
          resolve(formatted);
        };

        request.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  } catch (err) {
    console.error('Error fetching booklet PDFs:', err);
    return [];
  }
}

/**
 * Delete a specific PDF File by ID from Cloud & IndexedDB
 * @param {string} id
 */
export async function deleteBookletPDFById(id) {
  try {
    // 1. Delete from Supabase Cloud
    const currentCloud = (await fetchCloudPDFs()) || [];
    const updatedCloud = currentCloud.filter(p => p.id !== id);
    await syncPDFsToCloud(updatedCloud);

    // 2. Delete from Local IndexedDB
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);

    return true;
  } catch (err) {
    console.error('Error deleting PDF from storage:', err);
    return false;
  }
}

/**
 * Subscribe to realtime cloud PDF updates
 */
export function subscribeToCloudPDFs(onUpdateCallback) {
  try {
    const channel = supabase
      .channel('public:police_pdf_booklets_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: EVENTS_TABLE, filter: `id=eq.${CLOUD_PDF_ROW_ID}` },
        async () => {
          const freshPDFs = await getAllBookletPDFs();
          onUpdateCallback(freshPDFs);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime PDF subscription error:', err);
    return () => {};
  }
}

// Backwards compatibility wrappers
export async function getBookletPDF() {
  const all = await getAllBookletPDFs();
  return all.length > 0 ? all[0] : null;
}

export async function deleteBookletPDF() {
  const all = await getAllBookletPDFs();
  for (const pdf of all) {
    await deleteBookletPDFById(pdf.id);
  }
  return true;
}
