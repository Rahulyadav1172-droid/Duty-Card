// Dedicated high-speed isolated Legal print engine supporting Election 2-in-1 (with Co-deployed Force), 4-in-1, and 6-in-1 layouts
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

export function printLegalBulk({
  records = [],
  eventTitle = '',
  eventSubtitle = '',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  customNote = '',
  isNoteEnabled = true,
  customBriefing = '',
  isBriefingEnabled = true,
  layoutMode = 6, // 2 (Election Special with Co-force), 4, or 6 cards per Legal page
  includeCoForce = true
}) {
  try {
    const validRecords = (records || []).filter(r => r && (r.name || r.id));
    if (validRecords.length === 0) {
      alert('प्रिंट करने हेतु कोई रिकॉर्ड उपलब्ध नहीं है।');
      return;
    }

    const is2In1 = layoutMode === 2;
    const is4In1 = layoutMode === 4;
    const CARDS_PER_PAGE = is2In1 ? 2 : (is4In1 ? 4 : 6);
    const totalPages = Math.ceil(validRecords.length / CARDS_PER_PAGE);

    // Modern crisp vector SVG icons (replacing old pixelated emojis)
    const phoneSvg = `
      <svg class="icon-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
      </svg>
    `;

    const usersSvg = `
      <svg class="icon-users" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    `;

    let pagesHtml = '';

    for (let p = 0; p < totalPages; p++) {
      const pageRecords = validRecords.slice(p * CARDS_PER_PAGE, (p + 1) * CARDS_PER_PAGE);

      let cardsHtml = '';
      for (let c = 0; c < CARDS_PER_PAGE; c++) {
        const duty = pageRecords[c];
        if (!duty) {
          cardsHtml += `
            <div class="duty-card empty-slot">
              <div class="empty-text">स्थान रिक्त (Blank Slot)</div>
            </div>
          `;
          continue;
        }

        const activeNote = (isNoteEnabled !== false && customNote) ? customNote : (isNoteEnabled ? (duty.note || '') : '');
        const activeBriefing = (isBriefingEnabled !== false && customBriefing) ? customBriefing : (isBriefingEnabled ? (duty.briefing_place || '') : '');

        // Find co-deployed force at the same duty place
        const coForceList = validRecords.filter(r => 
          r && 
          r.id !== duty.id && 
          (r.duty_place || '').trim() && 
          (r.duty_place || '').trim().toLowerCase() === (duty.duty_place || '').trim().toLowerCase()
        );

        const photoHtml = duty.photo
          ? `<img src="${duty.photo}" class="officer-photo" />`
          : `
            <div class="photo-placeholder">
              <svg class="photo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>पासपोर्ट फोटो</span>
            </div>
          `;

        const signHtml = signatureImg
          ? `<img src="${signatureImg}" class="sign-img" />`
          : `<div class="sign-text">(हस्ताक्षरित)</div>`;

        // Exact QR Code Content requested: name, mobile, mul tainati, district, duty point, auth code
        let qrSvgHtml = '';
        try {
          const authCode = (duty.id && !String(duty.id).toUpperCase().startsWith('DUTY-') ? String(duty.id) : '') || `AUTH-${Math.abs(hashCode(duty.name + (duty.mobile || '') + (duty.duty_place || ''))).toString(36).toUpperCase()}`;

          const qrPayload = [
            `नाम: ${(duty.name || '').trim()}`,
            `मोबाइल: ${(duty.mobile || '').trim()}`,
            `मूल तैनाती: ${(duty.posting || '').trim()}`,
            `जिला: ${(duty.district || '').trim()}`,
            `ड्यूटी पॉइंट: ${(duty.duty_place || '').trim()}`,
            `सत्यापन कोड: ${authCode}`
          ].join('\n');

          qrSvgHtml = renderToString(
            React.createElement(QRCodeSVG, {
              value: qrPayload,
              size: is2In1 ? 52 : (is4In1 ? 42 : 32),
              level: 'L',
              includeMargin: false
            })
          );
        } catch (e) {
          qrSvgHtml = '';
        }

        // 1-Line Compact Format for Each Co-deployed Officer
        let coForceHtml = '';
        if ((is2In1 || includeCoForce) && coForceList.length > 0) {
          const coRows = coForceList.map((colleague, cIdx) => {
            // Clean duplicate mobile or comma from name
            const cleanColleagueName = (colleague.name || '').trim()
              .replace(/,\s*\d{10}\b/g, '')
              .replace(/\b\d{10}\b/g, '')
              .replace(/,\s*,/g, ',')
              .replace(/,\s*$/, '')
              .trim();

            return `
              <div class="co-row">
                <div class="co-col-num">${cIdx + 1}.</div>
                <div class="co-col-name"><strong>${escapeHtml(cleanColleagueName)}</strong></div>
                <div class="co-col-mob">${phoneSvg}<span>${escapeHtml(colleague.mobile || '-')}</span></div>
                <div class="co-col-dist">${escapeHtml(colleague.posting || '')} ${colleague.district ? `(${escapeHtml(colleague.district)})` : ''}</div>
              </div>
            `;
          }).join('');

          coForceHtml = `
            <div class="co-force-container">
              <div class="co-force-header">
                <div class="co-hdr-title">
                  ${usersSvg}
                  <span>सहयोगार्थ पुलिस बल (उसी स्थल पर तैनात अन्य पुलिसकर्मी):</span>
                </div>
                <span class="co-count font-mono">कुल: ${coForceList.length} जवान</span>
              </div>
              <div class="co-force-body">
                ${coRows}
              </div>
            </div>
          `;
        }

        cardsHtml += `
          <div class="duty-card ${is2In1 ? 'card-2in1' : ''}">
            <!-- 1. Header Section -->
            <div class="card-header">
              <img src="/badge.png" class="badge-icon" alt="UP Police" />
              <div class="header-titles">
                <h2 class="title-main">${escapeHtml(eventTitle || 'उत्तर प्रदेश पुलिस')}</h2>
                <p class="title-sub">${escapeHtml(eventSubtitle || 'डिजिटल ड्यूटी पास')}</p>
              </div>
              <img src="/badge.png" class="badge-icon" alt="UP Police" />
            </div>

            <!-- 2. Officer Profile Section (Photo Left | Details Center | Auth QR Right) -->
            <div class="officer-card">
              <div class="photo-frame">
                ${photoHtml}
              </div>
              <div class="officer-info">
                <div>
                  <span class="officer-tag">अधिकारी / कर्मचारी विवरण:</span>
                  <h3 class="officer-name">${escapeHtml(duty.name || '-')}</h3>
                  <div class="officer-mobile">
                    ${phoneSvg}
                    <strong>${escapeHtml(duty.mobile || 'अनुपलब्ध')}</strong>
                  </div>
                </div>
                <div class="officer-sub-bar">
                  <span>तैनाती: <strong>${escapeHtml(duty.posting || '-')}</strong> ${duty.district ? `(${escapeHtml(duty.district)})` : ''}</span>
                </div>
              </div>
              <div class="officer-qr-box" title="प्रमाणीकरण हेतु स्कैन करें">
                ${qrSvgHtml}
                <span class="qr-sub-text">स्कैन सत्यापन</span>
              </div>
            </div>

            <!-- 3. Assignment Table -->
            <div class="table-container">
              <table class="card-table">
                <tbody>
                  <tr class="row-duty-place">
                    <td class="td-lbl">ड्यूटी स्थान</td>
                    <td class="td-val td-duty-val">${escapeHtml(duty.duty_place || '-')}</td>
                  </tr>
                  <tr>
                    <td class="td-lbl">दिनाँक/समय</td>
                    <td class="td-val font-bold">${escapeHtml(duty.shift || '-')}</td>
                  </tr>
                  <tr>
                    <td class="td-lbl">जोन / प्रभारी</td>
                    <td class="td-val">${escapeHtml(duty.zone || '-')} / <strong>${escapeHtml(duty.zonal_incharge || duty.zonal || '-')}</strong></td>
                  </tr>
                  <tr>
                    <td class="td-lbl">सेक्टर / प्रभारी</td>
                    <td class="td-val">${escapeHtml(duty.sector || '-')} / <strong>${escapeHtml(duty.sector_incharge || '-')}</strong></td>
                  </tr>
                  ${activeBriefing ? `
                  <tr class="row-briefing">
                    <td class="td-lbl">ब्रीफिंग स्थान</td>
                    <td class="td-val font-bold">${escapeHtml(activeBriefing)}</td>
                  </tr>` : ''}
                  ${activeNote ? `
                  <tr class="row-note">
                    <td class="td-lbl">विशेष निर्देश</td>
                    <td class="td-val font-bold note-val">${escapeHtml(activeNote)}</td>
                  </tr>` : ''}
                </tbody>
              </table>
            </div>

            <!-- 4. Co-deployed Force Section (सहयोगार्थ पुलिस बल) -->
            ${coForceHtml}

            <!-- 5. Authorization Footer -->
            <div class="card-footer">
              <div class="footer-left">
                <div class="verified-pill">
                  <span class="dot">●</span>
                  <span>डिजिटल सत्यापित पास (UP POLICE)</span>
                </div>
              </div>

              <div class="footer-right">
                ${signHtml}
                <div class="signatory-title">${escapeHtml(signatoryText)}</div>
              </div>
            </div>
          </div>
        `;
      }

      pagesHtml += `
        <div class="legal-page ${is2In1 ? 'page-2in1' : ''}">
          ${is2In1 ? `
            <div class="cut-line-h-center"></div>
          ` : is4In1 ? `
            <div class="cut-line-h-center"></div>
            <div class="cut-line-v"></div>
          ` : `
            <div class="cut-line-h1"></div>
            <div class="cut-line-h2"></div>
            <div class="cut-line-v"></div>
          `}
          ${cardsHtml}
        </div>
      `;
    }

    const layoutName = is2In1 ? '2-in-1 Election Special' : (is4In1 ? '4-in-1 Standard' : '6-in-1 Compact');

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="hi">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(eventTitle || 'ड्यूटी पास')} - Bulk Print (${layoutName} Legal)</title>
        <style>
          @page {
            size: legal portrait;
            margin: 3mm 4mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #020617;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Legal Page dimensions (215.9mm x 355.6mm) */
          .legal-page {
            width: 207.9mm;
            height: 349.6mm;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: ${is4In1 ? '1fr 1fr' : '1fr 1fr 1fr'};
            gap: ${is4In1 ? '5mm' : '3.5mm'};
            padding: 1mm;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            position: relative;
            background: #ffffff;
          }

          /* 2-in-1 Full Legal Vertical Layout */
          .page-2in1 {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 6mm;
            padding: 2mm;
          }

          /* ✂️ Cut markers */
          .cut-line-v {
            position: absolute;
            left: 50%;
            top: 0;
            bottom: 0;
            border-left: 1px dashed #cbd5e1;
            pointer-events: none;
            z-index: 10;
          }
          .cut-line-h-center {
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            border-top: 1px dashed #cbd5e1;
            pointer-events: none;
            z-index: 10;
          }
          .cut-line-h1 {
            position: absolute;
            top: 33.33%;
            left: 0;
            right: 0;
            border-top: 1px dashed #cbd5e1;
            pointer-events: none;
            z-index: 10;
          }
          .cut-line-h2 {
            position: absolute;
            top: 66.66%;
            left: 0;
            right: 0;
            border-top: 1px dashed #cbd5e1;
            pointer-events: none;
            z-index: 10;
          }

          /* Individual Police Duty Card */
          .duty-card {
            border: 1.5px solid #000000;
            border-radius: 8px;
            padding: ${is2In1 ? '10px 14px' : (is4In1 ? '8px 10px' : '5px 6px')};
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            box-sizing: border-box;
            height: 100%;
            overflow: hidden;
          }

          .empty-slot {
            border: 1.5px dashed #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
          }
          .empty-text {
            font-size: 11px;
            font-weight: bold;
            color: #94a3b8;
          }

          /* 1. Header Section */
          .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1.5px solid #000000;
            padding-bottom: ${is2In1 ? '5px' : (is4In1 ? '4px' : '2px')};
            gap: 4px;
            flex-shrink: 0;
          }
          .badge-icon {
            width: ${is2In1 ? '44px' : (is4In1 ? '40px' : '28px')};
            height: ${is2In1 ? '44px' : (is4In1 ? '40px' : '28px')};
            object-fit: contain;
          }
          .header-titles {
            text-align: center;
            flex: 1;
            min-width: 0;
          }
          .title-main {
            font-size: ${is2In1 ? '16px' : (is4In1 ? '13px' : '10px')};
            font-weight: 900;
            color: #000000;
            line-height: 1.15;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .title-sub {
            font-size: ${is2In1 ? '12px' : (is4In1 ? '9.5px' : '7.5px')};
            font-weight: 700;
            color: #1e293b;
            margin-top: 1px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* 2. Officer Profile Section (Photo Left | Details Center | Auth QR Right) */
          .officer-card {
            display: flex;
            align-items: center;
            gap: ${is2In1 ? '10px' : (is4In1 ? '8px' : '5px')};
            border: 1px solid #000000;
            border-radius: 6px;
            padding: ${is2In1 ? '5px 8px' : (is4In1 ? '4px 6px' : '3px 4px')};
            background: #f8fafc;
            margin-top: ${is2In1 ? '6px' : (is4In1 ? '4px' : '2px')};
            flex-shrink: 0;
          }
          .photo-frame {
            width: ${is2In1 ? '48px' : (is4In1 ? '42px' : '32px')};
            height: ${is2In1 ? '60px' : (is4In1 ? '50px' : '38px')};
            border: 1px solid #000000;
            border-radius: 4px;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
          }
          .officer-photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .photo-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #94a3b8;
          }
          .photo-svg {
            width: ${is4In1 ? '16px' : '12px'};
            height: ${is4In1 ? '16px' : '12px'};
          }
          .photo-placeholder span {
            font-size: ${is4In1 ? '6px' : '5px'};
            font-weight: bold;
            line-height: 1;
            margin-top: 1px;
          }
          .officer-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-width: 0;
          }
          .officer-tag {
            font-size: ${is2In1 ? '9px' : (is4In1 ? '7.5px' : '6.5px')};
            color: #475569;
            font-weight: bold;
          }
          .officer-name {
            font-size: ${is2In1 ? '13px' : (is4In1 ? '11px' : '8.5px')};
            font-weight: 900;
            color: #000000;
            line-height: 1.15;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .officer-mobile {
            font-size: ${is2In1 ? '11.5px' : (is4In1 ? '9.5px' : '7.5px')};
            font-family: monospace;
            font-weight: bold;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .officer-sub-bar {
            display: flex;
            justify-content: space-between;
            border-top: 1px solid #e2e8f0;
            padding-top: 2px;
            font-size: ${is2In1 ? '9px' : (is4In1 ? '7.5px' : '6px')};
            color: #334155;
          }
          .officer-qr-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            flex-shrink: 0;
          }
          .qr-sub-text {
            font-size: ${is2In1 ? '7px' : '5.5px'};
            font-weight: bold;
            color: #15803d;
            margin-top: 1px;
            line-height: 1;
          }

          /* Modern Vector SVG Icons */
          .icon-phone {
            width: ${is2In1 ? '12px' : '10px'};
            height: ${is2In1 ? '12px' : '10px'};
            color: #0284c7;
            display: inline-block;
            vertical-align: middle;
            flex-shrink: 0;
            margin-right: 3px;
          }
          .icon-users {
            width: ${is2In1 ? '13px' : '11px'};
            height: ${is2In1 ? '13px' : '11px'};
            color: #0369a1;
            display: inline-block;
            vertical-align: middle;
            flex-shrink: 0;
            margin-right: 4px;
          }

          /* 3. Assignment Table */
          .table-container {
            margin-top: ${is2In1 ? '6px' : (is4In1 ? '4px' : '2px')};
            border: 1px solid #000000;
            border-radius: 6px;
            overflow: hidden;
            flex-shrink: 0;
          }
          .card-table {
            width: 100%;
            border-collapse: collapse;
            font-size: ${is2In1 ? '10.5px' : (is4In1 ? '8.5px' : '6.5px')};
          }
          .card-table tr {
            border-bottom: 1px solid #e2e8f0;
          }
          .card-table tr:last-child {
            border-bottom: none;
          }
          .td-lbl {
            width: 32%;
            background: #f1f5f9;
            font-weight: bold;
            color: #1e293b;
            padding: ${is2In1 ? '3.5px 7px' : (is4In1 ? '2.5px 5px' : '1.5px 3px')};
            border-right: 1px solid #cbd5e1;
            white-space: nowrap;
          }
          .td-val {
            padding: ${is2In1 ? '3.5px 7px' : (is4In1 ? '2.5px 5px' : '1.5px 3px')};
            color: #020617;
            font-weight: 600;
            word-break: break-word;
          }
          .td-duty-val {
            font-weight: 900;
            color: #78350f;
            background: #fefce8;
            font-size: ${is2In1 ? '11px' : (is4In1 ? '9px' : '7px')};
          }
          .row-briefing td {
            background: #f8fafc;
            color: #0f172a;
          }
          .row-note td {
            background: #fffbeb;
            color: #92400e;
          }
          .note-val {
            font-size: ${is2In1 ? '9.5px' : (is4In1 ? '7.5px' : '6px')};
          }

          /* 4. Co-deployed Force Section (सहयोगार्थ पुलिस बल) */
          .co-force-container {
            margin-top: 6px;
            border: 1px solid #000000;
            border-radius: 6px;
            overflow: hidden;
            background: #ffffff;
            font-size: ${is2In1 ? '9.5px' : '8px'};
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
          }
          .co-force-header {
            background: #f1f5f9;
            padding: 3px 8px;
            font-weight: 900;
            color: #0f172a;
            border-bottom: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .co-hdr-title {
            display: flex;
            align-items: center;
          }
          .co-count {
            color: #0369a1;
            font-weight: bold;
            font-family: monospace;
          }
          .co-force-body {
            overflow-y: auto;
            flex: 1;
            background: #ffffff;
          }
          .co-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 2.5px 8px;
            border-bottom: 1px solid #f1f5f9;
            font-size: ${is2In1 ? '9.5px' : '8px'};
            line-height: 1.25;
          }
          .co-row:nth-child(even) {
            background: #f8fafc;
          }
          .co-col-num {
            width: 18px;
            font-weight: bold;
            color: #64748b;
            flex-shrink: 0;
            font-family: monospace;
          }
          .co-col-name {
            flex: 1.3;
            font-weight: 600;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding-right: 6px;
          }
          .co-col-mob {
            font-family: monospace;
            font-weight: bold;
            color: #0f172a;
            width: 110px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
          }
          .co-col-dist {
            flex: 1;
            text-align: right;
            color: #475569;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* 5. Authorization Footer */
          .card-footer {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            border-top: 1.5px solid #000000;
            padding-top: ${is2In1 ? '5px' : (is4In1 ? '3px' : '2px')};
            margin-top: ${is2In1 ? '6px' : (is4In1 ? '3px' : '2px')};
            flex-shrink: 0;
          }
          .verified-pill {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            padding: 2px 6px;
            background: #dcfce7;
            border: 1px solid #86efac;
            border-radius: 4px;
            font-size: ${is2In1 ? '9px' : (is4In1 ? '7px' : '5.5px')};
            font-weight: 900;
            color: #14532d;
          }
          .dot {
            color: #16a34a;
            font-size: 6px;
          }
          .footer-right {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }
          .sign-img {
            height: ${is2In1 ? '28px' : (is4In1 ? '20px' : '14px')};
            max-width: 90px;
            object-fit: contain;
          }
          .sign-text {
            font-style: italic;
            font-size: ${is2In1 ? '9.5px' : (is4In1 ? '7px' : '5.5px')};
            color: #475569;
          }
          .signatory-title {
            font-size: ${is2In1 ? '10.5px' : (is4In1 ? '8px' : '6px')};
            font-weight: 900;
            color: #020617;
            margin-top: 1px;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('पॉप-अप ब्लॉक हो गया है। कृपया ब्राउज़र में पॉप-अप की अनुमति दें।');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();
  } catch (err) {
    console.error('Print Error:', err);
    alert(`प्रिंट इंजन त्रुटि: ${err.message}`);
  }
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
