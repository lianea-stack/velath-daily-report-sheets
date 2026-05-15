// =============================================================================
// Velath Daily Report Automation — Google Apps Script
// =============================================================================
// Author:      Liane Acero
// Role:        R&D Engineer, Velath
// Last updated: May 2026
// Repository:  https://github.com/lianea-stack/velath-daily-report-sheets
//
// WHAT THIS SCRIPT DOES:
//   - Reads task entries from a Google Sheet (Sheet1)
//   - Builds a formatted HTML email table from those entries
//   - Sends the email automatically at 5PM Monday–Saturday
//   - Allows manual preview and manual send via Sheet buttons
//   - Also supports preview and send via Web App URL parameters
//
// HOW TO USE:
//   1. Fill in the CONFIG block below with your details
//   2. Deploy as a Web App (Deploy → New deployment → Web app)
//   3. Set a time-based trigger on sendScheduled() for 5PM–6PM
//   4. Assign sendNow() and openPreview() to buttons in the Sheet
//
// SHEET STRUCTURE EXPECTED (Sheet1):
//   A: Step No. | B: Task Description | C: Status | D: Done By
//   E: Date Given | F: Target Date | G: Remarks
// =============================================================================


// =============================================================================
// ── SECTION 1: CONFIGURATION
// =============================================================================
// This is the ONLY section you need to edit.
// All script behaviour is controlled from here.
// Do not edit anything outside this block unless you know what you are doing.
// =============================================================================

const CONFIG = {

  // --------------------------------------------------------------------------
  // SENDER IDENTITY
  // --------------------------------------------------------------------------
  // The "from" name that appears in the recipient's inbox.
  // The actual sending address is always the Google account that owns this script.
  // You cannot change the sending address — Google locks it to the logged-in account.
  // Example: "Liane Acero" or just "Liane"
  senderName: "Liane",

  // --------------------------------------------------------------------------
  // RECIPIENTS
  // --------------------------------------------------------------------------
  // Primary recipient — required. This person receives every report.
  // To send to multiple people, separate addresses with commas:
  //   toEmail: "manager@company.com, director@company.com",
  toEmail: "Ops.UAE@velath.com",

  // CC recipients — optional. Leave as an empty string "" to send no CC.
  // To add one person:   ccEmail: "supervisor@company.com",
  // To add multiple:     ccEmail: "alice@company.com, bob@company.com",
  // To disable CC:       ccEmail: "",
  ccEmail: "",

  // BCC recipients — optional. Useful for keeping a silent audit copy.
  // Works the same as ccEmail above.
  // To add a BCC:        bccEmail: "archive@company.com",
  // To disable BCC:      bccEmail: "",
  bccEmail: "",

  // --------------------------------------------------------------------------
  // SHEET SETTINGS
  // --------------------------------------------------------------------------
  // The exact name of the sheet tab inside your Google Sheets file.
  // Must match exactly — it is case-sensitive.
  // Default is "Sheet1". Change this if you renamed your tab.
  sheetName: "Sheet1",

  // --------------------------------------------------------------------------
  // EMAIL CONTENT
  // --------------------------------------------------------------------------
  // The greeting line at the top of every email.
  // Example: "Dear GM," or "Hello Team,"
  greeting: "Dear GM,",

  // The sign-off line at the bottom of every email, above the sender name.
  // Example: "Regards," or "Best,"
  signoff: "Regards,",

  // --------------------------------------------------------------------------
  // REPLY-TO (OPTIONAL)
  // --------------------------------------------------------------------------
  // If someone replies to the email, it will go to this address instead of
  // the Google account address. Leave as "" to use the default sender address.
  // Useful if your Google account is a personal one but replies should go to
  // your work email.
  // Example: replyTo: "liane.a@velath.com",
  replyTo: "",

  // --------------------------------------------------------------------------
  // SKIP DAYS (OPTIONAL)
  // --------------------------------------------------------------------------
  // Days of the week to skip when using the scheduled trigger.
  // Sunday = 0, Monday = 1, Tuesday = 2, ..., Saturday = 6
  // Default skips Sunday only: [0]
  // To also skip Saturday: [0, 6]
  // To run every day (no skips): []
  skipDays: [0],

  // --------------------------------------------------------------------------
  // SUBJECT PREFIX (OPTIONAL)
  // --------------------------------------------------------------------------
  // Text added before the date in the subject line.
  // Default produces: "[15-05-26] R&D - Daily Report"
  // You can change "R&D - Daily Report" to anything you like.
  subjectPrefix: "R&D - Daily Report",

};


