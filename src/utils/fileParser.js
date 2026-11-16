import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { convertKrutiToUnicode } from './kruti2unicode';
import { resolvePoliceRank } from './rankResolver';

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
  const keys = Object.keys(firstRow).map(k => k.toLowerCase());
  return keys.some(k => k.includes('mob') || k.includes('name') || k.includes('duty') || k.includes('sector') || k.includes('zone'));
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

    // 2. Standard single name column (exclude pad/rank/father/zone/sector AND composite keywords)
    const nameCol = getRowValueByPattern(
      row,
      ['name', 'नाम', 'नाम (name)', 'name (नाम)', 'officer name', 'कर्मचारी नाम', 'अधिकारी नाम'],
      ['pad', 'पद', 'rank', 'पिता', 'father', 'zone', 'जोन', 'sector', 'सेक्टर', 'incharge', 'प्रभारी', 'place', 'स्थल', 'posting', 'dist', 'thana', 'mob', 'mobile']
    );

    // 3. Mobile column (exclude composite keywords)
    const rawMob = getRowValueByPattern(
      row,
      ['mob', 'mobile', 'मोबाइल', 'फ़ोन', 'फोन', 'मोबाइल (mobile)', 'mobile (मोबाइल)', 'phone', 'contact'],
      ['name', 'नाम', 'posting', 'dist', 'thana']
    );
    const mobCol = cleanMobileNumber(rawMob);

    // 4. Other fields
    const zone = getRowValueByPattern(
      row,
      ['zone', 'जोन', 'zone name', 'जोन नाम', 'zone no', 'जोन सं', 'जोन (zone)', 'zone (जोन)'],
      ['incharge', 'प्रभारी', 'officer', 'अधिकारी', 'magistrate', 'मजिस्ट्रेट']
    );
    const zonal = getRowValueByPattern(row, [
      'zonal in sahyogarth', 'zonal sahyogarth',
      'zonal incharge', 'zonalincharge', 'zonal in charge', 'zonal in-charge',
      'zone incharge', 'zone in charge', 'zonal officer', 'zonal_officer',
      'zonal magistrate', 'जोनाल प्रभारी', 'जोनल प्रभारी', 'जोन प्रभारी',
      'जोनाल अधिकारी', 'जोनल अधिकारी', 'जोनाल मजिस्ट्रेट', 'जोनल मजिस्ट्रेट',
      'zonal', 'जोनाल', 'जोनल', 'जोनल प्रभारी (zonal incharge)', 'zonal incharge (जोनल प्रभारी)'
    ]);

    const sector = getRowValueByPattern(
      row,
      ['sector', 'सेक्टर', 'sector name', 'सेक्टर नाम', 'sector no', 'सेक्टर सं', 'सेक्टर संख्या', 'सेक्टर (sector)', 'sector (सेक्टर)'],
      ['incharge', 'प्रभारी', 'officer', 'अधिकारी', 'magistrate', 'मजिस्ट्रेट']
    );
    const sectorIncharge = getRowValueByPattern(
      row,
      [
        'sector in sahyogarth', 'sector sahyogarth',
        'sector in charge', 'sector in-charge',
        'sector incharge', 'sectorincharge',
        'sector officer', 'sector_officer', 'sector magistrate', 'sector_magistrate',
        'सेक्टर प्रभारी', 'सेक्टर अधिकारी', 'सेक्टर मजिस्ट्रेट',
        'सेक्टर/प्रभारी', 'सेक्टर / प्रभारी', 'sector/incharge', 'sector / incharge',
        'प्रभारी सेक्टर', 'incharge', 'प्रभारी',
        'सेक्टर प्रभारी (sector incharge)', 'sector incharge (सेक्टर प्रभारी)'
      ],
      ['zonal', 'जोनाल', 'जोनल', 'zone', 'जोन']
    );

    const dutyPlace = getRowValueByPattern(row, [
      'duty place', 'dutyplace', 'duty_place', 'duty point', 'ड्यूटी स्थल', 'ड्यूटी स्थान', 'स्थान', 'स्थल',
      'ड्यूटी प्वाइंट', 'ड्यूटी स्थल (duty point)', 'duty place (ड्यूटी स्थल)'
    ]);

    const thanaCol = getRowValueByPattern(
      row,
      [
        'posting place', 'posting_place', 'postingplace', 'place of posting', 'posting',
        'thana', 'थाना', 'मूल तैनाती', 'तैनाती', 'मूल तैनाती / थाना', 'मूल तैनाती/थाना',
        'थाना / तैनाती', 'मूल तैनाती / थाना (posting)', 'posting / thana', 'तैनाती स्थल', 'तैनाती स्थान'
      ],
      ['name', 'नाम', 'mob', 'dist', 'district', 'जनपद']
    );
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
      'weapon', 'शस्त्र', 'असलहा', 'weapon type', 'duty type', 'शस्त्र स्थिति', 'शस्त्र (weapon)', 'weapon (शस्त्र)'
    ]);
    const boothCol = getRowValueByPattern(row, ['booth', 'booth no', 'बूथ', 'बूथ सं', 'बूथ संख्या', 'booth_no', 'मतदान केंद्र']);
    const vehicleCol = getRowValueByPattern(row, ['vehicle', 'vehicle no', 'bus no', 'वाहन', 'गाड़ी सं', 'वाहन सं', 'vehicle_no', 'बस सं']);

    if (!nameCol && !compositeCol && !mobCol && !dutyPlace) return;

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

    // Clean & Parse Sector and Sector Incharge if combined with /
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

    // Clean & Parse Zone and Zonal Incharge if combined with /
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

    const cleanPnoVal = pnoCol ? String(pnoCol).trim() : '';

    let finalPosting = thanaCol || compositeParsed?.posting || nameParsed?.posting || '';
    let finalDistrict = districtCol || compositeParsed?.district || nameParsed?.district || extractDistrictFromText(`${compositeCol} ${nameCol} ${finalPosting}`);

    if (finalDistrict && finalPosting && finalPosting.includes(finalDistrict)) {
      finalPosting = finalPosting.replace(new RegExp(`(?:जनपद\\s*)?${finalDistrict}`, 'gi'), '').trim();
    }

    if (!finalPosting && (compositeCol || nameCol)) {
      const sourceText = compositeCol || nameCol;
      const parts = sourceText.split(/[,।]/).map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          if (/^\d{10}$/.test(part) || (finalDistrict && part.includes(finalDistrict))) continue;
          if (part.length >= 2) {
            finalPosting = part;
            break;
          }
        }
      }
    }

    records.push({
      id: cleanPnoVal ? cleanPnoVal : `DUTY-${String(records.length + 1).padStart(4, '0')}`,
      pno: cleanPnoVal,
      name: finalName || nameCol || compositeCol || '-',
      raw_name: nameCol,
      composite_details: compositeCol,
      rank: rank,
      mobile: finalMobile,
      posting: finalPosting,
      district: finalDistrict,
      duty_place: dutyPlace,
      zone: cleanZone,
      zonal_incharge: cleanZonalIncharge,
      sector: cleanSector,
      sector_incharge: cleanSectorIncharge,
      shift: timeCol,
      event_name: eventCol,
      briefing_place: briefingCol,
      weapon: weaponCol ? String(weaponCol).trim() : '',
      booth_no: boothCol ? String(boothCol).trim() : '',
      vehicle_no: vehicleCol ? String(vehicleCol).trim() : '',
      status: "Active"
    });
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

  const records = [];
  let currentZone = "";
  let currentZonal = "";
  let currentSector = "";
  let currentSectorIncharge = "";
  let currentDutyPlace = "";
  let currentTime = "";

  let headerRowIndex = -1;
  let headers = [];

  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r].map(c => String(c || '').trim().toLowerCase());
    if (row.some(cell => cell.includes('name') || cell.includes('नाम') || cell.includes('mob') || cell.includes('duty'))) {
      headerRowIndex = r;
      headers = rawRows[r].map(c => String(c || '').trim().toLowerCase().replace(/[\s\_\-\.]+/g, ' '));
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
  let colName = headers.findIndex((h, idx) => 
    idx !== colComposite && 
    (h === 'name' || h === 'नाम' || h === 'officer name' || ((h.includes('नाम') || h.includes('name')) && !h.includes('posting') && !h.includes('dist') && !h.includes('mob') && !h.includes('thana') && !h.includes('पद') && !h.includes('rank') && !h.includes('पिता') && !h.includes('father') && !h.includes('जोन') && !h.includes('zone') && !h.includes('सेक्टर') && !h.includes('sector') && !h.includes('स्थान') && !h.includes('place') && !h.includes('प्रभारी') && !h.includes('incharge')))
  );
  let colMob = headers.findIndex((h, idx) => 
    idx !== colComposite && 
    (h === 'mob' || h === 'mobile' || h === 'मोबाइल' || ((h.includes('mobile') || h.includes('मोबाइल') || h.includes('mob') || h.includes('phone') || h.includes('contact')) && !h.includes('name') && !h.includes('नाम') && !h.includes('posting') && !h.includes('dist') && !h.includes('thana')))
  );
  let colZone = headers.findIndex(h => 
    h === 'zone' || h === 'जोन' || 
    ((h.includes('zone') || h.includes('जोन')) && !h.includes('incharge') && !h.includes('प्रभारी') && !h.includes('officer') && !h.includes('अधिकारी'))
  );
  let colZonal = headers.findIndex(h => 
    h.includes('zonal in sahyogarth') || h.includes('zonal sahyogarth') ||
    h.includes('zonal incharge') || h.includes('zonalincharge') || h.includes('zone incharge') ||
    h.includes('जोनाल प्रभारी') || h.includes('जोनल प्रभारी') || h.includes('जोन प्रभारी') ||
    h.includes('zonal') || h.includes('जोनाल') || h.includes('जोनल')
  );
  let colSector = headers.findIndex(h => 
    h === 'sector' || h === 'सेक्टर' || 
    ((h.includes('sector') || h.includes('सेक्टर')) && 
     !h.includes('incharge') && !h.includes('प्रभारी') && !h.includes('officer') && !h.includes('अधिकारी') && !h.includes('magistrate') && !h.includes('मजिस्ट्रेट'))
  );
  let colSectorIncharge = headers.findIndex(h => 
    h.includes('sector in sahyogarth') || h.includes('sector sahyogarth') ||
    h.includes('sector incharge') || h.includes('sectorincharge') || h.includes('sector in-charge') ||
    h.includes('sector officer') || h.includes('sector_officer') ||
    h.includes('sector magistrate') || h.includes('sector_magistrate') ||
    h.includes('सेक्टर प्रभारी') || h.includes('सेक्टर अधिकारी') || h.includes('सेक्टर मजिस्ट्रेट') ||
    h.includes('प्रभारी सेक्टर') || h.includes('सेक्टर/प्रभारी') || h.includes('सेक्टर / प्रभारी') ||
    (h.includes('incharge') && !h.includes('zone') && !h.includes('zonal')) ||
    (h.includes('प्रभारी') && !h.includes('जोन') && !h.includes('जोनाल'))
  );
  let colDutyPlace = headers.findIndex(h => h.includes('duty place') || h.includes('duty_place') || h.includes('स्थान') || h.includes('duty point') || h.includes('स्थल') || h.includes('ड्यूटी स्थल'));
  let colRank = headers.findIndex(h => h === 'rank' || h === 'पद' || h === 'पदनाम' || h === 'पद नाम' || h.includes('designation') || h.includes('पद') || h.includes('rank'));
  let colThana = headers.findIndex((h, idx) => 
    idx !== colComposite && 
    (h === 'thana' || h === 'थाना' || h === 'posting' || ((h.includes('thana') || h.includes('थाना') || h.includes('तैनाती') || h.includes('posting') || h.includes('posting place') || h.includes('posting_place') || h.includes('place of posting')) && !h.includes('name') && !h.includes('नाम') && !h.includes('mob') && !h.includes('dist')))
  );
  let colDistrict = headers.findIndex((h, idx) => 
    idx !== colComposite && 
    (h === 'district' || h === 'जनपद' || h === 'जिला' || h === 'dist' || ((h.includes('district') || h.includes('जनपद') || h.includes('जिला') || h.includes('dist')) && !h.includes('name') && !h.includes('नाम') && !h.includes('mob') && !h.includes('posting') && !h.includes('thana')))
  );
  let colTime = headers.findIndex(h => h.includes('time') || h.includes('समय') || h.includes('दिनांक') || h.includes('shift') || h.includes('पाली') || h.includes('शिफ्ट'));
  let colBriefing = headers.findIndex(h => h.includes('briefing') || h.includes('ब्रीफिंग'));
  let colPno = headers.findIndex(h => h === 'pno' || h === 'पीएनओ' || h.includes('pno') || h.includes('पीएनओ'));
  let colWeapon = headers.findIndex(h => h.includes('weapon') || h.includes('शस्त्र') || h.includes('असलहा'));
  let colBooth = headers.findIndex(h => h.includes('booth') || h.includes('बूथ'));
  let colVehicle = headers.findIndex(h => h.includes('vehicle') || h.includes('वाहन') || h.includes('बस सं'));

  const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const cells = row.map(c => String(c || '').trim());
    const rowString = cells.join(' ');

    if (rowString.length < 3) continue;

    const rawComposite = colComposite !== -1 ? convertKrutiToUnicode(cells[colComposite] || '') : '';
    const rawName = colName !== -1 ? convertKrutiToUnicode(cells[colName] || '') : '';
    const rawMob = colMob !== -1 ? cleanMobileNumber(cells[colMob]) : cleanMobileNumber(rowString);

    let zoneVal = colZone !== -1 ? convertKrutiToUnicode(cells[colZone] || '') : '';
    let zonalVal = colZonal !== -1 ? convertKrutiToUnicode(cells[colZonal] || '') : '';
    let sectorVal = colSector !== -1 ? convertKrutiToUnicode(cells[colSector] || '') : '';
    let sectorInchargeVal = colSectorIncharge !== -1 ? convertKrutiToUnicode(cells[colSectorIncharge] || '') : '';
    const dutyPlaceVal = colDutyPlace !== -1 ? convertKrutiToUnicode(cells[colDutyPlace] || '') : '';

    const rawThana = colThana !== -1 ? convertKrutiToUnicode(cells[colThana] || '') : '';
    const rawDistrict = colDistrict !== -1 ? convertKrutiToUnicode(cells[colDistrict] || '') : '';
    const rawTime = colTime !== -1 ? convertKrutiToUnicode(cells[colTime] || '') : '';
    const rawBriefing = colBriefing !== -1 ? convertKrutiToUnicode(cells[colBriefing] || '') : '';
    const rawPno = colPno !== -1 ? convertKrutiToUnicode(cells[colPno] || '') : '';
    const rawWeapon = colWeapon !== -1 ? convertKrutiToUnicode(cells[colWeapon] || '') : '';
    const rawBooth = colBooth !== -1 ? convertKrutiToUnicode(cells[colBooth] || '') : '';
    const rawVehicle = colVehicle !== -1 ? convertKrutiToUnicode(cells[colVehicle] || '') : '';

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

    if (zoneVal) currentZone = zoneVal;
    if (zonalVal) currentZonal = zonalVal;
    if (sectorVal) currentSector = sectorVal;
    if (sectorInchargeVal) currentSectorIncharge = sectorInchargeVal;
    if (dutyPlaceVal) currentDutyPlace = dutyPlaceVal;
    if (rawTime) currentTime = rawTime;

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

    if (!finalName && !mobNumber && !rawComposite && !rawName) continue;

    const rawRank = colRank !== -1 ? convertKrutiToUnicode(cells[colRank] || '') : '';
    const rank = resolvePoliceRank(rawRank, finalName);
    const cleanPno = rawPno ? rawPno.trim() : '';

    let finalThana = rawThana || compositeParsed?.posting || nameParsed?.posting || '';
    let finalDist = rawDistrict || compositeParsed?.district || nameParsed?.district || extractDistrictFromText(`${rawComposite} ${rawName} ${finalThana}`);

    if (finalDist && finalThana && finalThana.includes(finalDist)) {
      finalThana = finalThana.replace(new RegExp(`(?:जनपद\\s*)?${finalDist}`, 'gi'), '').trim();
    }

    if (!finalThana && (rawComposite || rawName)) {
      const sourceText = rawComposite || rawName;
      const parts = sourceText.split(/[,।]/).map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          if (/^\d{10}$/.test(part) || (finalDist && part.includes(finalDist))) continue;
          if (part.length >= 2) {
            finalThana = part;
            break;
          }
        }
      }
    }

    records.push({
      id: cleanPno ? cleanPno : `DUTY-${String(records.length + 1).padStart(4, '0')}`,
      pno: cleanPno,
      name: finalName || rawName || rawComposite || '-',
      raw_name: rawName,
      composite_details: rawComposite,
      rank: rank,
      mobile: mobNumber,
      posting: finalThana,
      district: finalDist,
      duty_place: dutyPlaceVal || currentDutyPlace,
      zone: zoneVal || currentZone,
      zonal_incharge: zonalVal || currentZonal,
      sector: sectorVal || currentSector,
      sector_incharge: sectorInchargeVal || currentSectorIncharge,
      shift: rawTime || currentTime,
      event_name: "",
      briefing_place: rawBriefing,
      weapon: rawWeapon ? rawWeapon.trim() : '',
      booth_no: rawBooth ? rawBooth.trim() : '',
      vehicle_no: rawVehicle ? rawVehicle.trim() : '',
      status: "Active"
    });
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
