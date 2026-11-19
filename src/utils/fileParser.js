import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { convertKrutiToUnicode } from './kruti2unicode.js';
import { resolvePoliceRank } from './rankResolver.js';

export function cleanMobileNumber(text) {
  if (!text) return "";
  const str = String(text).trim();
  if (str.includes('E+') || str.includes('e+')) {
    const num = Number(str);
    if (!isNaN(num)) {
      return String(Math.round(num));
    }
  }
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export const UP_DISTRICTS = [
  'अयोध्या', 'लखनऊ', 'बाराबंकी', 'हरदोई', 'सीतापुर', 'लखीमपुर खीरी', 'लखीमपुर', 'खीरी', 'उन्नाव', 'रायबरेली', 
  'सुल्तानपुर', 'अंबेडकर नगर', 'अंबेडकरनगर', 'अमेठी', 'गोंडा', 'बहराइच', 'श्रावस्ती', 'बलरामपुर', 
  'कानपुर नगर', 'कानपुर देहात', 'कानपुर', 'औरैया', 'फतेहगढ़', 'कन्नौज', 'इटावा', 'झांसी', 'जालौन', 'ललितपुर', 
  'बांदा', 'हमीरपुर', 'महोबा', 'चित्रकूट', 'मेरठ', 'गाजियाबाद', 'नोएडा', 'बुलंदशहर', 'बागपत', 'हापुड़', 
  'सहारनपुर', 'मुजफ्फरनगर', 'शामली', 'बरेली', 'बदायूं', 'पीलीभीत', 'शाहजहांपुर', 
  'मुरादाबाद', 'बिजनौर', 'अमरोहा', 'रामपुर', 'संभल', 'आगरा', 'मथुरा', 'फिरोजाबाद', 'मैनपुरी', 
  'अलीगढ़', 'हाथरस', 'एटा', 'कासगंज', 'वाराणसी', 'चंदौली', 'गाजीपुर', 'जौनपुर', 
  'मीरजापुर', 'मिर्जापुर', 'भदोही', 'सोनभद्र', 'आजमगढ़', 'मऊ', 'बलिया', 
  'प्रयागराज', 'इलाहाबाद', 'कौशाम्बी', 'प्रतापगढ़', 'फतेहपुर', 'गोरखपुर', 'देवरिया', 'कुशीनगर', 'महराजगंज', 
  'महाराजगंज', 'बस्ती', 'सिद्धार्थनगर', 'संतकबीरनगर'
];

export function extractDistrictFromText(text = '') {
  if (!text) return '';
  const s = String(text);
  for (const d of UP_DISTRICTS) {
    if (s.includes(d)) return d;
  }
  return '';
}

/**
 * Unmerges all merged cell ranges in an XLSX worksheet and replicates the primary cell's
 * value to all cells across the merged span (both rows and columns).
 * This ensures no downstream row or column receives blank/undefined data due to merged headers or merged rows.
 */
export function unmergeAndFillWorksheet(worksheet) {
  if (!worksheet || !worksheet['!merges'] || !Array.isArray(worksheet['!merges'])) return worksheet;

  worksheet['!merges'].forEach(range => {
    const startAddress = XLSX.utils.encode_cell(range.s);
    const startCell = worksheet[startAddress];
    if (!startCell || startCell.v === undefined || startCell.v === null || String(startCell.v).trim() === '') return;

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        if (R === range.s.r && C === range.s.c) continue;
        const targetAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[targetAddress] || worksheet[targetAddress].v === undefined || worksheet[targetAddress].v === '') {
          worksheet[targetAddress] = { ...startCell };
        }
      }
    }
  });

  return worksheet;
}

/**
 * Parses composite or merged officer details string (e.g. "name posting dist mob" column)
 * Extracts 10-digit mobile number, district, posting/thana, and clean officer name & rank.
 */
export function parseCompositeOfficerDetails(compositeStr = '') {
  if (!compositeStr) return { name: '', mobile: '', posting: '', district: '' };

  const raw = String(compositeStr).trim();
  let text = raw;

  // 1. Extract 10-digit mobile number
  let mobile = '';
  const mobMatch = text.match(/\b([6-9]\d{9})\b/);
  if (mobMatch) {
    mobile = mobMatch[1];
    text = text.replace(mobMatch[0], ' ');
  }

  // 2. Extract District from UP_DISTRICTS
  let district = '';
  for (const d of UP_DISTRICTS) {
    if (text.includes(d)) {
      district = d;
      break;
    }
  }

  // 3. Extract Posting & Clean Name
  let name = '';
  let posting = '';

  const parts = text.split(/[,।]/).map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    name = parts[0];
    const otherParts = parts.slice(1).filter(p => !district || (p !== district && p !== `जनपद ${district}`));
    if (otherParts.length > 0) {
      posting = otherParts.join(', ');
    }
  } else {
    // Space-separated: look for thana/unit keywords
    const thanaMatch = text.match(/(?:थाना|को०|को0|कोतवाली|चौकी|वाहिनी|पीएसी|यातायात|प्र0|प्र०|सेल|शाखा)\s*[^,\n]*/i);
    if (thanaMatch) {
      let matchedThana = thanaMatch[0].trim();
      if (district && matchedThana.includes(district)) {
        matchedThana = matchedThana.replace(new RegExp(`(?:जनपद\\s*)?${district}`, 'gi'), '').trim();
      }
      posting = matchedThana;
      name = text.replace(thanaMatch[0], ' ').trim();
    } else {
      if (district) {
        name = text.replace(new RegExp(`(?:जनपद\\s*)?${district}`, 'gi'), ' ').trim();
        if (!posting) posting = district;
      } else {
        name = text;
      }
    }
  }

  if (district && posting && posting.includes(district)) {
    posting = posting.replace(new RegExp(`(?:जनपद\\s*)?${district}`, 'gi'), '').trim();
  }

  name = name.replace(/,\s*,/g, ',').replace(/\s*,\s*$/, '').replace(/^[\s,]+/, '').replace(/\s+/g, ' ').trim();

  return {
    name,
    mobile,
    posting,
    district
  };
}

/**
 * Enhanced file parser for .xlsx, .xls, .docx, and .json files.
 * Zero hardcoded fallbacks - if a field is blank, it remains blank.
 */
