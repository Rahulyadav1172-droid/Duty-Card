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
    const worksheet = workbook.Sheets[firstSheetName];
    
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
    // 1. Officer Name column (prioritize explicit NAME column)
    const nameCol = getRowValueByPattern(
      row,
      ['name', 'officer name', 'नाम', 'नाम (name)', 'name (नाम)', 'कर्मचारी नाम', 'अधिकारी नाम'],
      ['pad', 'पद', 'rank', 'पिता', 'father', 'zone', 'जोन', 'sector', 'सेक्टर', 'incharge', 'प्रभारी', 'place', 'स्थल', 'district', 'जनपद', 'posting']
    );

    // Fallback composite column if single name is absent
    const compositeCol = getRowValueByPattern(row, [
      'name and posting place district',
      'name thana district mob',
      'name_thana_district_mob',
      'name thana district mobile',
      'name thana district',
      'name thana'
    ]);

    // 2. Mobile column
    const rawMob = getRowValueByPattern(row, [
      'mob', 'mobile', 'मोबाइल', 'फ़ोन', 'फोन', 'mobile (मोबाइल)', 'phone', 'contact'
    ]);
    const mobCol = cleanMobileNumber(rawMob);

    // 3. Zone and Zonal Incharge
    const zone = getRowValueByPattern(
      row,
      ['zone', 'जोन', 'zone name', 'जोन नाम', 'zone no', 'जोन सं', 'जोन (zone)', 'zone (जोन)'],
      ['incharge', 'प्रभारी', 'officer', 'अधिकारी', 'magistrate', 'मजिस्ट्रेट', 'sahyogarth', 'सहयोगार्थ']
    );
    const zonal = getRowValueByPattern(row, [
      'zonal incharge', 'zonalincharge', 'zonal in charge', 'zonal in-charge',
      'zone incharge', 'zone in charge', 'zonal officer', 'zonal_officer',
      'zonal magistrate', 'जोनाल प्रभारी', 'जोनल प्रभारी', 'जोन प्रभारी',
      'जोनाल अधिकारी', 'जोनल अधिकारी', 'जोनाल मजिस्ट्रेट', 'जोनल मजिस्ट्रेट',
      'zonal', 'जोनाल', 'जोनल', 'जोनल प्रभारी (zonal incharge)', 'zonal incharge (जोनल प्रभारी)'
    ], ['sahyogarth', 'सहयोगार्थ']);

    const zonalSahyogarth = getRowValueByPattern(row, [
      'zonal in sahyogarth', 'zonal sahyogarth', 'जोनल सहयोगार्थ', 'जोनाल सहयोगार्थ', 'zonal_sahyogarth'
    ]);

    // 4. Sector and Sector Incharge
    const sector = getRowValueByPattern(
      row,
      ['sector', 'सेक्टर', 'sector name', 'सेक्टर नाम', 'sector no', 'सेक्टर सं', 'सेक्टर संख्या', 'सेक्टर (sector)', 'sector (सेक्टर)'],
      ['incharge', 'प्रभारी', 'officer', 'अधिकारी', 'magistrate', 'मजिस्ट्रेट', 'sahyogarth', 'सहयोगार्थ']
    );
    const sectorIncharge = getRowValueByPattern(
      row,
      [
        'sector incharge', 'sectorincharge', 'sector in charge', 'sector in-charge',
        'sector officer', 'sector_officer', 'sector magistrate', 'sector_magistrate',
        'सेक्टर प्रभारी', 'सेक्टर अधिकारी', 'सेक्टर मजिस्ट्रेट',
        'सेक्टर/प्रभारी', 'सेक्टर / प्रभारी', 'sector/incharge', 'sector / incharge',
        'प्रभारी सेक्टर', 'incharge', 'प्रभारी',
        'सेक्टर प्रभारी (sector incharge)', 'sector incharge (सेक्टर प्रभारी)'
      ],
      ['zonal', 'जोनाल', 'जोनल', 'zone', 'जोन', 'sahyogarth', 'सहयोगार्थ']
    );

    const sectorSahyogarth = getRowValueByPattern(row, [
      'sector in sahyogarth', 'sector sahyogarth', 'सेक्टर सहयोगार्थ', 'sector_sahyogarth'
    ]);

    // 5. Duty Place
    const dutyPlace = getRowValueByPattern(row, [
      'duty place', 'dutyplace', 'duty_place', 'duty point', 'ड्यूटी स्थल', 'ड्यूटी स्थान', 'स्थान', 'स्थल',
      'ड्यूटी प्वाइंट', 'ड्यूटी स्थल (duty point)', 'duty place (ड्यूटी स्थल)'
    ]);

    // 6. Posting Place / Thana
    const thanaCol = getRowValueByPattern(row, [
      'posting place', 'posting_place', 'posting', 'मूल तैनाती', 'तैनाती', 'मूल तैनाती / थाना', 'मूल तैनाती/थाना',
      'thana', 'थाना', 'थाना / तैनाती', 'मूल तैनाती / थाना (posting)', 'posting / thana'
    ]);

    // 7. District
    const districtCol = getRowValueByPattern(row, ['district', 'जनपद', 'जिला', 'जनपद (district)', 'district (जनपद)']);

    // 8. Date and Time (Shift)
    const timeCol = getRowValueByPattern(row, [
      'date and time', 'date & time', 'date_and_time', 'time', 'समय', 'दिनांक', 'shift', 'पाली', 'ड्यूटी समय', 'शिफ्ट', 'ड्यूटी समय / शिफ्ट', 'ड्यूटी समय/शिफ्ट',
      'duty time', 'shift time', 'ड्यूटी समय / शिफ्ट (shift)'
    ]);

    // 9. Rank (Optional column - do NOT guess or default if blank)
    const rankCol = getRowValueByPattern(row, ['rank', 'पद', 'पदनाम', 'पद नाम', 'designation']);
    const rank = rankCol ? rankCol.trim() : '';

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

    // Use NAME column first as requested by user
    const displayName = nameCol || compositeCol || (mobCol ? `पुलिसकर्मी (${mobCol})` : '');
    const finalMobile = mobCol || cleanMobileNumber(nameCol) || cleanMobileNumber(compositeCol);

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

    records.push({
      id: cleanPnoVal ? cleanPnoVal : `DUTY-${String(records.length + 1).padStart(4, '0')}`,
      pno: cleanPnoVal,
      name: displayName,
      raw_name: nameCol,
      composite_details: compositeCol,
      rank: rank,
      mobile: finalMobile,
      posting: thanaCol,
      district: districtCol,
      duty_place: dutyPlace,
      zone: cleanZone,
      zonal_incharge: cleanZonalIncharge,
      zonal_sahyogarth: zonalSahyogarth || '',
      sector: cleanSector,
      sector_incharge: cleanSectorIncharge,
      sector_sahyogarth: sectorSahyogarth || '',
      shift: timeCol,
      event_name: eventCol,
      briefing_place: briefingCol,
      weapon: weaponCol ? String(weaponCol).trim() : '',
      booth_no: boothCol ? String(boothCol).trim() : '',
      vehicle_no: vehicleCol ? String(vehicleCol).trim() : '',
      status: "Active"
    });
  });

  // Pass 2: Propagate Sector and Zone Incharges and Sahyogarth across the same sector / zone
  const sectorInchargeMap = new Map();
  const zoneInchargeMap = new Map();
  const sectorSahyogarthMap = new Map();
  const zoneSahyogarthMap = new Map();

  records.forEach(r => {
    const s = (r.sector || '').trim().toLowerCase();
    const sInc = (r.sector_incharge || '').trim();
    if (s && sInc && sInc !== '-' && !sectorInchargeMap.has(s)) {
      sectorInchargeMap.set(s, r.sector_incharge);
    }
    const sSah = (r.sector_sahyogarth || '').trim();
    if (s && sSah && sSah !== '-' && !sectorSahyogarthMap.has(s)) {
      sectorSahyogarthMap.set(s, r.sector_sahyogarth);
    }

    const z = (r.zone || '').trim().toLowerCase();
    const zInc = (r.zonal_incharge || '').trim();
    if (z && zInc && zInc !== '-' && !zoneInchargeMap.has(z)) {
      zoneInchargeMap.set(z, r.zonal_incharge);
    }
    const zSah = (r.zonal_sahyogarth || '').trim();
    if (z && zSah && zSah !== '-' && !zoneSahyogarthMap.has(z)) {
      zoneSahyogarthMap.set(z, r.zonal_sahyogarth);
    }
  });

  records.forEach(r => {
    const s = (r.sector || '').trim().toLowerCase();
    if (s && (!r.sector_incharge || r.sector_incharge === '-') && sectorInchargeMap.has(s)) {
      r.sector_incharge = sectorInchargeMap.get(s);
    }
    if (s && (!r.sector_sahyogarth || r.sector_sahyogarth === '-') && sectorSahyogarthMap.has(s)) {
      r.sector_sahyogarth = sectorSahyogarthMap.get(s);
    }

    const z = (r.zone || '').trim().toLowerCase();
    if (z && (!r.zonal_incharge || r.zonal_incharge === '-') && zoneInchargeMap.has(z)) {
      r.zonal_incharge = zoneInchargeMap.get(z);
    }
    if (z && (!r.zonal_sahyogarth || r.zonal_sahyogarth === '-') && zoneSahyogarthMap.has(z)) {
      r.zonal_sahyogarth = zoneSahyogarthMap.get(z);
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
  let currentZonalSahyogarth = "";
  let currentSector = "";
  let currentSectorIncharge = "";
  let currentSectorSahyogarth = "";
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
    h.includes('name and posting place district') || 
    h.includes('name posting district') || 
    h.includes('name thana district mob') || 
    h.includes('name_thana_district_mob') || 
    (h.includes('name') && h.includes('mob') && h.includes('thana'))
  );
  let colName = headers.findIndex(h => (h === 'name' || h === 'नाम' || h.includes('नाम') || h.includes('name')) && !h.includes('पद') && !h.includes('rank') && !h.includes('पिता') && !h.includes('father') && !h.includes('जोन') && !h.includes('zone') && !h.includes('सेक्टर') && !h.includes('sector') && !h.includes('स्थान') && !h.includes('place') && !h.includes('प्रभारी') && !h.includes('incharge'));
  let colMob = headers.findIndex(h => h === 'mob' || h === 'mobile' || h === 'मोबाइल' || h.includes('mobile') || h.includes('मोबाइल') || h.includes('mob') || h.includes('phone') || h.includes('contact'));
  let colZone = headers.findIndex(h => 
    h === 'zone' || h === 'जोन' || 
    ((h.includes('zone') || h.includes('जोन')) && !h.includes('incharge') && !h.includes('प्रभारी') && !h.includes('officer') && !h.includes('अधिकारी'))
  );
  let colZonal = headers.findIndex(h => 
    h.includes('zonal incharge') || h.includes('zonalincharge') || h.includes('zone incharge') ||
    h.includes('जोनाल प्रभारी') || h.includes('जोनल प्रभारी') || h.includes('जोन प्रभारी') ||
    h.includes('zonal') || h.includes('जोनाल') || h.includes('जोनल')
  );
  let colZonalSahyogarth = headers.findIndex(h => 
    h.includes('zonal in sahyogarth') || h.includes('zonal sahyogarth') || h.includes('जोनल सहयोगार्थ') || h.includes('जोनाल सहयोगार्थ')
  );
  let colSector = headers.findIndex(h => 
    h === 'sector' || h === 'सेक्टर' || 
    ((h.includes('sector') || h.includes('सेक्टर')) && 
     !h.includes('incharge') && !h.includes('प्रभारी') && !h.includes('officer') && !h.includes('अधिकारी') && !h.includes('magistrate') && !h.includes('मजिस्ट्रेट') && !h.includes('sahyogarth') && !h.includes('सहयोगार्थ'))
  );
  let colSectorIncharge = headers.findIndex(h => 
    h.includes('sector incharge') || h.includes('sectorincharge') || h.includes('sector in-charge') ||
    h.includes('sector officer') || h.includes('sector_officer') ||
    h.includes('sector magistrate') || h.includes('sector_magistrate') ||
    h.includes('सेक्टर प्रभारी') || h.includes('सेक्टर अधिकारी') || h.includes('सेक्टर मजिस्ट्रेट') ||
    h.includes('प्रभारी सेक्टर') || h.includes('सेक्टर/प्रभारी') || h.includes('सेक्टर / प्रभारी') ||
    (h.includes('incharge') && !h.includes('zone') && !h.includes('zonal')) ||
    (h.includes('प्रभारी') && !h.includes('जोन') && !h.includes('जोनाल'))
  );
  let colSectorSahyogarth = headers.findIndex(h => 
    h.includes('sector in sahyogarth') || h.includes('sector sahyogarth') || h.includes('सेक्टर सहयोगार्थ')
  );
  let colDutyPlace = headers.findIndex(h => h.includes('duty place') || h.includes('duty_place') || h.includes('स्थान') || h.includes('duty point') || h.includes('स्थल') || h.includes('ड्यूटी स्थल'));
  let colRank = headers.findIndex(h => h === 'rank' || h === 'पद' || h === 'पदनाम' || h === 'पद नाम' || h.includes('designation') || h.includes('पद') || h.includes('rank'));
  let colThana = headers.findIndex(h => h === 'thana' || h === 'थाना' || h.includes('thana') || h.includes('थाना') || h.includes('तैनाती') || h.includes('posting'));
  let colDistrict = headers.findIndex(h => h === 'district' || h === 'जनपद' || h === 'जिला' || h.includes('district') || h.includes('जनपद') || h.includes('जिला'));
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
    let zonalSahyogarthVal = colZonalSahyogarth !== -1 ? convertKrutiToUnicode(cells[colZonalSahyogarth] || '') : '';
    let sectorVal = colSector !== -1 ? convertKrutiToUnicode(cells[colSector] || '') : '';
    let sectorInchargeVal = colSectorIncharge !== -1 ? convertKrutiToUnicode(cells[colSectorIncharge] || '') : '';
    let sectorSahyogarthVal = colSectorSahyogarth !== -1 ? convertKrutiToUnicode(cells[colSectorSahyogarth] || '') : '';
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
    if (zonalSahyogarthVal) currentZonalSahyogarth = zonalSahyogarthVal;
    if (sectorVal) currentSector = sectorVal;
    if (sectorInchargeVal) currentSectorIncharge = sectorInchargeVal;
    if (sectorSahyogarthVal) currentSectorSahyogarth = sectorSahyogarthVal;
    if (dutyPlaceVal) currentDutyPlace = dutyPlaceVal;
    if (rawTime) currentTime = rawTime;

    // Prioritize explicit NAME column as requested by user
    const displayName = rawName.trim() || rawComposite.trim() || (rawMob ? `पुलिसकर्मी (${rawMob})` : '');
    const mobNumber = rawMob || cleanMobileNumber(rawName) || cleanMobileNumber(rawComposite);

    if (!displayName && !mobNumber) continue;

    const rawRank = colRank !== -1 ? convertKrutiToUnicode(cells[colRank] || '') : '';
    const rank = rawRank ? rawRank.trim() : '';
    const cleanPno = rawPno ? rawPno.trim() : '';

    records.push({
      id: cleanPno ? cleanPno : `DUTY-${String(records.length + 1).padStart(4, '0')}`,
      pno: cleanPno,
      name: displayName,
      raw_name: rawName,
      composite_details: rawComposite,
      rank: rank,
      mobile: mobNumber,
      posting: rawThana,
      district: rawDistrict,
      duty_place: dutyPlaceVal || currentDutyPlace,
      zone: zoneVal || currentZone,
      zonal_incharge: zonalVal || currentZonal,
      zonal_sahyogarth: zonalSahyogarthVal || currentZonalSahyogarth || '',
      sector: sectorVal || currentSector,
      sector_incharge: sectorInchargeVal || currentSectorIncharge,
      sector_sahyogarth: sectorSahyogarthVal || currentSectorSahyogarth || '',
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
  const sectorSahyogarthMap = new Map();
  const zoneSahyogarthMap = new Map();

  records.forEach(r => {
    const s = (r.sector || '').trim().toLowerCase();
    const sInc = (r.sector_incharge || '').trim();
    if (s && sInc && sInc !== '-' && !sectorInchargeMap.has(s)) {
      sectorInchargeMap.set(s, r.sector_incharge);
    }
    const sSah = (r.sector_sahyogarth || '').trim();
    if (s && sSah && sSah !== '-' && !sectorSahyogarthMap.has(s)) {
      sectorSahyogarthMap.set(s, r.sector_sahyogarth);
    }

    const z = (r.zone || '').trim().toLowerCase();
    const zInc = (r.zonal_incharge || '').trim();
    if (z && zInc && zInc !== '-' && !zoneInchargeMap.has(z)) {
      zoneInchargeMap.set(z, r.zonal_incharge);
    }
    const zSah = (r.zonal_sahyogarth || '').trim();
    if (z && zSah && zSah !== '-' && !zoneSahyogarthMap.has(z)) {
      zoneSahyogarthMap.set(z, r.zonal_sahyogarth);
    }
  });

  records.forEach(r => {
    const s = (r.sector || '').trim().toLowerCase();
    if (s && (!r.sector_incharge || r.sector_incharge === '-') && sectorInchargeMap.has(s)) {
      r.sector_incharge = sectorInchargeMap.get(s);
    }
    if (s && (!r.sector_sahyogarth || r.sector_sahyogarth === '-') && sectorSahyogarthMap.has(s)) {
      r.sector_sahyogarth = sectorSahyogarthMap.get(s);
    }

    const z = (r.zone || '').trim().toLowerCase();
    if (z && (!r.zonal_incharge || r.zonal_incharge === '-') && zoneInchargeMap.has(z)) {
      r.zonal_incharge = zoneInchargeMap.get(z);
    }
    if (z && (!r.zonal_sahyogarth || r.zonal_sahyogarth === '-') && zoneSahyogarthMap.has(z)) {
      r.zonal_sahyogarth = zoneSahyogarthMap.get(z);
    }
  });

  return records;
}
