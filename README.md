# Velath Daily Report Automation — Google Apps Script

Automated daily R&D reporting system built entirely inside Google Sheets + Google Apps Script. No software to install. No servers. No Docker. Runs entirely on Google Cloud.

**Prepared by:** Liane Acero · R&D Engineer · Velath  
**Last updated:** May 2026

---

## What it does

- Reads task entries from a Google Sheet (Sheet1)
- Builds a formatted HTML email from those entries
- Sends the email automatically at 5PM, Monday–Saturday
- Allows manual preview and send via buttons in the Sheet
- Supports preview and send via Web App URL (for testing or external triggers)

---

## Stack

| Component | Details |
|---|---|
| Platform | Google Apps Script (bound to Google Sheet) |
| Data source | Google Sheets — Sheet1 |
| Email method | `MailApp.sendEmail()` — no SMTP, no passwords |
| Schedule | Apps Script time-based trigger, 5PM–6PM Mon–Sat |
| Preview | Web App URL `?mode=preview` |
| Manual send | Web App URL `?mode=send` + Sheet button |
| Hosting | Google Cloud — zero local infrastructure |

---

## Sheet Structure

Sheet tab name: **Sheet1**

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Step No. | Task Description | Status | Done By | Date Given | Target Date | Remarks |

---

## Quick Start

### Option A — Use the Velath template (recommended)

Click the link below to make your own copy of the Sheet. The script is already attached.

**[📋 Open Sheet Template](https://docs.google.com/spreadsheets/d/1ZEbBqsuXWiYOut8O9Dpm8gHjkN5eupHnG2XE8E58oUI/copy)**

Then follow the [7-step setup guide](docs/setup-guide.html) — no technical background needed.

### Option B — Set up from scratch

1. Create a new Google Sheet
2. Set up columns A–G as shown in the Sheet Structure table above
3. Go to **Extensions → Apps Script**
4. Paste the contents of [`script/Code.gs`](script/Code.gs) into the editor
5. Edit the `CONFIG` block at the top with your details
6. Follow Steps 4–7 in the [setup guide](docs/setup-guide.html)

---

## Configuration

All settings are at the top of `Code.gs` in the `CONFIG` block. You only ever need to edit this section.

```javascript
const CONFIG = {
  senderName:    "Liane",                  // Your name (appears in email sign-off)
  toEmail:       "Ops.UAE@velath.com",     // Primary recipient
  ccEmail:       "",                       // CC — leave "" to skip
  bccEmail:      "",                       // BCC — leave "" to skip
  replyTo:       "",                       // Reply-To — leave "" to use sender address
  sheetName:     "Sheet1",                 // Sheet tab name — must match exactly
  greeting:      "Dear GM,",              // Email greeting line
  signoff:       "Regards,",              // Email sign-off line
  skipDays:      [0],                     // Days to skip: 0=Sun, 6=Sat. [] = send every day
  subjectPrefix: "R&D - Daily Report",    // Appears in the subject after the date
};
```

### Sending to multiple people

```javascript
// Multiple recipients — separate with commas
toEmail: "manager@company.com, director@company.com",

// Add CC
ccEmail: "supervisor@company.com",

// Add BCC (silent audit copy)
bccEmail: "archive@company.com",
```

---

## Web App URLs

After deploying, your Web App URL will look like:

```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

| Action | URL |
|---|---|
| Preview report in browser | `YOUR_WEB_APP_URL?mode=preview` |
| Send report immediately | `YOUR_WEB_APP_URL?mode=send` |

---

## Deployment

### First-time deploy

1. In the Apps Script editor, click **Deploy → New deployment**
2. Click the gear icon → select **Web app**
3. Set **Execute as: Me** and **Who has access: Anyone**
4. Click **Deploy** and copy the Web App URL
5. Paste the URL into the `openPreview()` function in the script (replace `YOUR_DEPLOYMENT_ID`)
6. Redeploy as a new version

### After editing the script

Always redeploy so changes take effect:

**Deploy → Manage deployments → Edit → New version → Deploy**

The URL stays the same — you never need to update your bookmarks.

---

## Scheduled Trigger

Set up a time-based trigger to call `sendScheduled` automatically:

1. In the Apps Script editor, click the **clock icon** (Triggers) in the left sidebar
2. Click **+ Add Trigger**
3. Configure as:

| Setting | Value |
|---|---|
| Function | `sendScheduled` |
| Event source | Time-driven |
| Type | Day timer |
| Time of day | 5pm to 6pm |
| Timezone | Asia/Dubai (or your timezone) |

4. Click **Save**

The trigger fires sometime between 5PM and 6PM. Sundays are automatically skipped by the script.

---

## Testing

| Test | How |
|---|---|
| Preview | Click **Preview Report** button in the Sheet, or open `?mode=preview` URL |
| Manual send | Click **Send Report Now** button in the Sheet, or open `?mode=send` URL |
| Scheduled send | Select `sendScheduled` in the editor and click **Run** |
| View logs | Apps Script editor → **Executions** (play icon in left sidebar) |

> `doGet()` cannot be run from the editor — it requires a live browser request. Use the Web App URL instead.

---

## Repository Structure

```
velath-daily-report-sheets/
├── script/
│   └── Code.gs              ← Full Apps Script with detailed comments
├── docs/
│   └── setup-guide.html     ← 7-step interactive setup guide for non-technical users
├── README.md
├── CHANGELOG.md
└── .gitignore
```

---

## License

Internal use — Velath R&D. Not for redistribution.