// =============================================================================
// ── SECTION 2: WEB APP ENTRY POINT
// =============================================================================
// doGet() is called automatically by Google when someone opens the Web App URL.
// It checks the "mode" URL parameter to decide what to do:
//
//   ?mode=preview  → builds the email HTML and renders it in the browser
//   ?mode=send     → builds the email HTML, sends it, then shows a confirmation
//   (no mode)      → shows a simple status page so the URL is not blank
//
// IMPORTANT: Do NOT run doGet() directly from the Apps Script editor.
// It requires a live HTTP request with URL parameters (e.mode.parameter).
// Running it from the editor will crash with "Cannot read property of undefined".
// To test, use the deployed Web App URL in your browser instead.
// =============================================================================

function doGet(e) {

  // Read the "mode" parameter from the URL (?mode=preview or ?mode=send)
  // If no mode is provided, default to an empty string
  const mode = (e && e.parameter && e.parameter.mode) ? e.parameter.mode : "";

  if (mode === "preview") {
    // ── PREVIEW MODE ──
    // Build the full email HTML and render it directly in the browser.
    // This lets you see exactly what the GM will receive before it is sent.
    const html = buildEmail();
    return HtmlService.createHtmlOutput(html)
      .setTitle("Daily Report Preview")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } else if (mode === "send") {
    // ── SEND MODE ──
    // Build and send the email, then return a confirmation page.
    const html = buildEmail();
    sendReport(html);
    return HtmlService.createHtmlOutput(
      "<p style='font-family:sans-serif;padding:20px;color:#15803d;'>" +
      "✅ Report sent successfully to " + CONFIG.toEmail + ".</p>"
    );

  } else {
    // ── NO MODE ──
    // Someone opened the base Web App URL without a mode parameter.
    // Show a friendly status page instead of a blank or error screen.
    return HtmlService.createHtmlOutput(
      "<p style='font-family:sans-serif;padding:20px;color:#64748b;'>" +
      "Daily Report Web App is running.<br>" +
      "Append <code>?mode=preview</code> or <code>?mode=send</code> to the URL.</p>"
    );
  }
}


// =============================================================================
// ── SECTION 3: SCHEDULED SEND (called by time-based trigger)
// =============================================================================
// This function is called automatically by the Apps Script time-based trigger.
// Set the trigger to run "sendScheduled" on a Day timer between 5PM–6PM.
//
// It checks the current day against the CONFIG.skipDays list.
// If today is in the skip list (e.g. Sunday), it exits silently.
// Otherwise, it builds and sends the report.
//
// TO TEST THIS MANUALLY:
//   Select "sendScheduled" from the function dropdown in the editor and click Run.
//   It will send the email immediately (unless today is a skip day).
// =============================================================================

function sendScheduled() {

  // Get today's day number (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const today = new Date().getDay();

  // Check if today is in the skipDays list
  if (CONFIG.skipDays.includes(today)) {
    // Log the skip so it appears in the Executions log for visibility
    Logger.log("sendScheduled: Skipping today (day " + today + " is in skipDays list).");
    return; // Exit without sending
  }

  // Build the HTML email content from the Sheet data
  const html = buildEmail();

  // Send the email
  sendReport(html);

  Logger.log("sendScheduled: Report sent successfully.");
}


// =============================================================================
// ── SECTION 4: MANUAL SEND (assigned to "Send Report Now" button in Sheet)
// =============================================================================
// This function is called when the user clicks the "Send Report Now" button
// in the Google Sheet.
//
// It shows a confirmation dialog first, so the user does not send by accident.
// After confirming, it sends the email and shows a success message.
//
// TO ASSIGN TO A BUTTON:
//   Insert → Drawing → add a button shape → click the 3-dot menu on the shape
//   → Assign script → type "sendNow"
// =============================================================================

function sendNow() {

  // Get the active spreadsheet UI so we can show dialogs
  const ui = SpreadsheetApp.getUi();

  // Show a yes/no confirmation dialog before sending
  const response = ui.alert(
    "Send Daily Report",
    "Send the daily report email now to " + CONFIG.toEmail + "?",
    ui.ButtonSet.YES_NO
  );

  // If the user clicked anything other than YES, cancel and do nothing
  if (response !== ui.Button.YES) {
    Logger.log("sendNow: User cancelled.");
    return;
  }

  // Build the HTML email content from the Sheet data
  const html = buildEmail();

  // Send the email
  sendReport(html);

  // Show a success confirmation popup
  ui.alert("✅ Report sent to " + CONFIG.toEmail + ".");
  Logger.log("sendNow: Report sent successfully.");
}