export async function parseDutyFile(file) {
  const fileName = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const rawWorksheet = workbook.Sheets[firstSheetName];
    const worksheet = unmergeAndFillWorksheet(rawWorksheet);
    
    const objectRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (objectRows && objectRows.length > 0 && hasMatchingHeaders(objectRows[0])) {
      return processObjectRows(objectRows);
    } else {
      return processRawRows(rawRows);
    }
  } else if (fileName.endsWith('.docx')) {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const htmlString = result.value;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const tableRows = [];
    const trs = doc.querySelectorAll('tr');
    trs.forEach(tr => {
      const rowData = [];
      const tds = tr.querySelectorAll('th, td');
      tds.forEach(td => rowData.push(td.textContent.trim()));
      if (rowData.some(cell => cell.length > 0)) {
        tableRows.push(rowData);
      }
    });

    if (tableRows.length > 0) {
      return processRawRows(tableRows);
    }
    throw new Error('फ़ाइल में कोई टेबल या ड्यूटी रिकॉर्ड प्राप्त नहीं हुआ।');
  } else if (fileName.endsWith('.json')) {
    const text = new TextDecoder().decode(arrayBuffer);
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return processObjectRows(parsed);
    throw new Error('Invalid JSON array format');
  } else {
    throw new Error('Unsupported file format. Please upload .xlsx, .xls, .docx, or .json file.');
  }
}

function hasMatchingHeaders(firstRow) {
  if (!firstRow || typeof firstRow !== 'object') return false;
  const keys = Object.keys(firstRow).map(k => k.toLowerCase());
  // If first row only has __EMPTY keys or single merged title key, return false so rawRows scans for real header
  const nonGenericKeys = keys.filter(k => !k.startsWith('__empty') && !k.includes('वि0स0') && !k.includes('संसदीय'));
  if (nonGenericKeys.length < 2) return false;
  return keys.some(k => k.includes('mob') || k.includes('name') || k.includes('duty') || k.includes('sector') || k.includes('zone') || k.includes('नाम') || k.includes('मोबाइल'));
}

/**
 * Robustly find key-value pair from row object regardless of extra spaces/dashes/underscores in header
 */
function getRowValueByPattern(row, patternKeywords, excludeKeywords = []) {
  const keys = Object.keys(row);
  
  // 1. Try exact/normalized pattern match first
  for (const k of keys) {
    const rawClean = k.trim().toLowerCase();
    const cleanKey = rawClean.replace(/[\s\_\-\.]+/g, ' ');
    const strippedKey = rawClean.replace(/[\(\)\[\]\/\\]+/g, ' ').replace(/[\s\_\-\.]+/g, ' ').trim();
    if (excludeKeywords.some(ex => cleanKey.includes(ex) || strippedKey.includes(ex))) continue;
    if (patternKeywords.some(kw => cleanKey === kw || strippedKey === kw || cleanKey.replace(/\s+/g, '') === kw.replace(/\s+/g, ''))) {
      const val = row[k];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return convertKrutiToUnicode(String(val).trim());
      }
    }
  }

  // 2. Try substring match if exact match wasn't found
  for (const k of keys) {
    const rawClean = k.trim().toLowerCase();
    const cleanKey = rawClean.replace(/[\s\_\-\.]+/g, ' ');
    const strippedKey = rawClean.replace(/[\(\)\[\]\/\\]+/g, ' ').replace(/[\s\_\-\.]+/g, ' ').trim();
    if (excludeKeywords.some(ex => cleanKey.includes(ex) || strippedKey.includes(ex))) continue;
    if (patternKeywords.some(kw => cleanKey.includes(kw) || strippedKey.includes(kw))) {
      const val = row[k];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return convertKrutiToUnicode(String(val).trim());
      }
    }
  }
  return '';
}

/**
 * Process Excel rows when headers are present as JSON keys
 */
