/**
 * Official Uttar Pradesh Police Hierarchy: 8 Police Zones, 18 Police Ranges & 75 Districts
 * Designed for automatic standardization, validation, and zero-mismatch data entry.
 */

export const UP_POLICE_ZONES = [
  'लखनऊ जोन',
  'कानपुर जोन',
  'मेरठ जोन',
  'बरेली जोन',
  'आगरा जोन',
  'वाराणसी जोन',
  'प्रयागराज जोन',
  'गोरखपुर जोन'
];

export const UP_POLICE_RANGES = [
  // 1. लखनऊ जोन
  { name: 'लखनऊ रेंज', zone: 'लखनऊ जोन', districts: ['लखनऊ', 'रायबरेली', 'सीतापुर', 'हरदोई', 'लखीमपुर खीरी', 'उन्नाव'] },
  { name: 'अयोध्या रेंज', zone: 'लखनऊ जोन', districts: ['अयोध्या', 'सुल्तानपुर', 'अंबेडकर नगर', 'बाराबंकी', 'अमेठी'] },
  { name: 'देवीपाटन रेंज', zone: 'लखनऊ जोन', districts: ['गोंडा', 'बहराइच', 'श्रावस्ती', 'बलरामपुर'] },

  // 2. कानपुर जोन
  { name: 'कानपुर रेंज', zone: 'कानपुर जोन', districts: ['कानपुर नगर', 'कानपुर देहात', 'औरैया', 'फतेहगढ़', 'कन्नौज', 'इटावा'] },
  { name: 'झांसी रेंज', zone: 'कानपुर जोन', districts: ['झांसी', 'जालौन', 'ललितपुर'] },
  { name: 'बांदा रेंज', zone: 'कानपुर जोन', districts: ['बांदा', 'हमीरपुर', 'महोबा', 'चित्रकूट'] },

  // 3. मेरठ जोन
  { name: 'मेरठ रेंज', zone: 'मेरठ जोन', districts: ['मेरठ', 'गाजियाबाद', 'गौतमबुद्ध नगर (नोएडा)', 'बुलंदशहर', 'बागपत', 'हापुड़'] },
  { name: 'सहारनपुर रेंज', zone: 'मेरठ जोन', districts: ['सहारनपुर', 'मुजफ्फरनगर', 'शामली'] },

  // 4. बरेली जोन
  { name: 'बरेली रेंज', zone: 'बरेली जोन', districts: ['बरेली', 'बदायूं', 'पीलीभीत', 'शाहजहांपुर'] },
  { name: 'मुरादाबाद रेंज', zone: 'बरेली जोन', districts: ['मुरादाबाद', 'बिजनौर', 'अमरोहा', 'रामपुर', 'संभल'] },

  // 5. आगरा जोन
  { name: 'आगरा रेंज', zone: 'आगरा जोन', districts: ['आगरा', 'मथुरा', 'फिरोजाबाद', 'मैनपुरी'] },
  { name: 'अलीगढ़ रेंज', zone: 'आगरा जोन', districts: ['अलीगढ़', 'हाथरस', 'एटा', 'कासगंज'] },

  // 6. वाराणसी जोन
  { name: 'वाराणसी रेंज', zone: 'वाराणसी जोन', districts: ['वाराणसी', 'चंदौली', 'गाजीपुर', 'जौनपुर'] },
  { name: 'मीरजापुर रेंज', zone: 'वाराणसी जोन', districts: ['मीरजापुर', 'भदोही', 'सोनभद्र'] },
  { name: 'आजमगढ़ रेंज', zone: 'वाराणसी जोन', districts: ['आजमगढ़', 'मऊ', 'बलिया'] },

  // 7. प्रयागराज जोन
  { name: 'प्रयागराज रेंज', zone: 'प्रयागराज जोन', districts: ['प्रयागराज', 'फतेहपुर', 'कौशाम्बी', 'प्रतापगढ़'] },
  { name: 'चित्रकूटधाम रेंज', zone: 'प्रयागराज जोन', districts: ['चित्रकूट', 'बांदा', 'हमीरपुर', 'महोबा'] },

  // 8. गोरखपुर जोन
  { name: 'गोरखपुर रेंज', zone: 'गोरखपुर जोन', districts: ['गोरखपुर', 'देवरिया', 'कुशीनगर', 'महराजगंज'] },
  { name: 'बस्ती रेंज', zone: 'गोरखपुर जोन', districts: ['बस्ती', 'संतकबीर नगर', 'सिद्धार्थनगर'] }
];