// =============================================================================
// ── SECTION 5: OPEN PREVIEW (assigned to "Preview Report" button in Sheet)
// =============================================================================
// This function is called when the user clicks the "Preview Report" button
// in the Google Sheet.
//
// It opens a small dialog with a clickable link to the Web App preview URL.
// The link is opened in a new browser tab so the user can see the email layout.
//
// WHY A LINK INSTEAD OF window.open():
//   Firefox and some browser security settings block window.open() inside
//   Apps Script modal dialogs. Using a clickable anchor tag is more reliable
//   across all browsers.
//
// CACHE-BUSTING:
//   A ?t= timestamp is appended to the URL on every click.
//   This forces the browser to reload the preview from the Sheet instead of
//   serving a cached version from the previous click.
//
// TO ASSIGN TO A BUTTON:
//   Same as sendNow — Insert → Drawing → Assign script → type "openPreview"
//
// IMPORTANT: Replace the URL below with YOUR deployed Web App URL.
//   It should look like: https://script.google.com/macros/s/YOUR_ID_HERE/exec
// =============================================================================

function openPreview() {

  // ── REPLACE THIS URL WITH YOUR DEPLOYED WEB APP URL ──
  // After deploying (Deploy → New deployment → Web app), copy the Web App URL
  // and paste it here, replacing the placeholder below.
  // Keep the quotes and everything after the URL exactly as written.
  const webAppUrl = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";

  // Add a cache-busting timestamp so the preview always shows fresh data
  const previewUrl = webAppUrl + "?mode=preview&t=" + new Date().getTime();

  // Build a small HTML dialog with a clickable link
  const html = HtmlService.createHtmlOutput(
    "<p style='font-family:sans-serif;font-size:14px;padding:10px;'>" +
    "Click the link below to preview the report in a new tab:<br><br>" +
    "<a href='" + previewUrl + "' target='_blank' " +
    "style='color:#3b9eff;font-weight:600;'>Open Report Preview ↗</a>" +
    "</p>"
  )
  .setWidth(360)
  .setHeight(120);

  // Display the dialog over the Sheet
  SpreadsheetApp.getUi().showModalDialog(html, "Preview Report");
}


// =============================================================================
// ── SECTION 6: EMAIL BUILDER
// =============================================================================
// buildEmail() is the core function. It:
//   1. Opens the Sheet and reads all rows of task data
//   2. Skips any rows where Task Description is empty
//   3. Formats each row as an HTML table row
//   4. Wraps everything in a full, styled HTML email template
//   5. Returns the complete HTML string
//
// This function does NOT send anything — it only builds and returns the HTML.
// Sending is handled separately by sendReport().
// =============================================================================

