// Dedicated high-speed isolated Legal 6-in-1 print engine
export function printLegalBulk({
  records = [],
  eventTitle = 'श्रावण झूला मेला',
  eventSubtitle = 'ड्यूटी कार्ड अयोध्या-2026',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  customNote = '',
  isNoteEnabled = true,
  customBriefing = '',
  isBriefingEnabled = true
}) {
  try {
    const validRecords = (records || []).filter(r => r && (r.name || r.id));
    if (validRecords.length === 0) {
      alert('प्रिंट करने हेतु कोई रिकॉर्ड उपलब्ध नहीं है।');
      return;
    }

    // 6 Cards per Legal Page (2 Columns x 3 Rows)
    const CARDS_PER_PAGE = 6;
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
              <div class="empty-text">स्थान रिक्त (Blank)</div>
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
              <span>फोटो चस्पा करें</span>
            </div>
          `;

        const signHtml = signatureImg
          ? `<img src="${signatureImg}" class="sign-img" />`
          : `<div class="sign-text">(हस्ताक्षरित)</div>`;

        cardsHtml += `
          <div class="duty-card">
            <!-- Card Header -->
            <div class="card-header">
              <img src="/badge.png" class="badge-icon" alt="UP Police" />
              <div class="header-titles">
                <h2 class="title-main">${escapeHtml(eventTitle)}</h2>
                <p class="title-sub">${escapeHtml(eventSubtitle)}</p>
              </div>
              <img src="/badge.png" class="badge-icon" alt="UP Police" />
            </div>

            <!-- Officer Profile Section -->
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
                    <strong>${escapeHtml(duty.mobile || 'मोबाइल अनुपलब्ध')}</strong>
                  </div>
                </div>
                <div class="officer-sub-bar">
                  <span>P.No: <strong>${escapeHtml(duty.id || '-')}</strong></span>
                  <span>तैनाती: <strong>${escapeHtml(duty.posting || '-')}</strong> ${duty.district ? `(${escapeHtml(duty.district)})` : ''}</span>
                </div>
              </div>
            </div>

            <!-- Table of Assignments -->
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
                    <td class="td-lbl">जोन/प्रभारी</td>
                    <td class="td-val">${escapeHtml(duty.zone || '-')} / <strong>${escapeHtml(duty.zonal_incharge || duty.zonal || '-')}</strong></td>
                  </tr>
                  <tr>
                    <td class="td-lbl">सेक्टर/प्रभारी</td>
                    <td class="td-val">${escapeHtml(duty.sector || '-')} / <strong>${escapeHtml(duty.sector_incharge || '-')}</strong></td>
                  </tr>
                  ${activeBriefing ? `
                  <tr class="row-briefing">
                    <td class="td-lbl">ब्रीफिंग</td>
                    <td class="td-val font-bold">${escapeHtml(activeBriefing)}</td>
                  </tr>` : ''}
                  ${activeNote ? `
                  <tr class="row-note">
                    <td class="td-lbl">निर्देश</td>
                    <td class="td-val font-bold note-val">${escapeHtml(activeNote)}</td>
                  </tr>` : ''}
                </tbody>
              </table>
            </div>

            <!-- Card Bottom Authorization -->
            <div class="card-footer">
              <div class="footer-left">
                <div class="verified-pill">
                  <span class="dot">●</span>
                  <span>डिजिटल सत्यापित (UP POLICE)</span>
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
          <!-- Horizontal & Vertical Cut Guidelines for 6 Cards -->
          <div class="cut-line-h1"></div>
          <div class="cut-line-h2"></div>
          <div class="cut-line-v"></div>
          ${cardsHtml}
        </div>
      `;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="hi">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(eventTitle)} - 6-in-1 Bulk Duty Pass (Legal)</title>
        <style>
          @page {
            size: legal portrait;
            margin: 4mm 5mm;
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

          /* 1 Legal Page (215.9mm x 355.6mm) holding 6 cards (2 columns x 3 rows) */
          .legal-page {
            width: 205.9mm;
            height: 347.6mm;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr 1fr;
            gap: 4mm;
            padding: 1.5mm;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            position: relative;
            background: #ffffff;
          }

          /* ✂️ Cut markers for 6-card layout */
          .cut-line-v {
            position: absolute;
            left: 50%;
            top: 0;
            bottom: 0;
            border-left: 1px dashed #cbd5e1;
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

          /* Each Individual Police Duty Card (Snug 6-in-1 ID Size) */
          .duty-card {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            padding: 5px 7px;
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
            font-size: 10px;
            font-weight: bold;
            color: #94a3b8;
          }

          /* Header Section */
          .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1.5px solid #0f172a;
            padding-bottom: 3px;
            gap: 4px;
          }
          .badge-icon {
            width: 28px;
            height: 28px;
            object-fit: contain;
            flex-shrink: 0;
          }
          .header-titles {
            text-align: center;
            flex: 1;
            line-height: 1.15;
          }
          .title-main {
            font-size: 12.5px;
            font-weight: 900;
            color: #000000;
            letter-spacing: 0.2px;
          }
          .title-sub {
            font-size: 9px;
            font-weight: bold;
            color: #334155;
          }

          /* Officer Profile Box */
          .officer-card {
            display: flex;
            gap: 6px;
            border: 1px solid #64748b;
            padding: 4px;
            border-radius: 6px;
            background: #f8fafc;
            margin: 3px 0;
          }
          .photo-frame {
            width: 44px;
            height: 54px;
            border: 1px dashed #475569;
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
            font-size: 6.5px;
            font-weight: bold;
            color: #64748b;
            line-height: 1.1;
            gap: 1px;
          }
          .photo-svg {
            width: 16px;
            height: 16px;
            color: #94a3b8;
          }

          .officer-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-width: 0;
          }
          .officer-tag {
            font-size: 7px;
            font-weight: 800;
            color: #475569;
          }
          .officer-name {
            font-size: 10.5px;
            font-weight: 900;
            color: #020617;
            line-height: 1.2;
            word-break: break-word;
          }
          .officer-mobile {
            font-size: 9.5px;
            font-family: monospace;
            font-weight: 800;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 2px;
          }
          .officer-sub-bar {
            font-size: 8px;
            color: #334155;
            border-top: 1px solid #cbd5e1;
            padding-top: 2px;
            display: flex;
            justify-content: space-between;
            gap: 4px;
          }

          /* Duty Assignments Table */
          .table-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            margin: 2px 0;
          }
          .card-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
            border: 1px solid #475569;
          }
          .card-table td {
            padding: 2px 4px;
            border-bottom: 1px solid #cbd5e1;
            line-height: 1.25;
          }
          .td-lbl {
            width: 32%;
            background: #f1f5f9;
            font-weight: 800;
            color: #0f172a;
            border-right: 1px solid #cbd5e1;
          }
          .td-val {
            color: #020617;
          }
          .row-duty-place {
            background: #fef3c7;
          }
          .td-duty-val {
            font-size: 9.5px;
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
            font-size: 7.5px;
            color: #9f1239;
          }
          .font-bold {
            font-weight: bold;
          }

          /* Footer Authorization */
          .card-footer {
            border-top: 1.5px solid #0f172a;
            padding-top: 3px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
          }
          .footer-left {
            display: flex;
            flex-direction: column;
          }
          .verified-pill {
            font-size: 7.5px;
            font-weight: 900;
            color: #065f46;
            display: flex;
            align-items: center;
            gap: 2px;
          }
          .dot {
            color: #10b981;
            font-size: 9px;
          }
          .pass-code {
            font-size: 6.5px;
            font-family: monospace;
            font-weight: 700;
            color: #64748b;
          }
          .footer-right {
            text-align: right;
          }
          .sign-img {
            height: 16px;
            max-width: 55px;
            object-fit: contain;
            margin-left: auto;
          }
          .sign-text {
            font-size: 7px;
            font-style: italic;
            color: #475569;
          }
          .signatory-title {
            font-size: 8px;
            font-weight: 900;
            color: #020617;
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
