import { classifyRank } from '../components/ForceDeploymentMatrix';

/**
 * Helper to clean officer name
 */
function cleanOfficerName(rawName = '', posting = '', district = '', mobile = '') {
  if (!rawName) return '';
  let cleaned = String(rawName).trim();
  cleaned = cleaned.replace(/\b[6-9]\d{9}\b/g, '');
  if (mobile) {
    const cleanMob = String(mobile).trim();
    if (cleanMob.length >= 5) {
      cleaned = cleaned.replace(new RegExp(`\\b${cleanMob}\\b`, 'g'), '');
    }
  }
  cleaned = cleaned.replace(/\(\s*(?:का0|उ0नि0|हे0का0|नि0|म0का0|म0उ0नि0|का०|उ०नि०|हे०कां०|नि०|कां०|हेकां|जवान)\s*\)/gi, '');
  const commaParts = cleaned.split(',').map(s => s.trim()).filter(Boolean);
  if (commaParts.length > 1) cleaned = commaParts[0];
  cleaned = cleaned.replace(/,\s*,/g, ',').replace(/\s*,\s*$/, '').replace(/^[\s,]+/, '').trim();
  return cleaned || rawName;
}

function formatDisplayDate(rawDate) {
  if (!rawDate) return '16.08.2026 से अग्रिम आदेश तक';
  if (rawDate.includes('T') && rawDate.includes('-')) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return `${d.toLocaleDateString('hi-IN')} से कार्यक्रम समाप्ति तक`;
      }
    } catch (e) {}
  }
  return rawDate;
}