function processObjectRows(rows) {
  const records = [];

  // Forward-fill state trackers for multi-officer centers or grouped duty points
  let currentDutyPlace = '';
  let currentThana = '';
  let currentZone = '';
  let currentZonalIncharge = '';
  let currentSector = '';
  let currentSectorIncharge = '';
  let currentBooth = '';
  let currentTime = '';
  let currentBriefing = '';
  let currentVidhanSabha = '';

  rows.forEach((row, idx) => {
    // 1. Prioritize composite column "name thana district mob" or "name posting dist mob" for Officer Name & Details
    const compositeCol = getRowValueByPattern(row, [
      'name posting dist mob',
      'name_posting_dist_mob',
      'name posting dist mobile',
      'name posting dist',
      'name posting district mob',
      'name posting district mobile',
      'name posting district',
      'name thana district mob',
      'name_thana_district_mob',
      'name thana district mobile',
      'name thana district',
      'name thana',
      'name and posting place district',
      'name and posting place',
      'name and posting',
      'name dist posting mob',
      'name mob posting dist',
      'name & posting place',
      'name posting place district'
    ]);

    // Priority Officer Name (specifically excludes thana, homeguard, center)
    const officerNameCol = getRowValueByPattern(row, [
      'नाम अधीकारी/ कर्मचारीगण', 'नाम अधिकारी/कर्मचारीगण', 'नाम अधीकारी', 'नाम अधिकारी',
      'नाम कर्मचारीगण', 'नाम कर्मचारी', 'अधिकारी नाम', 'कर्मचारी नाम', 'अधिकारी/कर्मचारीगण',
      'officer name', 'personnel name'
    ], ['होमगार्ड', 'चौकीदार', 'थाना', 'thana']);

    // 2. Standard single name column (exclude pad/rank/father/zone/sector AND composite keywords)
    const genericNameCol = getRowValueByPattern(
      row,
      ['name', 'नाम', 'नाम (name)', 'name (नाम)'],
      ['pad', 'पद', 'rank', 'पिता', 'father', 'zone', 'जोन', 'sector', 'सेक्टर', 'incharge', 'प्रभारी', 'place', 'स्थल', 'posting', 'dist', 'thana', 'थाना', 'mob', 'mobile', 'होमगार्ड', 'चौकीदार', 'केन्द्र', 'केंद्र']
    );

    const nameCol = officerNameCol || genericNameCol;

    // 3. Mobile column (exclude composite keywords & Homeguard)
    const rawMob = getRowValueByPattern(
      row,
      ['mob', 'mobile', 'मोबाइल', 'फ़ोन', 'फोन', 'मोबाइल (mobile)', 'mobile (मोबाइल)', 'phone', 'contact', 'मोबार्इल नं0'],
      ['name', 'नाम', 'posting', 'dist', 'thana', 'थाना', 'होमगार्ड', 'चौकीदार', 'hg']
    );
    const mobCol = cleanMobileNumber(rawMob);

    // Co-deployed Home Guard / Companion columns
    const hgNameCol = getRowValueByPattern(row, [
      'नाम होमगार्ड/ चौकीदार', 'नाम होमगार्डस', 'नाम होमगार्ड', 'होमगार्ड का नाम', 'होमगार्ड', 'चौकीदार', 'hg name', 'homeguard'
    ]);
    const hgMobCol = cleanMobileNumber(getRowValueByPattern(row, ['hg mobile', 'मोबाइल नं0 (hg)', 'hg_mobile', 'मोबाइल नं0_1']));
    const hgPostingCol = getRowValueByPattern(row, ['hg posting', 'नियुक्ति (hg)', 'hg_posting', 'नियुक्ति_1']);

    // 4. Other fields
    const zone = getRowValueByPattern(
      row,
      ['zone', 'जोन', 'zone name', 'जोन नाम', 'zone no', 'जोन सं', 'जोन (zone)', 'zone (जोन)'],
      ['incharge', 'प्रभारी', 'officer', 'अधिकारी', 'magistrate', 'मजिस्ट्रेट', 'से0', 'सेक्टर']
    );
    const zonal = getRowValueByPattern(row, [
      'zonal in sahyogarth', 'zonal sahyogarth',
      'zonal incharge', 'zonalincharge', 'zonal in charge', 'zonal in-charge',
      'zone incharge', 'zone in charge', 'zonal officer', 'zonal_officer',
      'zonal magistrate', 'जोनाल प्रभारी', 'जोनल प्रभारी', 'जोन प्रभारी',
      'जोनाल अधिकारी', 'जोनल अधिकारी', 'जोनाल मजिस्ट्रेट', 'जोनल मजिस्ट्रेट',
      'जोन / जोनल प्रभारी', 'जोन/जोनल प्रभारी',
      'zonal', 'जोनाल', 'जोनल', 'जोनल प्रभारी (zonal incharge)', 'zonal incharge (जोनल प्रभारी)'
    ]);

    const sector = getRowValueByPattern(
      row,
      ['sector', 'सेक्टर', 'sector name', 'सेक्टर नाम', 'sector no', 'सेक्टर सं', 'सेक्टर संख्या', 'सेक्टर (sector)', 'sector (सेक्टर)'],
      ['incharge', 'प्रभारी', 'officer', 'अधिकारी', 'magistrate', 'मजिस्ट्रेट', 'जोन']
    );
    const sectorIncharge = getRowValueByPattern(
      row,
      [
        'sector in sahyogarth', 'sector sahyogarth',
        'sector in charge', 'sector in-charge',
        'sector incharge', 'sectorincharge',
        'sector officer', 'sector_officer', 'sector magistrate', 'sector_magistrate',
        'सेक्टर प्रभारी', 'सेक्टर अधिकारी', 'सेक्टर मजिस्ट्रेट',
        'सेक्टर / सेक्टर प्रभारी', 'सेक्टर/सेक्टर प्रभारी',
        'सेक्टर/प्रभारी', 'सेक्टर / प्रभारी', 'sector/incharge', 'sector / incharge',
        'प्रभारी सेक्टर', 'incharge', 'प्रभारी',
        'सेक्टर प्रभारी (sector incharge)', 'sector incharge (सेक्टर प्रभारी)'
      ],
      ['zonal', 'जोनाल', 'जोनल', 'zone', 'जोन']
    );

    // Combined Zone/Sector column like "1/1"
    const zoneSectorCol = getRowValueByPattern(row, ['जोन/ से0 नं0', 'जोन/ से0', 'जोन/सेक्टर', 'जोन / सेक्टर', 'zone/sector']);

    const dutyPlace = getRowValueByPattern(row, [
      'मतदान केन्द्र का नाम व संख्या', 'मतदान केन्द्र का नाम', 'मतदान केंद्र का नाम', 'मतदान केन्द्र', 'मतदान केंद्र',
      'बैरियर का स्थान', 'पिकेट का स्थान',
      'duty place', 'dutyplace', 'duty_place', 'duty point', 'ड्यूटी स्थल', 'ड्यूटी स्थान', 'स्थान', 'स्थल',
      'ड्यूटी प्वाइंट', 'ड्यूटी स्थल (duty point)', 'duty place (ड्यूटी स्थल)'
    ], ['स्थलों की संख्या', 'क्र0सं0/मतदान केन्द्र नं0']);

    const thanaCol = getRowValueByPattern(
      row,
      [
        'posting place', 'posting_place', 'postingplace', 'place of posting', 'posting',
        'नाम थाना', 'thana', 'थाना', 'मूल तैनाती', 'तैनाती', 'मूल तैनाती / थाना', 'मूल तैनाती/थाना',
        'थाना / तैनाती', 'मूल तैनाती / थाना (posting)', 'posting / thana', 'तैनाती स्थल', 'तैनाती स्थान'
      ],
      ['name', 'नाम', 'mob', 'dist', 'district', 'जनपद', 'होमगार्ड', 'चौकीदार']
    );
    const postingCol = getRowValueByPattern(row, ['नियुति', 'नियुक्ति', 'मूल तैनाती', 'तैनाती', 'posting'], ['होमगार्ड']);

    const districtCol = getRowValueByPattern(
      row,
      [
        'district', 'जनपद', 'जिला', 'जनपद (district)', 'district (जनपद)', 'home district', 'dist', 'home dist'
      ],
      ['name', 'नाम', 'mob', 'posting', 'thana']
    );
    const timeCol = getRowValueByPattern(row, [
      'time', 'समय', 'दिनांक', 'shift', 'पाली', 'ड्यूटी समय', 'शिफ्ट', 'ड्यूटी समय / शिफ्ट', 'ड्यूटी समय/शिफ्ट',
      'duty time', 'shift time', 'ड्यूटी समय / शिफ्ट (shift)'
    ]);
    const briefingCol = getRowValueByPattern(row, [
      'briefing place', 'briefing', 'ब्रीफिंग का स्थान', 'ब्रीफिंग', 'ब्रीफिंग स्थल', 'ब्रीफिंग स्थल (briefing point)', 'briefing point'
    ]);
    const eventCol = getRowValueByPattern(row, ['event', 'event name', 'ड्यूटी का प्रकार']);

    const pnoCol = getRowValueByPattern(row, [
      'pno', 'पीएनओ', 'pno no', 'pno_no', 'pid', 'prno', 'pno.', 'पीएनओ (pno)', 'pno (पीएनओ)', 'badge no', 'बैज'
    ]);
    const weaponCol = getRowValueByPattern(row, [
      'weapon', 'शस्त्र', 'असलहा', 'weapon type', 'duty type', 'ड्यूटी प्रकार', 'डियूटी प्रकार', 'शस्त्र स्थिति', 'शस्त्र (weapon)', 'weapon (शस्त्र)'
    ]);
    const boothCol = getRowValueByPattern(row, [
      'बूथ क्रमांक', 'बूथ संख्या', 'बूथ सं', 'booth', 'booth no', 'बूथ', 'बूथ सं', 'बूथ संख्या', 'booth_no', 'मतदेय स्थल'
    ], ['स्थलों की संख्या']);
    const vehicleCol = getRowValueByPattern(row, ['vehicle', 'vehicle no', 'bus no', 'वा0 सं0', 'वाहन', 'गाड़ी सं', 'वाहन सं', 'vehicle_no', 'बस सं']);
    const vidhanSabhaCol = getRowValueByPattern(row, [
      'विधानसभा', 'विधान सभा', 'विधानसभा क्षेत्र', 'विधानसभा_क्षेत्र', 'वि0स0', 'assembly', 'ac', 'ac_name', 'vidhansabha'
    ]);

    if (!nameCol && !compositeCol && !mobCol && !dutyPlace && !hgNameCol) return;

    // Parse composite or merged details from "name posting dist mob"
    const compositeParsed = compositeCol ? parseCompositeOfficerDetails(compositeCol) : null;
    const nameParsed = (nameCol && (/\b[6-9]\d{9}\b/.test(nameCol) || /(?:थाना|कोतवाली)/.test(nameCol))) ? parseCompositeOfficerDetails(nameCol) : null;

    let finalName = '';
    if (compositeParsed?.name && compositeParsed.name.trim()) {
      finalName = compositeParsed.name.trim();
    } else if (nameParsed?.name && nameParsed.name.trim()) {
      finalName = nameParsed.name.trim();
    } else if (nameCol && nameCol.trim()) {
      finalName = nameCol.trim();
    } else if (compositeCol && compositeCol.trim()) {
      finalName = compositeCol.trim().replace(/\b[6-9]\d{9}\b/g, '').replace(/,\s*,/g, ',').replace(/\s*,\s*$/, '').trim();
    } else if (mobCol) {
      finalName = `पुलिसकर्मी (${mobCol})`;
    }

    const finalMobile = mobCol || compositeParsed?.mobile || nameParsed?.mobile || cleanMobileNumber(compositeCol) || cleanMobileNumber(nameCol) || '';

    const rankCol = getRowValueByPattern(row, ['rank', 'पद', 'पदनाम', 'पद नाम', 'designation']);
    const rank = resolvePoliceRank(rankCol, finalName);

    // Clean & Parse Sector and Sector Incharge
    let cleanSector = (sector || '').trim();
    let cleanSectorIncharge = (sectorIncharge || '').trim();
    if (!cleanSectorIncharge && cleanSector.includes('/')) {
      const parts = cleanSector.split('/');
      cleanSector = parts[0].trim();
      cleanSectorIncharge = parts.slice(1).join('/').trim();
    } else if (cleanSector.endsWith('/')) {
      cleanSector = cleanSector.replace(/\/+\s*$/, '').trim();
    }
    if (cleanSectorIncharge && cleanSector.includes(cleanSectorIncharge)) {
      cleanSector = cleanSector.replace(cleanSectorIncharge, '').replace(/\/+\s*$/, '').trim();
    }

    // Clean & Parse Zone and Zonal Incharge
    let cleanZone = (zone || '').trim();
    let cleanZonalIncharge = (zonal || '').trim();
    if (!cleanZonalIncharge && cleanZone.includes('/')) {
      const parts = cleanZone.split('/');
      cleanZone = parts[0].trim();
      cleanZonalIncharge = parts.slice(1).join('/').trim();
    } else if (cleanZone.endsWith('/')) {
      cleanZone = cleanZone.replace(/\/+\s*$/, '').trim();
    }
    if (cleanZonalIncharge && cleanZone.includes(cleanZonalIncharge)) {
      cleanZone = cleanZone.replace(cleanZonalIncharge, '').replace(/\/+\s*$/, '').trim();
    }

    // Handle combined zoneSector column like "1/1"
    if (zoneSectorCol && zoneSectorCol.includes('/')) {
      const parts = zoneSectorCol.split('/');
      cleanZone = `जोन ${parts[0].trim()}`;
      cleanSector = `सेक्टर ${parts[1].trim()}`;
    }

    const cleanPnoVal = pnoCol ? String(pnoCol).trim() : '';

    let finalPosting = postingCol || thanaCol || compositeParsed?.posting || nameParsed?.posting || '';
    let finalDistrict = districtCol || compositeParsed?.district || nameParsed?.district || extractDistrictFromText(`${compositeCol} ${nameCol} ${finalPosting}`);

    if (finalDistrict && finalPosting && finalPosting.includes(finalDistrict)) {
      finalPosting = finalPosting.replace(new RegExp(`(?:जनपद\\s*)?${finalDistrict}`, 'gi'), '').trim();
    }

    // Forward-fill state update
    if (dutyPlace) currentDutyPlace = dutyPlace;
    if (finalPosting) currentThana = finalPosting;
    if (boothCol) currentBooth = boothCol;
    if (cleanZone) currentZone = cleanZone;
    if (cleanZonalIncharge) currentZonalIncharge = cleanZonalIncharge;
    if (cleanSector) currentSector = cleanSector;
    if (cleanSectorIncharge) currentSectorIncharge = cleanSectorIncharge;
    if (timeCol) currentTime = timeCol;
    if (briefingCol) currentBriefing = briefingCol;
    if (vidhanSabhaCol) currentVidhanSabha = vidhanSabhaCol;

    const assignedPlace = dutyPlace || currentDutyPlace;
    const assignedThana = finalPosting || currentThana;
    const assignedVidhanSabha = vidhanSabhaCol || currentVidhanSabha;
    const assignedZone = cleanZone || currentZone || assignedVidhanSabha;
    const assignedZonalInc = cleanZonalIncharge || currentZonalIncharge;
    const assignedSector = cleanSector || currentSector;
    const assignedSectorInc = cleanSectorIncharge || currentSectorIncharge;
    const assignedBooth = boothCol || currentBooth;
    const assignedTime = timeCol || currentTime;
    const assignedBriefing = briefingCol || currentBriefing;

    // Pre-calculate mutually resolvable IDs for Police and Companion Home Guard
    const policeId = cleanPnoVal ? cleanPnoVal : `DUTY-${String(records.length + 1).padStart(4, '0')}`;
    const hgId = hgNameCol ? `DUTY-HG-${String(records.length + (finalName || finalMobile ? 2 : 1)).padStart(4, '0')}` : null;

    // Co-force details
    let coForceObj = null;
    let coForceDesc = '';
    if (hgNameCol) {
      coForceObj = {
        id: hgId,
        name: hgNameCol,
        mobile: hgMobCol,
        posting: hgPostingCol,
        rank: 'होमगार्ड'
      };
      coForceDesc = `होमगार्ड: ${hgNameCol}${hgMobCol ? ' (' + hgMobCol + ')' : ''}${hgPostingCol ? ' - ' + hgPostingCol : ''}`;
    }

    if (finalName || finalMobile) {
      records.push({
        id: policeId,
        pno: cleanPnoVal,
        name: finalName || nameCol || compositeCol || '-',
        raw_name: nameCol,
        composite_details: compositeCol,
        rank: rank,
        mobile: finalMobile,
        posting: assignedThana,
        district: finalDistrict,
        duty_place: assignedPlace,
        vidhan_sabha: assignedVidhanSabha || '',
        zone: assignedZone,
        zonal_incharge: assignedZonalInc,
        sector: assignedSector,
        sector_incharge: assignedSectorInc,
        shift: assignedTime,
        event_name: eventCol,
        briefing_place: assignedBriefing,
        weapon: weaponCol ? String(weaponCol).trim() : '',
        booth_no: assignedBooth ? String(assignedBooth).trim() : '',
        vehicle_no: vehicleCol ? String(vehicleCol).trim() : '',
        co_force: coForceObj,
        co_force_details: coForceDesc,
        status: "Active"
      });
    }

    // Companion Home Guard Record
    if (hgNameCol) {
      records.push({
        id: hgId,
        pno: '',
        name: hgNameCol,
        raw_name: hgNameCol,
        rank: 'होमगार्ड',
        mobile: hgMobCol,
        posting: hgPostingCol || assignedThana,
        district: extractDistrictFromText(hgPostingCol) || finalDistrict,
        duty_place: assignedPlace,
        vidhan_sabha: assignedVidhanSabha || '',
        zone: assignedZone,
        zonal_incharge: assignedZonalInc,
        sector: assignedSector,
        sector_incharge: assignedSectorInc,
        shift: assignedTime,
        event_name: eventCol,
        briefing_place: assignedBriefing,
        weapon: 'निःशस्त्र',
        booth_no: assignedBooth ? String(assignedBooth).trim() : '',
        vehicle_no: vehicleCol ? String(vehicleCol).trim() : '',
        co_force: finalName ? {
          id: policeId,
          pno: cleanPnoVal,
          name: finalName,
          mobile: finalMobile,
          posting: assignedThana,
          rank: rank
        } : null,
        co_force_details: finalName ? `पुलिसकर्मी: ${finalName} (${rank})${cleanPnoVal ? ' [PNO: ' + cleanPnoVal + ']' : ''}${finalMobile ? ' - ' + finalMobile : ''}` : '',
        status: "Active"
      });
    }
  });

  // Pass 2: Propagate Sector and Zone Incharges across the same sector / zone
  const sectorInchargeMap = new Map();
  const zoneInchargeMap = new Map();

  records.forEach(r => {
    const s = (r.sector || '').trim().toLowerCase();
    const sInc = (r.sector_incharge || '').trim();
    if (s && sInc && sInc !== '-' && !sectorInchargeMap.has(s)) {
      sectorInchargeMap.set(s, r.sector_incharge);
    }
    const z = (r.zone || '').trim().toLowerCase();
    const zInc = (r.zonal_incharge || '').trim();
    if (z && zInc && zInc !== '-' && !zoneInchargeMap.has(z)) {
      zoneInchargeMap.set(z, r.zonal_incharge);
    }
  });

  records.forEach(r => {
    const s = (r.sector || '').trim().toLowerCase();
    if (s && (!r.sector_incharge || r.sector_incharge === '-') && sectorInchargeMap.has(s)) {
      r.sector_incharge = sectorInchargeMap.get(s);
    }
    const z = (r.zone || '').trim().toLowerCase();
    if (z && (!r.zonal_incharge || r.zonal_incharge === '-') && zoneInchargeMap.has(z)) {
      r.zonal_incharge = zoneInchargeMap.get(z);
    }
  });

  return records;
}