export const STANDARD_RANKS = [
  { value: 'का०', label: 'का० (आरक्षी / Constable)' },
  { value: 'म०का०', label: 'म०का० (महिला आरक्षी / Lady Constable)' },
  { value: 'हे०का०', label: 'हे०का० (मुख्य आरक्षी / Head Constable)' },
  { value: 'उ०नि०', label: 'उ०नि० (उप निरीक्षक / Sub Inspector)' },
  { value: 'म०उ०नि०', label: 'म०उ०नि० (महिला उप निरीक्षक / WSI)' },
  { value: 'नि०', label: 'नि० (निरीक्षक / Inspector)' },
  { value: 'यातायात', label: 'यातायात (Traffic Police)' },
  { value: 'होमगार्ड', label: 'होमगार्ड (Home Guard / PRD)' },
  { value: 'अन्य', label: 'अन्य पुलिस बल' }
];

/**
 * Standardize PNO: strips spaces, dashes, prefixes like PNO: or pno, and makes uppercase
 */
export function standardizePNO(raw = '') {
  if (!raw) return '';
  let str = String(raw).trim();
  str = str.replace(/^(?:pno|p\.no\.|p_no|pno:)\s*/i, '');
  str = str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return str;
}

/**
 * Standardize Mobile Number: extracts 10 digits
 */
export function standardizeMobile(raw = '') {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits.slice(-10) || digits;
}

/**
 * Standardize Rank Designation into Official UP Police Abbreviation
 */
export function standardizeRank(raw = '') {
  if (!raw) return 'का०';
  const str = String(raw).trim().toLowerCase();
  
  if (/^(?:म०उ०नि०|म0उ0नि0|wsi|women\s*si|lady\s*sub|महिला\s*दरोगा|महिला\s*उप)/i.test(str)) {
    return 'म०उ०नि०';
  }
  if (/^(?:उ०नि०|उ0नि0|si|sub\s*inspector|दरोगा|उप\s*निरीक्षक|उपनिरीक्षक)/i.test(str)) {
    return 'उ०नि०';
  }
  if (/^(?:म०का०|म0का0|wcp|wconst|women\s*const|lady\s*const|महिला\s*आरक्षी|महिला\s*का)/i.test(str)) {
    return 'म०का०';
  }
  if (/^(?:हे०का०|हे0का0|hc|head\s*const|मुख्य\s*आरक्षी|हेड\s*कांस्टेबल|दीवान)/i.test(str)) {
    return 'हे०का०';
  }
  if (/^(?:नि०|नि0|insp|inspector|प्रभारी\s*निरीक्षक|कोतवाल|निरीक्षक)/i.test(str)) {
    return 'नि०';
  }
  if (/^(?:यातायात|traffic|tsi|tp|यातायात\s*पुलिस)/i.test(str)) {
    return 'यातायात';
  }
  if (/^(?:होमगार्ड|hg|prd|home\s*guard)/i.test(str)) {
    return 'होमगार्ड';
  }
  if (/^(?:का०|का0|cp|const|constable|आरक्षी|कांस्टेबल)/i.test(str)) {
    return 'का०';
  }
  
  return raw.trim() || 'का०';
}

/**
 * Standardize Officer Name: strips embedded mobile numbers, duplicate rank prefixes
 */
export function standardizeName(raw = '', mobile = '') {
  if (!raw) return '';
  let str = String(raw).trim();
  
  // Strip 10 digit mobile numbers
  str = str.replace(/\b[6-9]\d{9}\b/g, '');
  if (mobile) {
    str = str.replace(new RegExp(`\\b${mobile}\\b`, 'g'), '');
  }

  // Strip rank prefixes like (का0), (उ0नि0), etc.
  str = str.replace(/\(\s*(?:का0|उ0नि0|हे0का0|नि0|म0का0|म0उ0नि0|का०|उ०नि०|हे०का०|नि०|म०का०|कां०|हेकां|जवान)\s*\)/gi, '');
  str = str.replace(/^(?:का0|उ0नि0|हे0का0|नि0|म0का0|म0उ0नि0|का०|उ०नि०|हे०का०|नि०|म०का०|constable|si|hc|insp)\s+/gi, '');

  // Remove comma trails
  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    str = parts[0];
  }

  return str.replace(/,\s*,/g, ',').replace(/\s*,\s*$/, '').replace(/^[\s,]+/, '').trim();
}

/**
 * Auto-resolve Zone and Range from District Name
 */
export function resolveZoneAndRangeFromDistrict(districtName = '') {
  if (!districtName) return { range: '', zone: '' };
  const dClean = String(districtName).trim().toLowerCase();

  for (const r of UP_POLICE_RANGES) {
    const match = r.districts.some(d => {
      const target = d.toLowerCase();
      return target === dClean || dClean.includes(target) || target.includes(dClean);
    });
    if (match) {
      return { range: r.name, zone: r.zone };
    }
  }

  return { range: '', zone: '' };
}
