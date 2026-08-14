import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { convertKrutiToUnicode } from './kruti2unicode';

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
function getRowValueByPattern(row, patternKeywords) {
  const keys = Object.keys(row);
  
  // 1. Try exact/normalized pattern match
  for (const k of keys) {
    const cleanKey = k.trim().toLowerCase().replace(/[\s\_\-\.]+/g, ' ');
    if (patternKeywords.some(kw => cleanKey === kw || cleanKey.includes(kw))) {
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
    // 1. Prioritize composite column "name thana district mob" for Officer Name & Details
    const compositeCol = getRowValueByPattern(row, [
      'name thana district mob',
      'name_thana_district_mob',
      'name thana district mobile',
      'name thana district',
      'name thana'
    ]);

    // 2. Standard single name column
    const nameCol = getRowValueByPattern(row, ['name', 'नाम']);

    // 3. Mobile column (for mobile search)
    const rawMob = getRowValueByPattern(row, ['mob', 'mobile', 'मोबाइल', 'फ़ोन', 'फोन']);
    const mobCol = cleanMobileNumber(rawMob);

    // 4. Other fields
    const zone = getRowValueByPattern(row, ['zone', 'जोन']);
    const zonal = getRowValueByPattern(row, ['zonal incharge', 'zonalincharge', 'zonal', 'जोनाल प्रभारी', 'जोनाल']);
    const sector = getRowValueByPattern(row, ['sector', 'सेक्टर']);
    const sectorIncharge = getRowValueByPattern(row, ['sector incharge', 'sectorincharge', 'सेक्टर प्रभारी']);
    const dutyPlace = getRowValueByPattern(row, ['duty place', 'dutyplace', 'duty_place', 'स्थान', 'स्थल']);

    const thanaCol = getRowValueByPattern(row, ['thana', 'थाना']);
    const districtCol = getRowValueByPattern(row, ['district', 'जनपद', 'जिला']);
    const timeCol = getRowValueByPattern(row, ['time', 'समय', 'दिनांक']);
    const briefingCol = getRowValueByPattern(row, ['briefing place', 'briefing', 'ब्रीफिंग का स्थान', 'ब्रीफिंग']);
    const eventCol = getRowValueByPattern(row, ['event', 'event name', 'ड्यूटी का प्रकार']);

    if (!nameCol && !compositeCol && !mobCol && !dutyPlace) return;

    // Use "name thana district mob" column content as officer name/details FIRST as requested by user
    const displayName = compositeCol || nameCol || (mobCol ? `पुलिसकर्मी (${mobCol})` : '');
    const finalMobile = mobCol || cleanMobileNumber(compositeCol) || cleanMobileNumber(nameCol);

    let rank = "का0";
    if (displayName.includes("उ0नि0") || displayName.includes("उ.नि.")) rank = "उ0नि0";
    else if (displayName.includes("हे0का0") || displayName.includes("हे.का.")) rank = "हे0का0";
    else if (displayName.includes("म0का0") || displayName.includes("म.का.")) rank = "म0का0";
    else if (displayName.includes("नि0") || displayName.includes("नि.")) rank = "नि0";
    else if (displayName.includes("क्षेत्राधिकारी") || displayName.includes("सीओ")) rank = "क्षेत्राधिकारी";

    records.push({
      id: `DUTY-${String(records.length + 1).padStart(4, '0')}`,
      name: displayName,
      raw_name: nameCol,
      composite_details: compositeCol,
      rank: rank,
      mobile: finalMobile,
      posting: thanaCol,
      district: districtCol,
      duty_place: dutyPlace,
      zone: zone,
      zonal_incharge: zonal,
      sector: sector,
      sector_incharge: sectorIncharge,
      shift: timeCol,
      event_name: eventCol,
      briefing_place: briefingCol,
      status: "Active"
    });
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

  let colComposite = headers.findIndex(h => h.includes('name thana district mob') || h.includes('name_thana_district_mob') || (h.includes('name') && h.includes('mob') && h.includes('thana')));
  let colName = headers.findIndex(h => h === 'name' || h === 'नाम');
  let colMob = headers.findIndex(h => h === 'mob' || h === 'mobile' || h === 'मोबाइल');
  let colZone = headers.findIndex(h => h === 'zone' || h === 'जोन');
  let colZonal = headers.findIndex(h => h.includes('zonal') || h.includes('जोनाल'));
  let colSector = headers.findIndex(h => h === 'sector' || (h.includes('sector') && !h.includes('incharge')));
  let colSectorIncharge = headers.findIndex(h => h.includes('sector incharge') || h.includes('sectorincharge') || h.includes('सेक्टर प्रभारी'));
  let colDutyPlace = headers.findIndex(h => h.includes('duty place') || h.includes('duty_place') || h.includes('स्थान'));
  let colThana = headers.findIndex(h => h === 'thana' || h === 'थाना');
  let colDistrict = headers.findIndex(h => h === 'district' || h === 'जनपद' || h === 'जिला');
  let colTime = headers.findIndex(h => h.includes('time') || h.includes('समय') || h.includes('दिनांक'));
  let colBriefing = headers.findIndex(h => h.includes('briefing') || h.includes('ब्रीफिंग'));

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

    const zoneVal = colZone !== -1 ? convertKrutiToUnicode(cells[colZone] || '') : '';
    const zonalVal = colZonal !== -1 ? convertKrutiToUnicode(cells[colZonal] || '') : '';
    const sectorVal = colSector !== -1 ? convertKrutiToUnicode(cells[colSector] || '') : '';
    const sectorInchargeVal = colSectorIncharge !== -1 ? convertKrutiToUnicode(cells[colSectorIncharge] || '') : '';
    const dutyPlaceVal = colDutyPlace !== -1 ? convertKrutiToUnicode(cells[colDutyPlace] || '') : '';

    const rawThana = colThana !== -1 ? convertKrutiToUnicode(cells[colThana] || '') : '';
    const rawDistrict = colDistrict !== -1 ? convertKrutiToUnicode(cells[colDistrict] || '') : '';
    const rawTime = colTime !== -1 ? convertKrutiToUnicode(cells[colTime] || '') : '';
    const rawBriefing = colBriefing !== -1 ? convertKrutiToUnicode(cells[colBriefing] || '') : '';

    if (zoneVal) currentZone = zoneVal;
    if (zonalVal) currentZonal = zonalVal;
    if (sectorVal) currentSector = sectorVal;
    if (sectorInchargeVal) currentSectorIncharge = sectorInchargeVal;
    if (dutyPlaceVal) currentDutyPlace = dutyPlaceVal;
    if (rawTime) currentTime = rawTime;

    const displayName = rawComposite.trim() || rawName.trim() || (rawMob ? `पुलिसकर्मी (${rawMob})` : '');
    const mobNumber = rawMob || cleanMobileNumber(rawComposite);

    if (!displayName && !mobNumber) continue;

    let rank = "का0";
    if (displayName.includes("उ0नि0") || displayName.includes("उ.नि.")) rank = "उ0नि0";
    else if (displayName.includes("हे0का0") || displayName.includes("हे.का.")) rank = "हे0का0";
    else if (displayName.includes("म0का0") || displayName.includes("म.का.")) rank = "म0का0";
    else if (displayName.includes("नि0") || displayName.includes("नि.")) rank = "नि0";
    else if (displayName.includes("क्षेत्राधिकारी")) rank = "क्षेत्राधिकारी";

    records.push({
      id: `DUTY-${String(records.length + 1).padStart(4, '0')}`,
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
      sector: sectorVal || currentSector,
      sector_incharge: sectorInchargeVal || currentSectorIncharge,
      shift: rawTime || currentTime,
      event_name: "",
      briefing_place: rawBriefing,
      status: "Active"
    });
  }

  return records;
}
