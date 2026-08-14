// Dedicated high-speed isolated Legal print engine supporting balanced 4-in-1 and 6-in-1 layouts
export function printLegalBulk({
  records = [],
  eventTitle = 'श्रावण झूला मेला',
  eventSubtitle = 'ड्यूटी कार्ड अयोध्या-2026',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  customNote = '',
  isNoteEnabled = true,
  customBriefing = '',
  isBriefingEnabled = true,
  layoutMode = 6 // 4 or 6 cards per Legal page
}) {
  try {
    const validRecords = (records || []).filter(r => r && (r.name || r.id));
    if (validRecords.length === 0) {
      alert('प्रिंट करने हेतु कोई रिकॉर्ड उपलब्ध नहीं है।');
      return;
    }

    const is4In1 = layoutMode === 4;
    const CARDS_PER_PAGE = is4In1 ? 4 : 6;
    const totalPages = Math.ceil(validRecords.length / CARDS_PER_PAGE);

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

        cardsHtml += `
          <div class="duty-card">
            <!-- 1. Header Section -->
            <div class="card-header">
              <img src="/badge.png" class="badge-icon" alt="UP Police" />
              <div class="header-titles">
                <h2 class="title-main">${escapeHtml(eventTitle)}</h2>
                <p class="title-sub">${escapeHtml(eventSubtitle)}</p>
              </div>
              <img src="/badge.png" class="badge-icon" alt="UP Police" />
            </div>

            <!-- 2. Officer Profile Section -->
            <div class="officer-card">
              <div class="photo-frame">
                ${photoHtml}
              </div>
              <div class="officer-info">
                <div>
                  <span class="officer-tag">अधिकारी / कर्मचारी विवरण:</span>
                  <h3 class="officer-name">${escapeHtml(duty.name || '-')}</h3>
                  <div class="officer-mobile">
                    <span>📱</span>
                    <strong>${escapeHtml(duty.mobile || 'अनुपलब्ध')}</strong>
                  </div>
                </div>
                <div class="officer-sub-bar">
                  <span>P.No: <strong>${escapeHtml(duty.id || '-')}</strong></span>
                  <span>तैनाती: <strong>${escapeHtml(duty.posting || '-')}</strong> ${duty.district ? `(${escapeHtml(duty.district)})` : ''}</span>
                </div>
              </div>
            </div>

            <!-- 3. Assignment Table: Evenly Balanced Rows -->
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

            <!-- 4. Authorization Footer -->
            <div class="card-footer">
              <div class="footer-left">
                <div class="verified-pill">
                  <span class="dot">●</span>
                  <span>डिजिटल सत्यापित पास (UP POLICE)</span>
                </div>
                <div class="pass-code">ID: ${escapeHtml(duty.id || '-')}</div>
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
        <div class="legal-page">
          ${is4In1 ? `
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

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="hi">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(eventTitle)} - Bulk Duty Pass (${is4In1 ? '4-in-1' : '6-in-1'} Legal)</title>
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
            padding: ${is4In1 ? '8px 10px' : '5px 6px'};
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            box-sizing: border-box;
            height: 100%;
            overflow: visible;
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
            padding-bottom: ${is4In1 ? '4px' : '2px'};
            gap: 4px;
            flex-shrink: 0;
          }
          .badge-icon {
            width: ${is4In1 ? '40px' : '28px'};
            height: ${is4In1 ? '40px' : '28px'};
            object-fit: contain;
            flex-shrink: 0;
          }
          .header-titles {
            text-align: center;
            flex: 1;
            line-height: 1.15;
          }
          .title-main {
            font-size: ${is4In1 ? '15px' : '12.5px'};
            font-weight: 900;
            color: #000000;
            letter-spacing: 0.2px;
          }
          .title-sub {
            font-size: ${is4In1 ? '11px' : '9px'};
            font-weight: 800;
            color: #334155;
          }

          /* 2. Officer Profile Box (Enlarged and balanced in 4-in-1) */
          .officer-card {
            display: flex;
            gap: ${is4In1 ? '10px' : '6px'};
            border: 1.2px solid #000000;
            padding: ${is4In1 ? '6px 8px' : '4px 6px'};
            border-radius: 6px;
            background: #f8fafc;
            flex-shrink: 0;
            margin: ${is4In1 ? '4px 0' : '3px 0'};
          }
          .photo-frame {
            width: ${is4In1 ? '58px' : '44px'};
            height: ${is4In1 ? '72px' : '56px'};
            border: 1px dashed #000000;
            border-radius: 4px;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            flex-shrink: 0;
            overflow: hidden;
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
            font-size: ${is4In1 ? '8px' : '6.5px'};
            font-weight: bold;
            color: #475569;
            line-height: 1.1;
            gap: 1px;
          }
          .photo-svg {
            width: ${is4In1 ? '22px' : '16px'};
            height: ${is4In1 ? '22px' : '16px'};
            color: #64748b;
          }

          .officer-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-width: 0;
          }
          .officer-tag {
            font-size: ${is4In1 ? '8.5px' : '7.5px'};
            font-weight: 800;
            color: #475569;
          }
          .officer-name {
            font-size: ${is4In1 ? '14.5px' : '11.5px'};
            font-weight: 900;
            color: #000000;
            line-height: 1.25;
            word-break: break-word;
            margin: 1px 0;
          }
          .officer-mobile {
            font-size: ${is4In1 ? '13px' : '10.5px'};
            font-family: monospace;
            font-weight: 900;
            color: #000000;
            display: flex;
            align-items: center;
            gap: 3px;
          }
          .officer-sub-bar {
            font-size: ${is4In1 ? '10.5px' : '8.5px'};
            color: #1e293b;
            border-top: 1px solid #cbd5e1;
            padding-top: 3px;
            display: flex;
            justify-content: space-between;
            gap: 4px;
            font-weight: 700;
          }

          /* 3. Duty Assignments Table: Evenly Balanced across all rows */
          .table-container {
            display: flex;
            flex-direction: column;
            width: 100%;
            margin: ${is4In1 ? '4px 0' : '2px 0'};
          }
          .card-table {
            width: 100%;
            border-collapse: collapse;
            font-size: ${is4In1 ? '11.5px' : '9.5px'};
            border: 1.2px solid #000000;
          }
          .card-table td {
            padding: ${is4In1 ? '5px 7px' : '3px 5px'};
            border-bottom: 1px solid #000000;
            line-height: 1.3;
            vertical-align: middle;
          }
          .td-lbl {
            width: 32%;
            background: #e2e8f0;
            font-weight: 900;
            color: #000000;
            border-right: 1.2px solid #000000;
          }
          .td-val {
            color: #000000;
          }
          .row-duty-place {
            background: #fef3c7;
          }
          .td-duty-val {
            font-size: ${is4In1 ? '13px' : '10.5px'};
            font-weight: 900;
            color: #78350f;
          }
          .row-briefing {
            background: #f8fafc;
          }
          .row-note {
            background: #fff1f2;
          }
          .note-val {
            font-size: ${is4In1 ? '10px' : '8.5px'};
            color: #9f1239;
          }
          .font-bold {
            font-weight: bold;
          }

          /* 4. Footer Authorization */
          .card-footer {
            border-top: 1.5px solid #000000;
            padding-top: ${is4In1 ? '4px' : '3px'};
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 3px;
            flex-shrink: 0;
          }
          .footer-left {
            display: flex;
            flex-direction: column;
          }
          .verified-pill {
            font-size: ${is4In1 ? '9.5px' : '8px'};
            font-weight: 900;
            color: #047857;
            display: flex;
            align-items: center;
            gap: 2px;
          }
          .dot {
            color: #10b981;
            font-size: ${is4In1 ? '11px' : '10px'};
          }
          .pass-code {
            font-size: ${is4In1 ? '8px' : '7px'};
            font-family: monospace;
            font-weight: 700;
            color: #475569;
          }
          .footer-right {
            text-align: right;
          }
          .sign-img {
            height: ${is4In1 ? '22px' : '18px'};
            max-width: 70px;
            object-fit: contain;
            margin-left: auto;
          }
          .sign-text {
            font-size: 7.5px;
            font-style: italic;
            color: #475569;
          }
          .signatory-title {
            font-size: ${is4In1 ? '10px' : '8.5px'};
            font-weight: 900;
            color: #000000;
            line-height: 1.1;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `;

    // Try popup window first
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.error(e);
        }
      }, 500);
      return;
    }

    // Fallback to hidden iframe if popups are blocked
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
      try {
        iframe.contentWindow.print();
      } catch (e) {
        console.error(e);
      }
    }, 400);
  } catch (err) {
    console.error('printLegalBulk Error:', err);
    alert('प्रिंट शुरू करने में त्रुटि: ' + (err?.message || 'अज्ञात त्रुटि'));
  }
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
