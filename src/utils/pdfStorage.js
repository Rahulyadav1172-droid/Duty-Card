// IndexedDB helper for persisting Multiple PDF Booklet files in the browser

const DB_NAME = 'PoliceDutyPortalDB';
const DB_VERSION = 2; // Incremented for multi-pdf list store
const STORE_NAME = 'pdf_booklets_list';

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
 * Save / Add PDF File to IndexedDB
 * @param {File} file - PDF File object
 * @returns {Promise<Object>}
 */
export async function saveBookletPDF(file) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const id = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const pdfRecord = {
          id,
          name: file.name,
          type: file.type || 'application/pdf',
          size: file.size,
          updatedAt: new Date().toISOString(),
          data: reader.result
        };

        const request = store.put(pdfRecord);

        request.onsuccess = () => {
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
        };
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Load all PDF files from IndexedDB
 * @returns {Promise<Array<Object>>}
 */
export async function getAllBookletPDFs() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
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
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error fetching PDFs from IndexedDB:', err);
    return [];
  }
}

/**
 * Delete a specific PDF File by ID
 * @param {string} id
 */
export async function deleteBookletPDFById(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error deleting PDF from IndexedDB:', err);
    return false;
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