/**
 * Process raw 2D Array rows when parsing unformatted sheets
 */
function processRawRows(rawRows) {
  if (!rawRows || rawRows.length === 0) return [];

  let headerRowIndex = -1;
  let headers = [];

  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const nonBlank = rawRows[r].filter(c => String(c).trim().length > 0);
    const unique = new Set(nonBlank);
    if (unique.size < 3) continue; // Skip title banner

    const row = rawRows[r].map(c => String(c || '').trim().toLowerCase());
    if (row.some(cell => 
      cell.includes('name') || cell.includes('नाम') || 
      cell.includes('mob') || cell.includes('मोबाइल') || cell.includes('मोबार्इल') ||
      cell.includes('duty') || cell.includes('मतदान') || cell.includes('बैरियर') || cell.includes('पिकेट') ||
      cell.includes('स्थान') || cell.includes('थाना') || cell.includes('पद')
    )) {
      headerRowIndex = r;
      headers = rawRows[r].map(c => String(c || '').trim().toLowerCase().replace(/[\s\_\-\.]+/g, ' '));

      // Check for 2-tier merged headers
      if (r + 1 < rawRows.length) {
        const nextNonBlank = rawRows[r + 1].filter(c => String(c).trim().length > 0);
        const nextUnique = new Set(nextNonBlank);
        if (nextUnique.size >= 3) {
          const nextRow = rawRows[r + 1].map(c => String(c || '').trim().toLowerCase().replace(/[\s\_\-\.]+/g, ' '));
          if (nextRow.some(c => c.includes('नाम') || c.includes('मोबार्इल') || c.includes('मोबाइल') || c.includes('नियुक्ति') || c.includes('कोड'))) {
            headers = headers.map((h, i) => {
              const sub = nextRow[i] || '';
              return `${h} ${sub}`.trim();
            });
            headerRowIndex = r + 1;
          }
        }
      }
      break;
    }
  }

  let colComposite = headers.findIndex(h => 
    h.includes('name posting dist mob') || 
    h.includes('name_posting_dist_mob') || 
    h.includes('name posting dist') || 
    h.includes('name posting district mob') || 
    h.includes('name thana district mob') || 
    h.includes('name_thana_district_mob') || 
    h.includes('name and posting place district') ||
    h.includes('name and posting place') ||
    h.includes('name and posting') ||
    h.includes('name posting district') ||
    h.includes('name & posting place') ||
    h.includes('name posting place district') ||
    (h.includes('name') && h.includes('posting') && h.includes('mob')) ||
    (h.includes('name') && h.includes('mob') && h.includes('thana'))
  );

  // Priority Officer Name Column
  const colOfficerName = headers.findIndex(h => 
    (h.includes('नाम') || h.includes('name')) &&
    (h.includes('अधीकारी') || h.includes('अधिकारी') || h.includes('अधिधकारी') || h.includes('कर्मचारी') || h.includes('officer') || h.includes('police')) &&
    !h.includes('होमगार्ड') && !h.includes('चौकीदार') && !h.includes('थाना')
  );

  const colGenericName = headers.findIndex((h, idx) => 
    idx !== colComposite && idx !== colOfficerName &&
    (h === 'name' || h === 'नाम' || h === 'officer name' || ((h.includes('नाम') || h.includes('name')) && !h.includes('थाना') && !h.includes('होमगार्ड') && !h.includes('चौकीदार') && !h.includes('केंद्र') && !h.includes('केन्द्र') && !h.includes('posting') && !h.includes('dist') && !h.includes('mob') && !h.includes('pad') && !h.includes('पद') && !h.includes('rank') && !h.includes('father') && !h.includes('zone') && !h.includes('जोन') && !h.includes('sector') && !h.includes('सेक्टर') && !h.includes('place') && !h.includes('स्थान') && !h.includes('स्थल') && !h.includes('incharge') && !h.includes('प्रभारी')))
  );

  const colName = colOfficerName !== -1 ? colOfficerName : colGenericName;

  const colOfficerMob = headers.findIndex((h, idx) => 
    idx !== colComposite &&
    (h.includes('मोबाइल') || h.includes('मोबार्इल') || h.includes('mob') || h.includes('phone') || h.includes('contact')) &&
    !h.includes('होमगार्ड') && !h.includes('चौकीदार') && !h.includes('name') && !h.includes('नाम')
  );

  const colHgName = headers.findIndex(h => 
    h.includes('होमगार्ड') || h.includes('चौकीदार') || h.includes('hg')
  );

  const colHgMob = headers.findIndex((h, idx) => 
    idx !== colOfficerMob &&
    (h.includes('मोबाइल') || h.includes('मोबार्इल') || h.includes('mob')) &&
    (h.includes('होमगार्ड') || idx > colHgName)
  );

  const colHgPosting = headers.findIndex((h, idx) => 
    idx > colHgName && (h.includes('नियुक्ति') || h.includes('नियुति') || h.includes('posting') || h.includes('थाना'))
  );

  const colVidhanSabha = headers.findIndex(h => 
    h === 'विधानसभा' || h === 'विधान सभा' || h === 'वि0स0' || h === 'ac' || h.includes('विधानसभा') || h.includes('vidhansabha') || h.includes('assembly')
  );
  const colZoneSector = headers.findIndex(h => 
    h.includes('जोन/ से0') || h.includes('जोन/सेक्टर') || h.includes('जोन / सेक्टर') || h.includes('zone/sector')
  );

  const colZone = headers.findIndex(h => 
    h === 'zone' || h === 'जोन' || 
    ((h.includes('zone') || h.includes('जोन')) && !h.includes('incharge') && !h.includes('प्रभारी') && !h.includes('officer') && !h.includes('अधिकारी') && !h.includes('से0') && !h.includes('सेक्टर'))
  );
  const colZonal = headers.findIndex(h => 
    h.includes('zonal in sahyogarth') || h.includes('zonal sahyogarth') ||
    h.includes('zonal incharge') || h.includes('zonalincharge') || h.includes('zone incharge') ||
    h.includes('जोनाल प्रभारी') || h.includes('जोनल प्रभारी') || h.includes('जोन प्रभारी') ||
    h.includes('zonal') || h.includes('जोनाल') || h.includes('जोनल')
  );
  const colSector = headers.findIndex(h => 
    h === 'sector' || h === 'सेक्टर' || 
    ((h.includes('sector') || h.includes('सेक्टर')) && 
     !h.includes('incharge') && !h.includes('प्रभारी') && !h.includes('officer') && !h.includes('अधिकारी') && !h.includes('magistrate') && !h.includes('मजिस्ट्रेट') && !h.includes('जोन'))
  );
  const colSectorIncharge = headers.findIndex(h => 
    h.includes('sector in sahyogarth') || h.includes('sector sahyogarth') ||
    h.includes('sector incharge') || h.includes('sectorincharge') || h.includes('sector in-charge') ||
    h.includes('sector officer') || h.includes('sector_officer') ||
    h.includes('sector magistrate') || h.includes('sector_magistrate') ||
    h.includes('सेक्टर प्रभारी') || h.includes('सेक्टर अधिकारी') || h.includes('सेक्टर मजिस्ट्रेट') ||
    h.includes('प्रभारी सेक्टर') || h.includes('सेक्टर/प्रभारी') || h.includes('सेक्टर / प्रभारी') ||
    (h.includes('incharge') && !h.includes('zone') && !h.includes('zonal')) ||
    (h.includes('प्रभारी') && !h.includes('जोन') && !h.includes('जोनाल'))
  );

  const colDutyPlace = headers.findIndex(h => 
    (h.includes('मतदान केन्द्र का नाम') || h.includes('मतदान केंद्र का नाम') || h.includes('मतदान केन्द्र') || h.includes('मतदान केंद्र') ||
     h.includes('बैरियर का स्थान') || h.includes('पिकेट का स्थान') || h.includes('duty place') || h.includes('duty_place') || h.includes('स्थान') || h.includes('duty point') || h.includes('स्थल') || h.includes('ड्यूटी स्थल')) &&
    !h.includes('स्थलों की संख्या') && !h.includes('क्र0सं0/मतदान केन्द्र नं0') && !h.includes('केन्द्र नं0')
  );

  const colBooth = headers.findIndex(h => 
    (h.includes('बूथ क्रमांक') || h.includes('बूथ संख्या') || h.includes('बूथ सं') || h.includes('बूथ') || h.includes('booth')) &&
    !h.includes('मतदेय स्थलों की संख्या')
  );

  const colRank = headers.findIndex(h => h === 'rank' || h === 'पद' || h === 'पदनाम' || h === 'पद नाम' || h.includes('designation') || h.includes('पद') || h.includes('rank'));

  const colThana = headers.findIndex((h, idx) => 
    idx !== colComposite && idx !== colName &&
    (h.includes('नाम थाना') || h === 'thana' || h === 'थाना' || ((h.includes('thana') || h.includes('थाना') || h.includes('posting place')) && !h.includes('अधीकारी') && !h.includes('अधिकारी') && !h.includes('होमगार्ड') && !h.includes('mob')))
  );

  const colPosting = headers.findIndex((h, idx) => 
    idx !== colHgPosting &&
    (h.includes('नियुति') || h.includes('नियुक्ति') || h.includes('मूल तैनाती') || h.includes('तैनाती') || h.includes('posting')) &&
    !h.includes('होमगार्ड')
  );

  const colDistrict = headers.findIndex((h, idx) => 
    idx !== colComposite && 
    (h === 'district' || h === 'जनपद' || h === 'जिला' || h === 'dist' || ((h.includes('district') || h.includes('जनपद') || h.includes('जिला') || h.includes('dist')) && !h.includes('name') && !h.includes('नाम') && !h.includes('mob') && !h.includes('posting') && !h.includes('thana')))
  );

  const colTime = headers.findIndex(h => h.includes('time') || h.includes('समय') || h.includes('दिनांक') || h.includes('shift') || h.includes('पाली') || h.includes('शिफ्ट'));
  const colBriefing = headers.findIndex(h => h.includes('briefing') || h.includes('ब्रीफिंग'));
  const colPno = headers.findIndex(h => h === 'pno' || h === 'पीएनओ' || h.includes('pno') || h.includes('पीएनओ'));
  const colWeapon = headers.findIndex(h => h.includes('weapon') || h.includes('शस्त्र') || h.includes('असलहा') || h.includes('ड्यूटी प्रकार') || h.includes('डियूटी प्रकार'));
  const colVehicle = headers.findIndex(h => h.includes('वा0 सं0') || h.includes('vehicle') || h.includes('वाहन') || h.includes('बस सं'));

  const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

  const records = [];
  let currentVidhanSabha = "";
  let currentDutyPlace = "";
  let currentThana = "";
  let currentZone = "";
  let currentZonal = "";
  let currentSector = "";
  let currentSectorIncharge = "";
  let currentBooth = "";
  let currentTime = "";
  let currentBriefing = "";

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const cells = row.map(c => String(c || '').trim());
    const rowString = cells.join(' ');

    if (rowString.length < 2) continue;

    const rawComposite = colComposite !== -1 ? convertKrutiToUnicode(cells[colComposite] || '') : '';
    const rawName = colName !== -1 ? convertKrutiToUnicode(cells[colName] || '') : '';
    const rawMob = colOfficerMob !== -1 ? cleanMobileNumber(cells[colOfficerMob]) : cleanMobileNumber(rowString);

    let zoneVal = colZone !== -1 ? convertKrutiToUnicode(cells[colZone] || '') : '';
    let zonalVal = colZonal !== -1 ? convertKrutiToUnicode(cells[colZonal] || '') : '';
    let sectorVal = colSector !== -1 ? convertKrutiToUnicode(cells[colSector] || '') : '';
    let sectorInchargeVal = colSectorIncharge !== -1 ? convertKrutiToUnicode(cells[colSectorIncharge] || '') : '';
    const dutyPlaceVal = colDutyPlace !== -1 ? convertKrutiToUnicode(cells[colDutyPlace] || '') : '';

    const rawThana = colThana !== -1 ? convertKrutiToUnicode(cells[colThana] || '') : '';
    const rawPosting = colPosting !== -1 ? convertKrutiToUnicode(cells[colPosting] || '') : '';
    const rawDistrict = colDistrict !== -1 ? convertKrutiToUnicode(cells[colDistrict] || '') : '';
    const rawTime = colTime !== -1 ? convertKrutiToUnicode(cells[colTime] || '') : '';
    const rawBriefing = colBriefing !== -1 ? convertKrutiToUnicode(cells[colBriefing] || '') : '';
    const rawPno = colPno !== -1 ? convertKrutiToUnicode(cells[colPno] || '') : '';
    const rawWeapon = colWeapon !== -1 ? convertKrutiToUnicode(cells[colWeapon] || '') : '';
    const rawBooth = colBooth !== -1 ? convertKrutiToUnicode(cells[colBooth] || '') : '';
    const rawVehicle = colVehicle !== -1 ? convertKrutiToUnicode(cells[colVehicle] || '') : '';

    // Handle combined Zone/Sector column like "1/1"
    if (colZoneSector !== -1 && cells[colZoneSector]) {
      const zs = String(cells[colZoneSector]).trim();
      if (zs.includes('/')) {
        const parts = zs.split('/');
        zoneVal = `जोन ${parts[0].trim()}`;
        sectorVal = `सेक्टर ${parts[1].trim()}`;
      } else {
        sectorVal = `सेक्टर ${zs}`;
      }
    }

    // Clean & Parse Sector and Sector Incharge if combined with /
    if (!sectorInchargeVal && sectorVal.includes('/')) {
      const parts = sectorVal.split('/');
      sectorVal = parts[0].trim();
      sectorInchargeVal = parts.slice(1).join('/').trim();
    } else if (sectorVal.endsWith('/')) {
      sectorVal = sectorVal.replace(/\/+\s*$/, '').trim();
    }

    // Clean & Parse Zone and Zonal Incharge if combined with /
    if (!zonalVal && zoneVal.includes('/')) {
      const parts = zoneVal.split('/');
      zoneVal = parts[0].trim();
      zonalVal = parts.slice(1).join('/').trim();
    } else if (zoneVal.endsWith('/')) {
      zoneVal = zoneVal.replace(/\/+\s*$/, '').trim();
    }

    // Forward-fill state update
    const rawVidhanSabha = colVidhanSabha !== -1 ? convertKrutiToUnicode(cells[colVidhanSabha] || '') : '';
    if (rawVidhanSabha) currentVidhanSabha = rawVidhanSabha;
    const assignedVidhanSabha = rawVidhanSabha || currentVidhanSabha;

    if (zoneVal) currentZone = zoneVal;
    if (zonalVal) currentZonal = zonalVal;
    if (sectorVal) currentSector = sectorVal;
    if (sectorInchargeVal) currentSectorIncharge = sectorInchargeVal;
    if (dutyPlaceVal) currentDutyPlace = dutyPlaceVal;
    if (rawThana || rawPosting) currentThana = rawPosting || rawThana;
    if (rawBooth) currentBooth = rawBooth;
    if (rawTime) currentTime = rawTime;
    if (rawBriefing) currentBriefing = rawBriefing;

    // Home Guard details
    const rawHgName = colHgName !== -1 ? convertKrutiToUnicode(cells[colHgName] || '') : '';
    const rawHgMob = colHgMob !== -1 ? cleanMobileNumber(cells[colHgMob]) : '';
    const rawHgPosting = colHgPosting !== -1 ? convertKrutiToUnicode(cells[colHgPosting] || '') : '';

    // Parse composite or merged details from "name posting dist mob"
    const compositeParsed = rawComposite ? parseCompositeOfficerDetails(rawComposite) : null;
    const nameParsed = (rawName && (/\b[6-9]\d{9}\b/.test(rawName) || /(?:थाना|कोतवाली)/.test(rawName))) ? parseCompositeOfficerDetails(rawName) : null;

    let finalName = '';
    if (compositeParsed?.name && compositeParsed.name.trim()) {
      finalName = compositeParsed.name.trim();
    } else if (nameParsed?.name && nameParsed.name.trim()) {
      finalName = nameParsed.name.trim();
    } else if (rawName && rawName.trim()) {
      finalName = rawName.trim();
    } else if (rawComposite && rawComposite.trim()) {
      finalName = rawComposite.trim().replace(/\b[6-9]\d{9}\b/g, '').replace(/,\s*,/g, ',').replace(/\s*,\s*$/, '').trim();
    } else if (rawMob) {
      finalName = `पुलिसकर्मी (${rawMob})`;
    }

    const mobNumber = rawMob || compositeParsed?.mobile || nameParsed?.mobile || cleanMobileNumber(rawComposite) || cleanMobileNumber(rawName) || '';

    if (!finalName && !mobNumber && !rawComposite && !rawName && !rawHgName) continue;

    const rawRank = colRank !== -1 ? convertKrutiToUnicode(cells[colRank] || '') : '';
    const rank = resolvePoliceRank(rawRank, finalName);
    const cleanPno = rawPno ? rawPno.trim() : '';

    let finalThana = rawPosting || rawThana || compositeParsed?.posting || nameParsed?.posting || '';
    let finalDist = rawDistrict || compositeParsed?.district || nameParsed?.district || extractDistrictFromText(`${rawComposite} ${rawName} ${finalThana}`);

    if (finalDist && finalThana && finalThana.includes(finalDist)) {
      finalThana = finalThana.replace(new RegExp(`(?:जनपद\\s*)?${finalDist}`, 'gi'), '').trim();
    }

    const assignedPlace = dutyPlaceVal || currentDutyPlace;
    const assignedThana = finalThana || currentThana;
    const assignedZone = zoneVal || currentZone;
    const assignedZonalInc = zonalVal || currentZonal;
    const assignedSector = sectorVal || currentSector;
    const assignedSectorInc = sectorInchargeVal || currentSectorIncharge;
    const assignedBooth = rawBooth || currentBooth;
    const assignedTime = rawTime || currentTime;
    const assignedBriefing = rawBriefing || currentBriefing;

    // Pre-calculate mutually resolvable IDs for Police and Companion Home Guard
    const policeId = cleanPno ? cleanPno : `DUTY-${String(records.length + 1).padStart(4, '0')}`;
    const hgId = rawHgName ? `DUTY-HG-${String(records.length + (finalName || mobNumber ? 2 : 1)).padStart(4, '0')}` : null;

    // Co-force object
    let coForceObj = null;
    let coForceDesc = '';
    if (rawHgName) {
      coForceObj = {
        id: hgId,
        name: rawHgName,
        mobile: rawHgMob,
        posting: rawHgPosting,
        rank: 'होमगार्ड'
      };
      coForceDesc = `होमगार्ड: ${rawHgName}${rawHgMob ? ' (' + rawHgMob + ')' : ''}${rawHgPosting ? ' - ' + rawHgPosting : ''}`;
    }

    if (finalName || mobNumber) {
      records.push({
        id: policeId,
        pno: cleanPno,
        name: finalName || rawName || rawComposite || '-',
        raw_name: rawName,
        composite_details: rawComposite,
        rank: rank,
        mobile: mobNumber,
        posting: assignedThana,
        district: finalDist,
        vidhansabha: assignedVidhanSabha || '',
        vidhan_sabha: assignedVidhanSabha || '',
        duty_place: assignedPlace,
        zone: assignedZone,
        zonal_incharge: assignedZonalInc,
        sector: assignedSector,
        sector_incharge: assignedSectorInc,
        shift: assignedTime,
        event_name: "",
        briefing_place: assignedBriefing,
        weapon: rawWeapon ? rawWeapon.trim() : '',
        booth_no: assignedBooth ? String(assignedBooth).trim() : '',
        vehicle_no: rawVehicle ? rawVehicle.trim() : '',
        co_force: coForceObj,
        co_force_details: coForceDesc,
        status: "Active"
      });
    }

    // Add Companion Home Guard Record
    if (rawHgName) {
      records.push({
        id: hgId,
        pno: '',
        name: rawHgName,
        raw_name: rawHgName,
        rank: 'होमगार्ड',
        mobile: rawHgMob,
        posting: rawHgPosting || assignedThana,
        district: extractDistrictFromText(rawHgPosting) || finalDist,
        vidhansabha: assignedVidhanSabha || '',
        vidhan_sabha: assignedVidhanSabha || '',
        duty_place: assignedPlace,
        zone: assignedZone,
        zonal_incharge: assignedZonalInc,
        sector: assignedSector,
        sector_incharge: assignedSectorInc,
        shift: assignedTime,
        event_name: "",
        briefing_place: assignedBriefing,
        weapon: 'निःशस्त्र',
        booth_no: assignedBooth ? String(assignedBooth).trim() : '',
        vehicle_no: rawVehicle ? rawVehicle.trim() : '',
        co_force: finalName ? {
          id: policeId,
          pno: cleanPno,
          name: finalName,
          mobile: mobNumber,
          posting: assignedThana,
          rank: rank
        } : null,
        co_force_details: finalName ? `पुलिसकर्मी: ${finalName} (${rank})${cleanPno ? ' [PNO: ' + cleanPno + ']' : ''}${mobNumber ? ' - ' + mobNumber : ''}` : '',
        status: "Active"
      });
    }
  }

  // Pass 2: Propagate Sector and Zone Incharges across the same sector / zone
  const sectorInchargeMap = new Map();
  const zoneInchargeMap = new Map();

  records.forEach(r => {
    const s = (r.sector || '').trim().toLowerCase();
    const sInc = (r.sector_incharge || '').trim();
    if (s && sInc && sInc !== '-' && !sectorInchargeMap.has(s)) {
      sectorInchargeMap.set(s, r.sector_incharge);
    }
    const z = (r.zone || '').trim().toLowerCase();
    const zInc = (r.zonal_incharge || '').trim();
    if (z && zInc && zInc !== '-' && !zoneInchargeMap.has(z)) {
      zoneInchargeMap.set(z, r.zonal_incharge);
    }
  });

  records.forEach(r => {
    const s = (r.sector || '').trim().toLowerCase();
    if (s && (!r.sector_incharge || r.sector_incharge === '-') && sectorInchargeMap.has(s)) {
      r.sector_incharge = sectorInchargeMap.get(s);
    }
    const z = (r.zone || '').trim().toLowerCase();
    if (z && (!r.zonal_incharge || r.zonal_incharge === '-') && zoneInchargeMap.has(z)) {
      r.zonal_incharge = zoneInchargeMap.get(z);
    }
  });

  return records;
}