export function printOfficialBookletDocument({
  records = [],
  eventTitle = '',
  eventSubtitle = '',
  eventStartDate = '',
  patrank = 'सुरक्षा-2026/ड्यूटी-आदेश',
  date = '',
  manualInstructions = {}
}) {
  const displayDate = date || new Date().toLocaleDateString('hi-IN');
  const displayEventDate = formatDisplayDate(eventStartDate);

  // Group records by Zone -> Sector -> Duty Place
  const groupedData = {};
  records.forEach(rec => {
    const z = (rec.zone || 'सामान्य जोन').trim();
    const s = (rec.sector || 'सामान्य सेक्टर').trim();
    const p = (rec.duty_place || 'सामान्य ड्यूटी स्थल').trim();

    if (!groupedData[z]) groupedData[z] = {};
    if (!groupedData[z][s]) groupedData[z][s] = {};
    if (!groupedData[z][s][p]) groupedData[z][s][p] = [];

    groupedData[z][s][p].push(rec);
  });

  // Calculate Zone-wise Matrix Summary
  const zoneMap = new Map();
  const grandTotal = { insp: 0, si: 0, wsi: 0, hc: 0, cp: 0, wcp: 0, traffic: 0, hg: 0, total: 0 };

  records.forEach(rec => {
    const z = (rec.zone || 'सामान्य जोन').trim();
    const rankCat = classifyRank(rec);

    if (!zoneMap.has(z)) {
      zoneMap.set(z, { zone: z, insp: 0, si: 0, wsi: 0, hc: 0, cp: 0, wcp: 0, traffic: 0, hg: 0, total: 0 });
    }
    const row = zoneMap.get(z);
    if (row[rankCat] !== undefined) row[rankCat] += 1;
    else row.cp += 1;
    row.total += 1;

    if (grandTotal[rankCat] !== undefined) grandTotal[rankCat] += 1;
    else grandTotal.cp += 1;
    grandTotal.total += 1;
  });

  const matrixRows = Array.from(zoneMap.values());

  // Dedicated Page 2: Large Matrix HTML Page
  let matrixHtml = `
    <div class="matrix-page">
      <div>
        <div class="matrix-page-header">
          <div class="matrix-page-heading">कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या</div>
          <div class="matrix-page-subheading">
            ${eventTitle} — 🛡️ ज़ोन-वार तैनात पुलिस बल विवरण
          </div>
          <div class="matrix-page-meta">
            <span>पत्रांक: <strong>${patrank || 'सुरक्षा-2026/ड्यूटी-आदेश'}</strong></span>
            <span>दिनांक: <strong>${displayDate}</strong></span>
          </div>
        </div>

        <div class="matrix-box">
          <table class="matrix-table">
            <thead>
              <tr>
                <th style="text-align:left; width: 25%;">जोन का नाम</th>
                <th>निरीक्षक</th>
                <th>उ०नि०</th>
                <th>म०उ०नि०</th>
                <th>हे०का०</th>
                <th>आरक्षी</th>
                <th>म०का०</th>
                <th>यातायात</th>
                <th>होमगार्ड</th>
                <th style="background:#fef08a; color:#713f12; font-weight:900; width: 10%;">कुल योग</th>
              </tr>
            </thead>
            <tbody>
              ${matrixRows.map(r => `
                <tr>
                  <td style="text-align:left; font-weight:bold; font-size:13px;">${r.zone}</td>
                  <td style="font-weight:bold; color:#b45309;">${r.insp || '—'}</td>
                  <td style="font-weight:bold;">${r.si || '—'}</td>
                  <td style="color:#7e22ce; font-weight:bold;">${r.wsi || '—'}</td>
                  <td style="font-weight:bold;">${r.hc || '—'}</td>
                  <td style="font-weight:bold;">${r.cp || '—'}</td>
                  <td style="color:#be123c; font-weight:bold;">${r.wcp || '—'}</td>
                  <td style="color:#1d4ed8; font-weight:bold;">${r.traffic || '—'}</td>
                  <td style="color:#047857; font-weight:bold;">${r.hg || '—'}</td>
                  <td style="background:#fffbeb; font-weight:900; font-size:14px;">${r.total}</td>
                </tr>
              `).join('')}
              <tr class="matrix-total-row">
                <td style="text-align:left; font-size:14px; font-weight:900;">समस्त कुल योग (Grand Total)</td>
                <td>${grandTotal.insp}</td>
                <td>${grandTotal.si}</td>
                <td>${grandTotal.wsi}</td>
                <td>${grandTotal.hc}</td>
                <td>${grandTotal.cp}</td>
                <td>${grandTotal.wcp}</td>
                <td>${grandTotal.traffic}</td>
                <td>${grandTotal.hg}</td>
                <td style="background:#fde047; font-weight:900; font-size:16px; color:#000;">${grandTotal.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="matrix-page-footer">
        <div style="text-align:left;">
          <div style="font-size:13px; font-weight:bold;">स्थान: अयोध्या पुलिस मुख्यालय, अयोध्या (उ०प्र०)</div>
          <div style="font-size:11px; color:#475569; font-family:monospace;">गोपनीय / केवल अधिकृत पुलिस बल हेतु</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:11px; color:#475569; font-style:italic; font-family:monospace;">[ अधिकृत हस्ताक्षरित ]</div>
          <div style="font-size:14px; font-weight:900; border-top:1.5px solid #000; padding-top:2px;">( वरिष्ठ पुलिस अधीक्षक )</div>
          <div style="font-size:12px; font-weight:bold;">जनपद अयोध्या</div>
        </div>
      </div>
    </div>
  `;

  // Generate Grouped Deployment Tables (Pages 3+)
  let deploymentHtml = '';
  Object.keys(groupedData).forEach((zoneName) => {
    const zoneInstruction = manualInstructions.zones?.[zoneName];
    const sampleZoneRec = (records || []).find(r => (r.zone || '').trim() === zoneName.trim() && (r.zonal_incharge || r.zonal));
    const zonalIncharge = sampleZoneRec?.zonal_incharge || sampleZoneRec?.zonal || '';
    const zonalSahyogarth = sampleZoneRec?.zonal_sahyogarth || sampleZoneRec?.zonal_assistant || '';

    deploymentHtml += `
      <div class="zone-block">
        <div class="zone-banner">
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px;">
            <span>🛡️ जोन: ${zoneName}</span>
            ${zonalIncharge ? `<span class="incharge-tag">👮 ज़ोनल प्रभारी: <strong>${zonalIncharge}</strong></span>` : ''}
            ${zonalSahyogarth ? `<span class="sahyogarth-tag">🤝 सहयोगार्थ: <strong>${zonalSahyogarth}</strong></span>` : ''}
          </div>
          <span style="font-size:11px; font-weight:bold; letter-spacing:1px; opacity:0.85;">OFFICIAL ZONE</span>
        </div>
        ${zoneInstruction ? `
          <div class="instruction-box zone-instruction">
            <div class="instruction-title">📋 विशेष ज़ोन निर्देश (${zoneName}):</div>
            <div class="instruction-body">${zoneInstruction}</div>
          </div>
        ` : ''}
    `;

    Object.keys(groupedData[zoneName]).forEach((sectorName) => {
      const sectorInstruction = manualInstructions.sectors?.[sectorName];
      const sampleSectorRec = (records || []).find(r => 
        (r.zone || '').trim() === zoneName.trim() && 
        (r.sector || '').trim() === sectorName.trim() && 
        (r.sector_incharge || r.sector_officer)
      );
      const sectorIncharge = sampleSectorRec?.sector_incharge || sampleSectorRec?.sector_officer || '';
      const sectorSahyogarth = sampleSectorRec?.sector_sahyogarth || sampleSectorRec?.sector_assistant || '';

      deploymentHtml += `
        <div class="sector-block">
          <div class="sector-banner">
            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px;">
              <span>🚩 सेक्टर: ${sectorName}</span>
              ${sectorIncharge ? `<span class="incharge-tag-sector">👮 सेक्टर प्रभारी: <strong>${sectorIncharge}</strong></span>` : ''}
              ${sectorSahyogarth ? `<span class="sahyogarth-tag">🤝 सहयोगार्थ: <strong>${sectorSahyogarth}</strong></span>` : ''}
            </div>
          </div>
          ${sectorInstruction ? `
            <div class="instruction-box sector-instruction">
              <div class="instruction-title">📋 सेक्टर सुरक्षा निर्देश (${sectorName}):</div>
              <div class="instruction-body">${sectorInstruction}</div>
            </div>
          ` : ''}
      `;

      Object.keys(groupedData[zoneName][sectorName]).forEach((placeName) => {
        const placeRecords = groupedData[zoneName][sectorName][placeName];
        const placeShift = placeRecords[0]?.shift || 'मेला / कार्यक्रम समयानुसार';
        const pointInstruction = manualInstructions.points?.[placeName];

        deploymentHtml += `
          <div class="duty-point-card">
            <div class="point-header">
              <div class="point-name">📍 <strong>ड्यूटी स्थल:</strong> ${placeName}</div>
              <div class="point-badge">तैनात बल: ${placeRecords.length}</div>
            </div>
            <div class="point-time">⏱️ <strong>समय / पाली:</strong> ${placeShift}</div>
            ${pointInstruction ? `
              <div class="point-instruction">📌 <strong>विशेष स्थल हिदायत:</strong> ${pointInstruction}</div>
            ` : ''}
            <table class="records-table">
              <thead>
                <tr>
                  <th style="width: 44px; text-align:center;">क्र०</th>
                  <th style="width: 28%;">नाम एवं पदनाम</th>
                  <th style="width: 18%; text-align:center;">मोबाईल नंबर</th>
                  <th style="width: 32%;">मूल तैनाती / थाना</th>
                  <th style="width: 22%;">गृह जनपद</th>
                </tr>
              </thead>
              <tbody>
                ${placeRecords.map((row, idx) => {
                  const cleanName = cleanOfficerName(row.name, row.posting, row.district, row.mobile);
                  return `
                    <tr>
                      <td style="text-align:center; font-weight:bold; font-size:12px; background:#f8fafc;">${idx + 1}</td>
                      <td style="font-weight:bold; font-size:13px; color:#000;">${cleanName}</td>
                      <td style="text-align:center; font-family:monospace; font-weight:bold; font-size:13px; color:#0f172a;">${row.mobile || '-'}</td>
                      <td style="font-size:12.5px; font-weight:600; color:#1e293b;">${row.posting || '-'}</td>
                      <td style="font-size:12.5px; font-weight:600; color:#1e293b;">${row.district || '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      });

      deploymentHtml += `</div>`; // Close sector-block
    });

    deploymentHtml += `</div>`; // Close zone-block
  });

  const generalEndInstruction = manualInstructions.generalEnd && manualInstructions.generalEnd.trim();

  // Full Pure HTML Document
  const fullHtml = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>${(eventTitle || 'ड्यूटी_पुस्तिका').replace(/\s+/g, '_')}_आधिकारिक_आदेश_अयोध्या</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com">
  <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 landscape;
      margin: 6mm 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: 'Mukta', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12.5px;
      line-height: 1.4;
      width: 100%;
    }

    /* ========================================= */
    /* PAGE 1: EXCLUSIVE FIRST PAGE COVER        */
    /* ========================================= */
    .cover-page {
      width: 100%;
      height: 190mm;
      max-height: 190mm;
      border: 4px double #000;
      border-radius: 10px;
      padding: 8mm 15mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      background: #ffffff;
      page-break-after: always !important;
      break-after: page !important;
    }
    .cover-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      font-size: 13px;
      font-weight: 700;
    }
    .cover-body {
      margin: auto 0;
      padding: 10px 0;
    }
    .police-emblem {
      width: 90px;
      height: 90px;
      object-fit: contain;
      margin: 0 auto 12px;
      display: block;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
    }
    .main-office-title {
      font-size: 26px;
      font-weight: 900;
      text-transform: uppercase;
      margin: 0 0 6px;
      color: #000;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }
    .sub-office-title {
      font-size: 15px;
      font-weight: 800;
      color: #334155;
      margin: 0 0 20px;
    }
    .event-title-card {
      max-width: 720px;
      margin: 0 auto;
      border: 3.5px solid #000;
      border-radius: 14px;
      padding: 20px 30px;
      background: #ffffff;
      box-shadow: 0 6px 12px -2px rgba(0,0,0,0.1);
    }
    .badge-pill {
      display: inline-block;
      background: #fef3c7;
      border: 1.5px solid #d97706;
      color: #78350f;
      font-weight: 900;
      font-size: 13px;
      padding: 5px 20px;
      border-radius: 9999px;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .event-name-heading {
      font-size: 34px;
      font-weight: 900;
      margin: 6px 0 8px;
      color: #000;
      line-height: 1.2;
    }
    .event-subtitle-text {
      font-size: 18px;
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 12px;
    }
    .event-duration-box {
      border-top: 1.5px dashed #64748b;
      padding-top: 10px;
      font-size: 16px;
      font-weight: 900;
      color: #000;
      font-family: monospace;
    }
    .cover-bottom-bar {
      border-top: 2px solid #000;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 12.5px;
      font-weight: 700;
    }

    /* ========================================= */
    /* PAGE 2: EXCLUSIVE MATRIX SUMMARY PAGE     */
    /* ========================================= */
    .matrix-page {
      width: 100%;
      height: 190mm;
      max-height: 190mm;
      border: 3.5px double #000;
      border-radius: 10px;
      padding: 8mm 12mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
      page-break-after: always !important;
      break-after: page !important;
    }
    .matrix-page-header {
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
      margin-bottom: 12px;
      text-align: center;
    }
    .matrix-page-heading {
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      color: #000;
    }
    .matrix-page-subheading {
      font-size: 14.5px;
      font-weight: 800;
      color: #0f172a;
      margin: 3px 0;
    }
    .matrix-page-meta {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      margin-top: 4px;
    }
    .matrix-page-footer {
      border-top: 2px solid #000;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 12.5px;
      font-weight: 700;
    }

    .matrix-box {
      border: 2px solid #000;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 6px;
    }
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      text-align: center;
    }
    .matrix-table th {
      background: #0f172a;
      color: #ffffff;
      border: 1px solid #000;
      padding: 7px 5px;
      font-weight: 900;
      font-size: 12.5px;
    }
    .matrix-table td {
      border: 1px solid #94a3b8;
      padding: 6px 5px;
    }
    .matrix-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .matrix-total-row td {
      background: #f1f5f9;
      font-weight: 900;
      border-top: 2px solid #000;
      padding: 8px 5px;
    }

    /* ========================================= */
    /* PAGE 3 ONWARDS: CONTENT & FIELD DUTIES    */
    /* ========================================= */
    .content-container {
      width: 100%;
    }

    .zone-block {
      margin-bottom: 8px;
    }
    .zone-banner {
      background: #0f172a;
      color: #fff;
      font-weight: 900;
      font-size: 14px;
      padding: 7px 12px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      border: 1.5px solid #000;
      page-break-after: avoid;
      break-after: avoid;
    }
    .incharge-tag {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #cbd5e1;
      font-size: 12px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .incharge-tag strong {
      color: #b45309;
    }
    .incharge-tag-sector {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #cbd5e1;
      font-size: 11.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .incharge-tag-sector strong {
      color: #0369a1;
    }
    .sahyogarth-tag {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #cbd5e1;
      font-size: 11.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .sahyogarth-tag strong {
      color: #047857;
    }

    .sector-block {
      margin-bottom: 6px;
    }
    .sector-banner {
      background: #f8fafc;
      border: 1.5px solid #94a3b8;
      border-left: 6px solid #1d4ed8;
      color: #0f172a;
      font-weight: 900;
      font-size: 13px;
      padding: 5px 10px;
      border-radius: 6px;
      margin-bottom: 6px;
      page-break-after: avoid;
      break-after: avoid;
    }

    .instruction-box {
      padding: 6px 12px;
      border-radius: 6px;
      margin-bottom: 6px;
      page-break-after: avoid;
      break-after: avoid;
    }
    .zone-instruction {
      background: #fffbeb;
      border: 1.5px solid #d97706;
      border-left: 5px solid #b45309;
    }
    .sector-instruction {
      background: #eff6ff;
      border: 1.5px solid #3b82f6;
      border-left: 5px solid #1d4ed8;
    }
    .instruction-title {
      font-weight: 900;
      font-size: 12.5px;
      margin-bottom: 3px;
      color: #1e293b;
    }
    .instruction-body {
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
      white-space: pre-line;
      line-height: 1.45;
    }

    .duty-point-card {
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 8px;
      background: #fff;
    }
    .point-header {
      background: #e2e8f0;
      border-bottom: 1px solid #0f172a;
      padding: 5px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      page-break-after: avoid;
      break-after: avoid;
    }
    .point-name {
      font-size: 13.5px;
      font-weight: 900;
      color: #000;
    }
    .point-badge {
      background: #0f172a;
      color: #fff;
      font-size: 11.5px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .point-time {
      background: #ffffff;
      padding: 3px 10px;
      font-size: 11.5px;
      font-weight: 700;
      color: #334155;
      border-bottom: 1px solid #cbd5e1;
      page-break-after: avoid;
      break-after: avoid;
    }
    .point-instruction {
      background: #fefce8;
      border-bottom: 1px solid #ca8a04;
      border-left: 4px solid #ca8a04;
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 600;
      color: #713f12;
      page-break-after: avoid;
      break-after: avoid;
    }

    .records-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }
    .records-table thead {
      display: table-header-group;
    }
    .records-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .records-table th {
      background: #cbd5e1;
      border-bottom: 1.5px solid #0f172a;
      border-right: 1px solid #94a3b8;
      padding: 5px 7px;
      font-weight: 900;
      color: #0f172a;
      font-size: 12px;
    }
    .records-table th:last-child {
      border-right: none;
    }
    .records-table td {
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      padding: 4.5px 7px;
      color: #0f172a;
      font-size: 12px;
    }
    .records-table td:last-child {
      border-right: none;
    }
    .records-table tr:nth-child(even) {
      background: #f8fafc;
    }

    .general-instruction-box {
      border: 2px solid #0f172a;
      border-radius: 8px;
      padding: 10px 14px;
      background: #f8fafc;
      margin-top: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .general-instruction-title {
      font-weight: 900;
      font-size: 13.5px;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 6px;
      text-transform: uppercase;
      color: #000;
    }
    .general-instruction-text {
      font-size: 12.5px;
      font-weight: 600;
      color: #0f172a;
      white-space: pre-line;
      line-height: 1.55;
    }

    .final-signature-block {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 13px;
      font-weight: 700;
      page-break-inside: avoid;
      break-inside: avoid;
      border-top: 1.5px solid #0f172a;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <!-- ======================================================== -->
  <!-- PAGE 1: EXCLUSIVE FIRST COVER PAGE (NO DUTY TABLES)      -->
  <!-- ======================================================== -->
  <div class="cover-page">
    <div class="cover-top-bar">
      <div style="text-align:left;">
        <div>पत्रांक सं०: <span style="font-weight:900;">${patrank || 'सुरक्षा-2026/ड्यूटी-आदेश'}</span></div>
        <div style="font-size:11px; color:#4b5563; font-weight:600;">अयोध्या पुलिस सुरक्षा आदेश</div>
      </div>
      <div style="text-align:right;">
        <div>दिनांक: <span style="font-weight:900;">${displayDate}</span></div>
        <div style="font-size:11px; color:#4b5563; font-weight:600;">जनपद: अयोध्या</div>
      </div>
    </div>

    <div class="cover-body">
      <img src="/badge.png" alt="Police Emblem" class="police-emblem" />
      <h1 class="main-office-title">कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या</h1>
      <h2 class="sub-office-title">अयोध्या पुलिस • सुरक्षा एवं कानून व्यवस्था प्रकोष्ठ</h2>

      <div class="event-title-card">
        <div class="badge-pill">⭐ आधिकारिक ड्यूटी आदेश पुस्तिका ⭐</div>
        <div class="event-name-heading">${eventTitle}</div>
        <div class="event-subtitle-text">के पावन अवसर पर पुलिस प्रबन्ध एवं सुरक्षा व्यवस्था</div>
        <div class="event-duration-box">📅 समयावधि: ${displayEventDate}</div>
      </div>
    </div>

    <div class="cover-bottom-bar">
      <div style="text-align:left;">
        <div style="font-size:13px; font-weight:bold;">स्थान: अयोध्या पुलिस मुख्यालय, अयोध्या (उ०प्र०)</div>
        <div style="font-size:11px; color:#6b7280; font-family:monospace;">गोपनीय / केवल अधिकृत पुलिस बल हेतु</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:11px; color:#6b7280; font-style:italic; font-family:monospace;">[ अधिकृत हस्ताक्षरित ]</div>
        <div style="font-size:14px; font-weight:900; border-top:1.5px solid #000; padding-top:2px;">( वरिष्ठ पुलिस अधीक्षक )</div>
        <div style="font-size:12px; font-weight:bold;">जनपद अयोध्या</div>
      </div>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- PAGE 2: EXCLUSIVE FORCE SUMMARY MATRIX PAGE              -->
  <!-- ======================================================== -->
  ${matrixHtml}

  <!-- ======================================================== -->
  <!-- PAGE 3 ONWARDS: DEPLOYMENT DETAIL TABLES (FIELD DUTIES)  -->
  <!-- ======================================================== -->
  <div class="content-container">
    ${deploymentHtml}

    ${generalEndInstruction ? `
      <div class="general-instruction-box">
        <div class="general-instruction-title">महत्वपूर्ण सामान्य सुरक्षा निर्देश एवं दिशा-निर्देश:</div>
        <div class="general-instruction-text">${generalEndInstruction}</div>
      </div>
    ` : ''}

    <div class="final-signature-block">
      <div style="text-align:left; max-width:65%;">
        <div style="font-weight:900; font-size:12.5px; margin-bottom:3px;">प्रतिलिपि: निम्नलिखित को सूचनार्थ एवं आवश्यक कार्यवाही हेतु प्रेषित:-</div>
        <div style="font-size:12px; font-weight:600; color:#1e293b; white-space:pre-line; line-height:1.45;">
          ${manualInstructions.pratilipi ? manualInstructions.pratilipi : '1. समस्त संबंधित अधिकारी/कर्मचारी।\n2. कंट्रोल रूम सुरक्षा व्यवस्था अयोध्या।'}
        </div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:11px; color:#6b7280; font-style:italic; font-family:monospace;">[ Digitally Signed ]</div>
        <div style="font-size:14px; font-weight:900; border-top:1.5px solid #000; padding-top:2px;">( वरिष्ठ पुलिस अधीक्षक )</div>
        <div style="font-size:12px; font-weight:bold;">जनपद अयोध्या</div>
      </div>
    </div>
  </div>

</body>
</html>`;

  // Print via isolated iframe to ensure 100% clean formatting and zero app styles bleed
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(fullHtml);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1500);
  }, 400);
}