function buildEmail() {

  // ── READ SHEET DATA ──
  // Open the active spreadsheet (the one this script is bound to)
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get the sheet tab by name from CONFIG
  const sheet = ss.getSheetByName(CONFIG.sheetName);

  // Guard: if the sheet tab name doesn't exist, throw a clear error
  if (!sheet) {
    throw new Error(
      "Sheet tab '" + CONFIG.sheetName + "' not found. " +
      "Check CONFIG.sheetName and make sure the tab exists."
    );
  }

  // Get all data from the sheet as a 2D array
  // getDataRange() automatically covers only rows and columns that have content
  const data = sheet.getDataRange().getValues();

  // ── BUILD TABLE ROWS ──
  // We start from row index 1 (row 2 in Sheets) to skip the header row
  let tableRows = "";

  // Row counter for the # column in the email table
  // This counts only visible (non-empty) rows, not Sheet row numbers
  let rowNum = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Map columns by their position in the Sheet
    // A=0, B=1, C=2, D=3, E=4, F=5, G=6
    const stepNo      = row[0]; // Column A: Step No.
    const taskDesc    = row[1]; // Column B: Task Description
    const status      = row[2]; // Column C: Status
    const doneBy      = row[3]; // Column D: Done By
    const dateGiven   = row[4]; // Column E: Date Given
    const targetDate  = row[5]; // Column F: Target Date
    const remarks     = row[6]; // Column G: Remarks

    // Skip rows where Task Description is empty (blank rows in the Sheet)
    if (!taskDesc || taskDesc.toString().trim() === "") continue;

    // Increment visible row counter
    rowNum++;

    // ── FORMAT DATES ──
    // Dates from Google Sheets come in as JavaScript Date objects.
    // We convert them to a readable "DD MMM YYYY" format (e.g. "08 May 2026").
    // If a cell is empty or not a valid date, we show "—" as a fallback.
    const formattedGiven  = formatDate(dateGiven);
    const formattedTarget = formatDate(targetDate);

    // Build the Duration string: "Date Given → Target Date"
    // Example: "08 May 2026 → 11 May 2026"
    // If both dates are missing, show "—"
    let duration = "—";
    if (formattedGiven !== "—" && formattedTarget !== "—") {
      duration = formattedGiven + " → " + formattedTarget;
    } else if (formattedGiven !== "—") {
      duration = formattedGiven + " → (no target)";
    } else if (formattedTarget !== "—") {
      duration = "(no start) → " + formattedTarget;
    }

    // Alternate row background colour for readability
    // Even rows get a very light grey, odd rows stay white
    const rowBg = (rowNum % 2 === 0) ? "#f8fafc" : "#ffffff";

    // Build the HTML for this row
    // Each cell uses inline styles for maximum email client compatibility
    tableRows += `
      <tr style="background:${rowBg};">
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px;color:#64748b;white-space:nowrap;">${rowNum}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;">${escapeHtml(taskDesc)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;white-space:nowrap;">${escapeHtml(status)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;white-space:nowrap;">${escapeHtml(doneBy)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;white-space:nowrap;">${escapeHtml(duration)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;">${escapeHtml(remarks)}</td>
      </tr>`;
  }

  // If no data rows were found (all rows were empty), show a placeholder row
  if (rowNum === 0) {
    tableRows = `
      <tr>
        <td colspan="6" style="padding:20px;text-align:center;font-size:13px;color:#94a3b8;font-style:italic;">
          No tasks found in ${CONFIG.sheetName} today.
        </td>
      </tr>`;
  }

  // ── BUILD SUBJECT DATE ──
  // Format today's date as DD-MM-YY for the email subject line
  // Example: "15-05-26"
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, "0");
  const mm  = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const yy  = String(now.getFullYear()).slice(-2);          // Last 2 digits of year
  const subjectDate = `${dd}-${mm}-${yy}`;

  // ── ASSEMBLE FULL HTML EMAIL ──
  // This is the complete HTML that will appear in the recipient's email client.
  // All styles are inline — external stylesheets are stripped by most email clients.
  // The layout uses a single centered table for maximum compatibility (including Outlook).
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${CONFIG.subjectPrefix}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">

  <!-- Outer wrapper table — centers the email in all clients -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr>
      <td align="center">

        <!-- Inner email container — max 700px wide -->
        <table width="100%" cellpadding="0" cellspacing="0"
               style="max-width:700px;background:#ffffff;border-radius:10px;
                      box-shadow:0 2px 12px rgba(0,0,0,0.07);overflow:hidden;">

          <!-- Header bar -->
          <tr>
            <td style="background:#0f2133;padding:22px 28px;">
              <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.3px;">
                📊 Velath Engineering International FZC — Daily Job Report
              </span>
              <span style="float:right;color:#8ab8d8;font-size:13px;line-height:2;">
                ${dd}-${mm}-${yy}
              </span>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:22px 28px 8px;">
              <p style="margin:0;font-size:14px;color:#1e293b;">${escapeHtml(CONFIG.greeting)}</p>
              <p style="margin:10px 0 0;font-size:13.5px;color:#475569;">
                Please find below the my task status update for today.
              </p>
            </td>
          </tr>

          <!-- Task table -->
          <tr>
            <td style="padding:16px 28px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">

                <!-- Table header -->
                <thead>
                  <tr style="background:#1a3c5e;">
                    <th style="padding:10px 12px;text-align:center;font-size:12px;color:#ffffff;font-weight:600;white-space:nowrap;">#</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#ffffff;font-weight:600;">Task Description</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#ffffff;font-weight:600;white-space:nowrap;">Status</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#ffffff;font-weight:600;white-space:nowrap;">Done By</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#ffffff;font-weight:600;white-space:nowrap;">Duration</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#ffffff;font-weight:600;">Remarks</th>
                  </tr>
                </thead>

                <!-- Task rows (generated above) -->
                <tbody>${tableRows}</tbody>

              </table>
            </td>
          </tr>

          <!-- Sign-off -->
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:13.5px;color:#1e293b;">${escapeHtml(CONFIG.signoff)}</p>
              <p style="margin:4px 0 0;font-size:13.5px;font-weight:600;color:#0f2133;">${escapeHtml(CONFIG.senderName)}</p>
            </td>
          </tr>

          <!-- Footer bar -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 28px;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                This is an automated report generated by Google Apps Script. Do not reply to this email directly.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  return html;
}


