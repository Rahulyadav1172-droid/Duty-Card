// IndexedDB helper for persisting PDF Booklet files in the browser

const DB_NAME = 'PoliceDutyPortalDB';
const DB_VERSION = 1;
const STORE_NAME = 'pdf_booklets';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save PDF File to IndexedDB
 * @param {File} file - PDF File object
 * @returns {Promise<{blobUrl: string, name: string, updatedAt: string}>}
 */
export async function saveBookletPDF(file) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const pdfRecord = {
        name: file.name,
        type: file.type || 'application/pdf',
        size: file.size,
        updatedAt: new Date().toISOString(),
        data: reader.result
      };

      const request = store.put(pdfRecord, 'active_booklet_pdf');

      request.onsuccess = () => {
        const blob = new Blob([reader.result], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        resolve({ blobUrl, name: file.name, updatedAt: pdfRecord.updatedAt });
      };
      request.onerror = () => reject(request.error);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Load PDF File record from IndexedDB
 * @returns {Promise<{blobUrl: string, name: string, updatedAt: string, size: number}|null>}
 */
export async function getBookletPDF() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('active_booklet_pdf');

      request.onsuccess = () => {
        const record = request.result;
        if (record && record.data) {
          const blob = new Blob([record.data], { type: record.type || 'application/pdf' });
          const blobUrl = URL.createObjectURL(blob);
          resolve({
            blobUrl,
            name: record.name || 'Duty_Booklet.pdf',
            updatedAt: record.updatedAt,
            size: record.size
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error fetching PDF from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete PDF File from IndexedDB
 */
export async function deleteBookletPDF() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('active_booklet_pdf');

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error deleting PDF from IndexedDB:', err);
    return false;
  }
}
