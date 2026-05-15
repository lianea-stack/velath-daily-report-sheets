# Changelog

All notable changes to this project are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-05-15

### Added
- Full Google Apps Script automation bound to Google Sheet (Sheet1)
- `buildEmail()` — reads Sheet data and generates a full responsive HTML email
- `sendReport()` — sends email via `MailApp.sendEmail()` with CC, BCC, and Reply-To support
- `sendScheduled()` — time-based auto-send with configurable skip days (default: skip Sunday)
- `sendNow()` — manual send via Sheet button with confirmation dialog
- `openPreview()` — opens browser preview via Sheet button, Firefox-compatible (link in modal)
- `doGet()` — Web App entry point supporting `?mode=preview` and `?mode=send`
- `CONFIG` block at the top of the script — single place to configure all settings
- `formatDate()` helper — converts Sheet date values to "DD Mon YYYY" format
- `escapeHtml()` helper — sanitises task text to prevent HTML injection in email
- Cache-busting `?t=` timestamp on preview URL to prevent stale previews
- Alternating row background colours in email table for readability
- Fallback row when Sheet has no task data
- 7-step interactive setup guide (`docs/setup-guide.html`) for non-technical users
- Sheet template published at `/copy` URL for easy distribution
- README with full configuration reference, deployment steps, and testing guide

### Configuration options in this release
- `senderName` — display name in email sign-off and sender field
- `toEmail` — primary recipient (supports multiple comma-separated addresses)
- `ccEmail` — CC recipients (optional, leave empty to disable)
- `bccEmail` — BCC recipients (optional, leave empty to disable)
- `replyTo` — custom reply-to address (optional)
- `sheetName` — Sheet tab name
- `greeting` — email greeting line
- `signoff` — email sign-off line
- `skipDays` — array of day numbers to skip when scheduled
- `subjectPrefix` — text after the date in the subject line

---

<!-- Unreleased changes go here before the next version tag -->
## [Unreleased]

_(nothing yet)_
