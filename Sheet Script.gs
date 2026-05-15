// ============================================================
// CONFIGURATION — edit only this section
// ============================================================
const CONFIG = {
  smtpEmail:    "your.email@company.com",   // ← Input your email
  smtpPassword: "",
  toEmail:      "recipient@company.com",    // ← Change this to the email of the reciepient
  ccEmail:      "", 
  bccEmail:     "",
  sheetName:    "Sheet1",
  greeting:     "Dear GM,",
  signoff:      "Regards,",
  senderName:   "Your Name",               // ← Add your name here
};

// ============================================================
// ENTRY POINTS
// ============================================================

// Handles ?mode=preview and ?mode=send via web app URL
function doGet(e) {
  const mode = e.parameter.mode || "preview";
  const { subject, html } = buildEmail();

  if (mode === "send") {
    sendReport(subject, html);
    return HtmlService.createHtmlOutput(
      `<p style="font-family:sans-serif;color:green;">✅ Email sent successfully to ${CONFIG.toEmail}</p>`
    );
  }

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Called by time-based trigger (5PM Mon–Sat)
function sendScheduled() {
  const day = new Date().getDay(); // 0=Sun, 6=Sat
  if (day === 0) return;           // Skip Sunday
  const { subject, html } = buildEmail();
  sendReport(subject, html);
}

// ============================================================
// EMAIL BUILDER
// ============================================================
function buildEmail() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetName);
  const data  = sheet.getDataRange().getValues();

  // Skip header row (row 0)
  const rows = data.slice(1).filter(r => r[0] !== "" && r[0] !== null);

  const today    = new Date();
  const subjectDate = Utilities.formatDate(today, "Asia/Dubai", "dd-MM-yy");

  // Build table rows
  let tableRows = "";
  rows.forEach((r, i) => {
    const stepNo      = r[0] || "";
    const taskDesc    = r[1] || "";
    const status      = r[2] || "";
    const doneBy      = r[3] || "";
    const dateGiven   = formatDateCell(r[4]);
    const targetDate  = formatDateCell(r[5]);
    const remarks     = r[6] || "";
    const duration    = (dateGiven && targetDate) ? `${dateGiven} → ${targetDate}` : (dateGiven || targetDate || "—");
    const rowBg       = i % 2 === 0 ? "#ffffff" : "#f7f9fc";

    tableRows += `
      <tr style="background:${rowBg};">
        <td style="${TD}">${stepNo}</td>
        <td style="${TD}">${taskDesc}</td>
        <td style="${TD}">${status}</td>
        <td style="${TD}">${doneBy}</td>
        <td style="${TD};white-space:nowrap;">${duration}</td>
        <td style="${TD}">${remarks}</td>
      </tr>`;
  });

  const reportDate = Utilities.formatDate(today, "Asia/Dubai", "dd MMMM yyyy");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;">
  <div style="max-width:100%;margin:30px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:#1a3c5e;padding:24px 30px;">
      <div style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:0.5px;">Velath Engineering International FZC — Daily Job Report</div>
      <div style="color:#a8c4e0;font-size:13px;margin-top:4px;">${reportDate}</div>
    </div>

    <!-- Body -->
    <div style="padding:28px 30px;">
      <p style="margin:0 0 20px;font-size:14px;color:#333;">${CONFIG.greeting}</p>
      <p style="margin:0 0 20px;font-size:14px;color:#555;">Please find below the daily task update:</p>

      <!-- Table -->
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#1a3c5e;">
              <th style="${TH}">#</th>
              <th style="${TH}">Task Description</th>
              <th style="${TH}">Status</th>
              <th style="${TH}">Done By</th>
              <th style="${TH}">Duration</th>
              <th style="${TH}">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>

      <p style="margin:24px 0 4px;font-size:14px;color:#333;">${CONFIG.signoff}</p>
      <p style="margin:0;font-size:14px;color:#333;font-weight:bold;">${CONFIG.senderName}</p>
    </div>

    <!-- Footer -->
    <div style="background:#f7f9fc;padding:14px 30px;border-top:1px solid #e8edf2;">
      <p style="margin:0;font-size:11px;color:#999;">This is an automated report generated from Google Sheets.</p>
    </div>

  </div>
</body>
</html>`;

  return { subject: `[${subjectDate}] R&D - Daily Report`, html };
}

// ============================================================
// EMAIL SENDER — Outlook SMTP via MailApp + GmailApp fallback
// ============================================================
function sendReport(subject, html) {
  const emailOptions = {
    to: CONFIG.toEmail,
    subject: subject,
    htmlBody: html,
    name: CONFIG.senderName
  };

  // Add CC only if provided
  if (CONFIG.ccEmail && CONFIG.ccEmail.trim() !== "") {
    emailOptions.cc = CONFIG.ccEmail;
  }

  // Add BCC only if provided
  if (CONFIG.bccEmail && CONFIG.bccEmail.trim() !== "") {
    emailOptions.bcc = CONFIG.bccEmail;
  }

  MailApp.sendEmail(emailOptions);
}

// ============================================================
// HELPERS
// ============================================================
const TH = "padding:10px 12px;text-align:left;color:#ffffff;font-weight:600;font-size:12px;border:none;";
const TD = "padding:9px 12px;color:#333;border-bottom:1px solid #eaeef2;font-size:13px;vertical-align:top;";

function formatDateCell(val) {
  if (!val) return "";
  if (val instanceof Date) return Utilities.formatDate(val, "Asia/Dubai", "dd MMM yyyy");
  return String(val);
}

// ============================================================
// SHEET BUTTONS
// ============================================================
function openPreview() {
  const base = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?mode=preview";
  const url = base + "&t=" + new Date().getTime();
  const html = HtmlService.createHtmlOutput(
    `<p style="font-family:sans-serif;font-size:14px;">Click the link below to open the preview:</p>
     <a href="${url}" target="_blank" style="font-family:sans-serif;font-size:14px;">Open Preview</a>
     <p style="font-family:sans-serif;font-size:12px;color:#999;">This link is timestamped — always shows latest data.</p>`
  ).setWidth(600).setHeight(120);
  SpreadsheetApp.getUi().showModalDialog(html, "Preview Report");
}

function sendNow() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert("Send Report", "Send the daily report now?", ui.ButtonSet.YES_NO);
  if (confirm === ui.Button.YES) {
    const { subject, html } = buildEmail();
    sendReport(subject, html);
    ui.alert("✅ Report sent to " + CONFIG.toEmail);
  }
}