// =============================================================================
// ── SECTION 7: EMAIL SENDER
// =============================================================================
// sendReport() takes the HTML string built by buildEmail() and sends it
// using MailApp.sendEmail() — Google's built-in email service.
//
// WHY MailApp AND NOT SMTP?
//   MailApp runs entirely on Google's servers. No external SMTP host, no ports,
//   no passwords, no firewall issues. It uses the Google account that owns the
//   script as the sender.
//
// DAILY SEND LIMIT:
//   Free Google accounts:    100 emails per day
//   Google Workspace accounts: 1,500 emails per day
//   This script sends one email per day, so limits are never a concern.
//
// CC AND BCC:
//   CC and BCC are included automatically from CONFIG if set.
//   Leave CONFIG.ccEmail and CONFIG.bccEmail as "" to skip them.
// =============================================================================

function sendReport(html) {

  // Build the email subject line
  // Example: "[15-05-26] R&D - Daily Report"
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, "0");
  const mm  = String(now.getMonth() + 1).padStart(2, "0");
  const yy  = String(now.getFullYear()).slice(-2);
  const subject = "[" + dd + "-" + mm + "-" + yy + "] " + CONFIG.subjectPrefix;

  // Build the options object for MailApp.sendEmail()
  // Only htmlBody is required — all other fields are optional
  const mailOptions = {
    htmlBody: html,
    name:     CONFIG.senderName, // Sender display name shown in the inbox
  };

  // Add CC if configured (and not empty)
  if (CONFIG.ccEmail && CONFIG.ccEmail.trim() !== "") {
    mailOptions.cc = CONFIG.ccEmail;
  }

  // Add BCC if configured (and not empty)
  if (CONFIG.bccEmail && CONFIG.bccEmail.trim() !== "") {
    mailOptions.bcc = CONFIG.bccEmail;
  }

  // Add Reply-To if configured (and not empty)
  if (CONFIG.replyTo && CONFIG.replyTo.trim() !== "") {
    mailOptions.replyTo = CONFIG.replyTo;
  }

  // Send the email using Google's MailApp service
  // This does NOT require any SMTP credentials — it uses the script owner's account
  MailApp.sendEmail(CONFIG.toEmail, subject, "", mailOptions);

  Logger.log("sendReport: Email sent. To: " + CONFIG.toEmail + " | Subject: " + subject);
}


// =============================================================================
// ── SECTION 8: HELPER FUNCTIONS
// =============================================================================
// Small utility functions used by buildEmail().
// These do not need to be edited.
// =============================================================================

/**
 * formatDate(value)
 *
 * Converts a value from a Google Sheets cell into a human-readable date string.
 * Google Sheets stores dates as JavaScript Date objects when read via getValues().
 *
 * Returns a string like "08 May 2026".
 * Returns "—" if the value is empty, null, or not a valid date.
 *
 * @param {*} value - The raw cell value from sheet.getDataRange().getValues()
 * @returns {string} - Formatted date string or "—"
 */
function formatDate(value) {
  // Return a dash if the cell is empty or null
  if (!value || value === "") return "—";

  // Try to create a Date object from the value
  const date = new Date(value);

  // Check if the result is a valid date (invalid dates return NaN for getTime())
  if (isNaN(date.getTime())) return "—";

  // Format as "DD Mon YYYY" using en-GB locale for day-first ordering
  return date.toLocaleDateString("en-GB", {
    day:   "2-digit",
    month: "short",
    year:  "numeric",
  });
  // Example output: "08 May 2026"
}


/**
 * escapeHtml(text)
 *
 * Escapes special HTML characters in text so they display correctly in the email.
 * Without this, characters like < > & in task descriptions would break the HTML.
 *
 * For example: "Fix bug in A&B module" → "Fix bug in A&amp;B module"
 *
 * @param {*} text - Raw cell value (may be a string, number, or other type)
 * @returns {string} - HTML-safe string
 */
function escapeHtml(text) {
  // Convert to string first in case the cell contains a number or boolean
  const str = String(text || "");

  return str
    .replace(/&/g,  "&amp;")   // Must be first — & is used in other replacements
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}
