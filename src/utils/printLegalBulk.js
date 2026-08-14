// Dedicated high-speed isolated Legal 4-in-1 print engine
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

    const totalPages = Math.ceil(validRecords.length / 4);

    let pagesHtml = '';

    for (let p = 0; p < totalPages; p++) {
      const pageRecords = validRecords.slice(p * 4, (p + 1) * 4);

      let cardsHtml = '';
      for (let c = 0; c < 4; c++) {
        const duty = pageRecords[c];
        if (!duty) {
          cardsHtml += `<div class="card-empty"></div>`;
          continue;
        }

        const activeNote = (isNoteEnabled !== false && customNote) ? customNote : (isNoteEnabled ? (duty.note || '') : '');
        const activeBriefing = (isBriefingEnabled !== false && customBriefing) ? customBriefing : (isBriefingEnabled ? (duty.briefing_place || '') : '');

        const photoHtml = duty.photo
          ? `<img src="${duty.photo}" class="officer-photo" />`
          : `<div class="photo-placeholder">फोटो<br/>चस्पा करें</div>`;

        const signHtml = signatureImg
          ? `<img src="${signatureImg}" class="sign-img" />`
          : `<div class="sign-text">(हस्ताक्षरित)</div>`;

        cardsHtml += `
          <div class="duty-card">
            <!-- Card Header -->
            <div class="card-header">
              <img src="/badge.png" class="badge-icon" />
              <div class="header-titles">
                <div class="title-main">${escapeHtml(eventTitle)}</div>
                <div class="title-sub">${escapeHtml(eventSubtitle)}</div>
              </div>
              <img src="/badge.png" class="badge-icon" />
            </div>

            <!-- Officer Info Box -->
            <div class="officer-box">
              <div class="photo-wrapper">
                ${photoHtml}
              </div>
              <div class="officer-details">
                <div>
                  <div class="label-muted">अधिकारी / कर्मचारी:</div>
                  <div class="officer-name">${escapeHtml(duty.name || '-')}</div>
                  <div class="officer-phone">📱 ${escapeHtml(duty.mobile || '-')}</div>
                </div>
                <div class="officer-meta">
                  <span>P.No: <strong>${escapeHtml(duty.id || '-')}</strong></span>
                  <span>मूल तैनाती: <strong>${escapeHtml(duty.posting || '-')}</strong> ${duty.district ? `(${escapeHtml(duty.district)})` : ''}</span>
                </div>
              </div>
            </div>

            <!-- Details Table -->
            <table class="card-table">
              <tbody>
                <tr>
                  <td class="td-label">ड्यूटी का स्थान</td>
                  <td class="td-val-highlight">${escapeHtml(duty.duty_place || '-')}</td>
                </tr>
                <tr>
                  <td class="td-label">दिनाँक व समय</td>
                  <td class="td-val font-bold">${escapeHtml(duty.shift || '-')}</td>
                </tr>
                <tr>
                  <td class="td-label">जोन / प्रभारी</td>
                  <td class="td-val">${escapeHtml(duty.zone || '-')} / ${escapeHtml(duty.zonal_incharge || duty.zonal || '-')}</td>
                </tr>
                <tr>
                  <td class="td-label">सेक्टर / प्रभारी</td>
                  <td class="td-val">${escapeHtml(duty.sector || '-')} / ${escapeHtml(duty.sector_incharge || '-')}</td>
                </tr>
                ${activeBriefing ? `
                <tr class="row-highlight">
                  <td class="td-label">ब्रीफिंग</td>
                  <td class="td-val font-bold">${escapeHtml(activeBriefing)}</td>
                </tr>` : ''}
                ${activeNote ? `
                <tr class="row-highlight">
                  <td class="td-label">विशेष नोट</td>
                  <td class="td-val note-text font-bold">${escapeHtml(activeNote)}</td>
                </tr>` : ''}
              </tbody>
            </table>

            <!-- Card Footer -->
            <div class="card-footer">
              <div class="footer-left">
                <div class="verified-badge">✓ सत्यापित पास (UP Police)</div>
                <div class="pass-id">PASS ID: ${escapeHtml(duty.id || '-')}</div>
              </div>
              <div class="footer-right">
                ${signHtml}
                <div class="signatory-name">${escapeHtml(signatoryText)}</div>
              </div>
            </div>
          </div>
        `;
      }

      pagesHtml += `
        <div class="legal-page">
          ${cardsHtml}
        </div>
      `;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="hi">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(eventTitle)} - 4-in-1 Bulk Duty Pass (Legal)</title>
        <style>
          @page {
            size: legal portrait;
            margin: 6mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #ffffff;
            color: #000000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .legal-page {
            width: 203.9mm;
            height: 343.6mm;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 5mm;
            padding: 2mm;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
          }
          .duty-card {
            border: 1.5px solid #000000;
            border-radius: 8px;
            padding: 7px 8px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            box-sizing: border-box;
            overflow: hidden;
          }
          .card-empty {
            border: 1px dashed #cbd5e1;
            border-radius: 8px;
          }
          .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1.5px solid #000000;
            padding-bottom: 3px;
          }
          .badge-icon {
            width: 30px;
            height: 30px;
            object-fit: contain;
          }
          .header-titles {
            text-align: center;
            flex: 1;
            padding: 0 4px;
          }
          .title-main {
            font-size: 11.5px;
            font-weight: 900;
            color: #000000;
            line-height: 1.15;
          }
          .title-sub {
            font-size: 8.5px;
            font-weight: bold;
            color: #333333;
          }
          .officer-box {
            display: flex;
            gap: 6px;
            border: 1px solid #94a3b8;
            padding: 4px;
            border-radius: 6px;
            background: #f8fafc;
            margin: 3px 0;
          }
          .photo-wrapper {
            width: 44px;
            height: 54px;
            border: 1px dashed #64748b;
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
            font-size: 7px;
            font-weight: bold;
            color: #64748b;
            line-height: 1.1;
          }
          .officer-details {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-width: 0;
          }
          .label-muted {
            font-size: 7px;
            font-weight: bold;
            color: #64748b;
          }
          .officer-name {
            font-size: 9.5px;
            font-weight: 900;
            color: #000000;
            line-height: 1.2;
            word-break: break-word;
          }
          .officer-phone {
            font-size: 8.5px;
            font-family: monospace;
            font-weight: bold;
            color: #1e293b;
          }
          .officer-meta {
            font-size: 7.5px;
            color: #334155;
            border-top: 1px solid #cbd5e1;
            padding-top: 2px;
            display: flex;
            justify-content: space-between;
          }
          .card-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
            border: 1px solid #cbd5e1;
            margin: 2px 0;
          }
          .card-table td {
            padding: 2px 4px;
            border-bottom: 1px solid #cbd5e1;
          }
          .td-label {
            width: 34%;
            background: #f1f5f9;
            font-weight: bold;
            border-right: 1px solid #cbd5e1;
          }
          .td-val {
            color: #000000;
          }
          .td-val-highlight {
            background: #fffbeb;
            font-weight: 900;
            color: #000000;
          }
          .row-highlight {
            background: #fffbeb;
          }
          .font-bold {
            font-weight: bold;
          }
          .note-text {
            font-size: 7.5px;
          }
          .card-footer {
            border-top: 1.5px solid #000000;
            padding-top: 3px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .footer-left {
            display: flex;
            flex-direction: column;
          }
          .verified-badge {
            font-size: 7px;
            font-weight: 900;
            color: #065f46;
          }
          .pass-id {
            font-size: 6.5px;
            font-family: monospace;
            color: #475569;
          }
          .footer-right {
            text-align: right;
          }
          .sign-img {
            height: 16px;
            max-width: 60px;
            object-fit: contain;
            margin-left: auto;
          }
          .sign-text {
            font-size: 7px;
            font-style: italic;
          }
          .signatory-name {
            font-size: 7.5px;
            font-weight: 900;
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
