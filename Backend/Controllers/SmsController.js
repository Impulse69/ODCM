const https = require('https');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const pool = require('../Config/db');

// ─── Hubtel SMS Helper ────────────────────────────────────────────────────────

function sendHubtelSms({ clientId, clientSecret, senderId, to, message }) {
  return new Promise((resolve) => {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = JSON.stringify({
      From: senderId,
      To: to,
      Content: message,
      RegisteredDelivery: 'false',
    });

    const options = {
      hostname: 'sms.hubtel.com',
      path: '/v1/messages/send',
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (httpRes) => {
      let data = '';
      httpRes.on('data', (chunk) => (data += chunk));
      httpRes.on('end', () => {
        console.log(`[SMS] Hubtel HTTP ${httpRes.statusCode} → ${data.slice(0, 300)}`);
        try {
          const parsed = JSON.parse(data);
          // Hubtel v1 success: status === 0 (top-level integer)
          const apiStatus = Number(parsed.Status ?? parsed.status ?? -1);
          const httpOk = httpRes.statusCode >= 200 && httpRes.statusCode < 300;
          // messageId can be nested (Data.MessageId / data.messageId) or top-level
          const msgData = parsed.Data || parsed.data || {};
          const hasId = !!(msgData.MessageId || msgData.messageId ||
            parsed.messageId || parsed.MessageId);
          // Accept if: explicit success code (0) OR HTTP 2xx with a message ID
          if (apiStatus === 0 || (httpOk && hasId)) {
            resolve({ success: true });
          } else {
            const reason = parsed.Message || parsed.message || parsed.statusDescription || parsed.StatusDescription || `HTTP ${httpRes.statusCode} · apiStatus=${apiStatus}`;
            console.error(`[SMS] Hubtel rejected — ${reason}`);
            resolve({ success: false, message: reason });
          }
        } catch {
          resolve({ success: false, message: `Non-JSON response from Hubtel (HTTP ${httpRes.statusCode})` });
        }
      });
    });

    req.on('error', (err) => resolve({ success: false, message: err.message }));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ success: false, message: 'Request timed out' });
    });
    req.write(body);
    req.end();
  });
}

// ─── Admin Email Helper ──────────────────────────────────────────────────────

async function sendAdminEmail({ cfg, expiredList }) {
  if (!cfg.admin_email) return;            // no admin email configured — skip
  if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) return; // no SMTP
  if (expiredList.length === 0) return;

  const transporter = createSmtpTransport(cfg);

  const currency = 'GH\u20B5';
  const rows = expiredList.map((v) => {
    const amount = v.monthly_amount ? `${currency}${Number(v.monthly_amount).toFixed(2)}` : 'N/A';
    return `    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${v.customer_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${v.phone || '-'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-family:monospace">${v.plate_number}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${new Date(v.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#e53e3e;font-weight:600">${amount}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:${v.sms_sent ? '#2f855a' : '#c53030'}">${v.sms_sent ? '\u2713 Sent' : '\u2715 Failed'}</td>
    </tr>`;
  }).join('\n');

  const totalOwed = expiredList.reduce((sum, v) => sum + (Number(v.monthly_amount) || 0), 0);

  const html = `
<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1a202c;max-width:680px;margin:0 auto;padding:24px">
  <h2 style="color:#c53030;margin-bottom:4px">\u26A0\uFE0F Expired Vehicles — Action Required</h2>
  <p style="color:#718096;margin-top:0">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
  <p>The following <strong>${expiredList.length}</strong> vehicle${expiredList.length !== 1 ? 's have' : ' has'} expired and been moved to the Removed list.
     Expiry SMS notification${expiredList.length !== 1 ? 's have' : ' has'} been sent to the customers.</p>
  <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <thead style="background:#fff5f5">
      <tr>
        <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#718096">Customer</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#718096">Phone</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#718096">Plate</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#718096">Expired</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#718096">Amount Owed</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#718096">SMS</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin-top:16px;font-size:14px">Total outstanding: <strong style="color:#c53030">${currency}${totalOwed.toFixed(2)}</strong></p>
  <p style="color:#a0aec0;font-size:12px;margin-top:32px">Sent automatically by ODCM &mdash; do not reply to this email.</p>
</body></html>`;

  await transporter.sendMail({
    from: `"ODCM System" <${cfg.smtp_user}>`,
    to: cfg.admin_email,
    subject: `[ODCM] ${expiredList.length} expired vehicle${expiredList.length !== 1 ? 's' : ''} — ${new Date().toLocaleDateString('en-GB')}`,
    html,
  });
}

// ─── Settings Helpers ─────────────────────────────────────────────────────────

async function getConfigFromDb() {
  const { rows } = await pool.query('SELECT key, value FROM sms_settings');
  const cfg = {};
  for (const row of rows) cfg[row.key] = row.value;
  return cfg;
}

async function upsertSetting(key, value) {
  await pool.query(
    `INSERT INTO sms_settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, String(value)],
  );
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function looksLikeHostname(value) {
  const host = String(value || '').trim();
  if (!host || host.includes('@') || /\s/.test(host)) return false;
  return /^[a-zA-Z0-9.-]+$/.test(host);
}

function formatEmailError(err) {
  const message = String(err?.message || 'Unknown email error');
  const responseCode = err?.responseCode;

  if (responseCode === 535 || /535/.test(message)) {
    return `${message}. Check SMTP username/password, and if you use Microsoft 365 make sure SMTP AUTH is enabled for the mailbox.`;
  }

  if (responseCode === 534 || /app password/i.test(message)) {
    return `${message}. Your provider may require an app password instead of the normal mailbox password.`;
  }

  if (/ECONNREFUSED|ETIMEDOUT|timeout/i.test(message)) {
    return `${message}. Check SMTP host, port, firewall, and whether the server accepts connections from this machine.`;
  }

  return message;
}

function createSmtpTransport(cfg) {
  return nodemailer.createTransport({
    host: cfg.smtp_host,
    port: parseInt(cfg.smtp_port || '587'),
    secure: String(cfg.smtp_port) === '465',
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
  });
}

function getIsoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getWeekStart(date) {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return weekStart;
}

async function getWeeklyExpiredWithSentSms(referenceDate = new Date()) {
  const { rows } = await pool.query(
    `SELECT s.id, s.plate_number, s.expiry_date, s.monthly_amount, s.sms_sent_at,
            COALESCE(ic.name,  co.company_name)  AS customer_name,
            COALESCE(ic.phone, co.contact_phone) AS phone
     FROM subscriptions s
     LEFT JOIN individual_customers ic ON ic.id = s.individual_customer_id
     LEFT JOIN companies            co ON co.id = s.company_id
     WHERE s.status = 'Removed'
       AND s.last_sms_type = 'expired'
       AND s.sms_status = 'Sent'
       AND s.sms_sent_at IS NOT NULL
       AND s.sms_sent_at >= DATE_TRUNC('week', $1::timestamp)
       AND s.sms_sent_at <  DATE_TRUNC('week', $1::timestamp) + INTERVAL '7 days'
     ORDER BY s.sms_sent_at ASC`,
    [referenceDate],
  );
  return rows;
}

function formatMoney(value) {
  const currency = 'GH₵';
  return value ? `${currency}${Number(value).toFixed(2)}` : 'N/A';
}

function formatMoneyPdf(value) {
  return value ? `GHS ${Number(value).toFixed(2)}` : 'N/A';
}

function buildWeeklySummaryEmailHtml(weeklyExpired, now, options = {}) {
  const { isTest = false } = options;
  const weekStart = getWeekStart(now);
  const totalOwed = weeklyExpired.reduce((sum, v) => sum + (Number(v.monthly_amount) || 0), 0);
  const rowHtml = weeklyExpired.length
    ? weeklyExpired.map((v) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eef2f7">${v.customer_name || '-'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef2f7">${v.phone || '-'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef2f7;font-family:Consolas,monospace">${v.plate_number || '-'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef2f7">${new Date(v.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef2f7;color:#b91c1c;font-weight:700">${formatMoney(v.monthly_amount)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef2f7;color:#15803d;font-weight:600">Sent</td>
      </tr>`).join('')
    : `
      <tr>
        <td colspan="5" style="padding:14px;color:#64748b;text-align:center">No expired vehicles with successful SMS found for this week.</td>
      </tr>`;

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#0f172a">
  <div style="max-width:760px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(135deg,#7f1d1d,#991b1b);color:#fff;border-radius:12px;padding:18px 20px">
      <div style="font-size:12px;letter-spacing:.08em;opacity:.9;text-transform:uppercase">ODCM Admin Report</div>
      <h2 style="margin:6px 0 4px 0;font-size:22px;line-height:1.2">Weekly Expired Vehicles Summary</h2>
      <p style="margin:0;font-size:13px;opacity:.9">Week ${weekStart.toLocaleDateString('en-GB')} - ${now.toLocaleDateString('en-GB')}</p>
    </div>

    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin-top:14px;padding:14px 16px">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div style="background:#f1f5f9;border-radius:10px;padding:10px 12px;min-width:150px">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase">Expired This Week</div>
          <div style="font-size:20px;font-weight:700">${weeklyExpired.length}</div>
        </div>
        <div style="background:#fef2f2;border-radius:10px;padding:10px 12px;min-width:170px">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase">Total Outstanding</div>
          <div style="font-size:20px;font-weight:700;color:#b91c1c">GH₵${totalOwed.toFixed(2)}</div>
        </div>
        <div style="background:#ecfdf5;border-radius:10px;padding:10px 12px;min-width:190px">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase">SMS Status</div>
          <div style="font-size:14px;font-weight:700;color:#15803d">All listed entries are Sent</div>
        </div>
      </div>
      <p style="margin:12px 0 0 0;color:#475569;font-size:13px">
        ${isTest
      ? 'This is a test preview of the weekly bundle email and attached PDF report.'
      : 'This bundle includes vehicles that expired this week and had expiry SMS sent successfully.'}
      </p>
    </div>

    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin-top:14px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead style="background:#0f172a;color:#fff">
          <tr>
            <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em">Customer</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em">Phone</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em">Plate</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em">Expired</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em">Amount Owed</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em">SMS</th>
          </tr>
        </thead>
        <tbody>${rowHtml}</tbody>
      </table>
    </div>

    <p style="color:#94a3b8;font-size:12px;margin-top:14px">Generated by ODCM on ${now.toLocaleString('en-GB')}.</p>
  </div>
</body>
</html>`;
}

function buildWeeklySummaryPdfBuffer(weeklyExpired, now) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const weekStart = getWeekStart(now);
    const totalOwed = weeklyExpired.reduce((sum, v) => sum + (Number(v.monthly_amount) || 0), 0);

    const pageLeft = 40;
    const pageRight = doc.page.width - 40;
    const tableWidth = pageRight - pageLeft;
    const rowHeight = 24;
    const tableTopStart = 164;
    const pageBottom = doc.page.height - 40;
    const columns = [
      { key: 'customer_name', label: 'Customer', width: 155, align: 'left' },
      { key: 'phone', label: 'Phone', width: 65, align: 'left' },
      { key: 'plate_number', label: 'Plate', width: 70, align: 'left' },
      { key: 'expiry_date', label: 'Expired', width: 70, align: 'left' },
      { key: 'amount', label: 'Amount', width: 90, align: 'right' },
      { key: 'sms', label: 'SMS', width: 65, align: 'center' },
    ];

    const drawTop = () => {
      doc.save();
      doc.roundedRect(pageLeft, 40, tableWidth, 66, 8).fill('#7f1d1d');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(17)
        .text('ODCM Weekly Expired Vehicles Summary', pageLeft + 14, 58);
      doc.font('Helvetica').fontSize(10)
        .text(`Week ${weekStart.toLocaleDateString('en-GB')} - ${now.toLocaleDateString('en-GB')}`, pageLeft + 14, 82);
      doc.fillColor('#0f172a');
      doc.font('Helvetica-Bold').fontSize(11).text(`Total Vehicles: ${weeklyExpired.length}`, pageLeft, 116);
      doc.text(`Total Outstanding: GHS ${totalOwed.toFixed(2)}`, pageLeft + 220, 116);
      doc.font('Helvetica').fontSize(9).fillColor('#475569')
        .text(`Generated: ${now.toLocaleString('en-GB')}`, pageLeft, 136);
      doc.restore();
    };

    const drawHeader = (y) => {
      doc.save();
      doc.rect(pageLeft, y, tableWidth, rowHeight).fill('#0f172a');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
      let x = pageLeft;
      for (const col of columns) {
        doc.text(col.label, x + 6, y + 7, {
          width: col.width - 12,
          align: col.align === 'right' ? 'right' : (col.align === 'center' ? 'center' : 'left'),
        });
        x += col.width;
      }
      doc.restore();
      return y + rowHeight;
    };

    const rowText = (value, maxLen = 34) => {
      const text = String(value ?? '');
      return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
    };

    drawTop();
    let y = drawHeader(tableTopStart);

    if (weeklyExpired.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor('#475569')
        .text('No expired vehicles with successful expiry SMS were found for this week.', pageLeft + 8, y + 8);
      doc.end();
      return;
    }

    for (let index = 0; index < weeklyExpired.length; index++) {
      const v = weeklyExpired[index];
      if (y + rowHeight > pageBottom) {
        doc.addPage();
        drawTop();
        y = drawHeader(tableTopStart);
      }

      const bg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(pageLeft, y, tableWidth, rowHeight).fill(bg);
      doc.rect(pageLeft, y, tableWidth, rowHeight).stroke('#e2e8f0');

      const row = {
        customer_name: rowText(v.customer_name, 32),
        phone: rowText(v.phone, 15),
        plate_number: rowText(v.plate_number, 16),
        expiry_date: new Date(v.expiry_date).toLocaleDateString('en-GB'),
        amount: formatMoneyPdf(v.monthly_amount),
        sms: 'Sent',
      };

      doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
      let x = pageLeft;
      for (const col of columns) {
        const value = row[col.key];
        if (col.key === 'amount') doc.fillColor('#b91c1c');
        else if (col.key === 'sms') doc.fillColor('#15803d');
        else doc.fillColor('#0f172a');

        doc.text(value, x + 6, y + 7, {
          width: col.width - 12,
          align: col.align === 'right' ? 'right' : (col.align === 'center' ? 'center' : 'left'),
        });
        x += col.width;
      }

      y += rowHeight;
    }

    doc.end();
  });
}

async function sendWeeklyExpiredSummaryIfDue(cfg) {
  if (!cfg.admin_email || !cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) return;

  const now = new Date();
  const isFriday = now.getDay() === 5;
  const isFridayMorningWindow = now.getHours() === 7;
  if (!isFriday || !isFridayMorningWindow) return;

  const weekKey = getIsoWeekKey(now);
  if (cfg.weekly_report_last_sent_week === weekKey) return;

  const weeklyExpired = await getWeeklyExpiredWithSentSms(now);

  if (weeklyExpired.length === 0) return;

  const transporter = createSmtpTransport(cfg);
  const reportFileName = `odcm-weekly-expired-${weekKey}.pdf`;
  const reportPdf = await buildWeeklySummaryPdfBuffer(weeklyExpired, now);
  const html = buildWeeklySummaryEmailHtml(weeklyExpired, now, { isTest: false });

  await transporter.sendMail({
    from: `"ODCM System" <${cfg.smtp_user}>`,
    to: cfg.admin_email,
    subject: `[ODCM] Weekly expired vehicles summary — ${now.toLocaleDateString('en-GB')}`,
    html,
    attachments: [
      {
        filename: reportFileName,
        content: reportPdf,
        contentType: 'application/pdf',
      },
    ],
  });

  await upsertSetting('weekly_report_last_sent_week', weekKey);
  console.log(`[SMS] Weekly admin summary sent → ${cfg.admin_email} (${weekKey}) · ${weeklyExpired.length} items`);
}

// ─── Template Interpolation ───────────────────────────────────────────────────

function interpolate(template, vars) {
  return template
    .replace(/\{customerName\}/g, vars.customerName || '')
    .replace(/\{vehiclePlate\}/g, vars.vehiclePlate || '')
    .replace(/\{daysLeft\}/g, String(vars.daysLeft ?? ''));
}

// ─── GET /api/sms/config ──────────────────────────────────────────────────────

async function getConfig(req, res) {
  try {
    const cfg = await getConfigFromDb();
    res.json({
      success: true,
      data: {
        clientId: cfg.client_id || '',
        clientSecretSet: !!cfg.client_secret,
        senderId: cfg.sender_id || 'ODG',
        dueSoonEnabled: cfg.due_soon_enabled === 'true',
        expiredEnabled: cfg.expired_enabled === 'true',
        dueSoonTemplate: cfg.due_soon_template ||
          'Dear {customerName}, your vehicle ({vehiclePlate}) subscription expires in {daysLeft} day(s). Please renew to avoid deactivation. - ODG',
        expiredTemplate: cfg.expired_template ||
          'Dear {customerName}, your vehicle ({vehiclePlate}) subscription has expired. Please contact us immediately to renew. - ODG',
        firstReminderDays: parseInt(cfg.first_reminder_days || '14'),
        secondReminderDays: parseInt(cfg.second_reminder_days || '7'),
        thirdReminderDays: parseInt(cfg.third_reminder_days || '3'),
        adminEmail: cfg.admin_email || '',
        smtpHost: cfg.smtp_host || '',
        smtpPort: cfg.smtp_port || '587',
        smtpUser: cfg.smtp_user || '',
        smtpPassSet: !!cfg.smtp_pass,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── POST /api/sms/config ─────────────────────────────────────────────────────

async function saveConfig(req, res) {
  try {
    const {
      clientId, clientSecret, senderId,
      dueSoonEnabled, expiredEnabled,
      dueSoonTemplate, expiredTemplate,
      firstReminderDays, secondReminderDays, thirdReminderDays,
    } = req.body;

    if (clientId !== undefined) await upsertSetting('client_id', clientId);
    if (clientSecret !== undefined && clientSecret !== '') await upsertSetting('client_secret', clientSecret);
    if (senderId !== undefined) await upsertSetting('sender_id', senderId);
    if (dueSoonEnabled !== undefined) await upsertSetting('due_soon_enabled', String(dueSoonEnabled));
    if (expiredEnabled !== undefined) await upsertSetting('expired_enabled', String(expiredEnabled));
    if (dueSoonTemplate !== undefined) await upsertSetting('due_soon_template', dueSoonTemplate);
    if (expiredTemplate !== undefined) await upsertSetting('expired_template', expiredTemplate);
    if (firstReminderDays !== undefined) await upsertSetting('first_reminder_days', String(firstReminderDays));
    if (secondReminderDays !== undefined) await upsertSetting('second_reminder_days', String(secondReminderDays));
    if (thirdReminderDays !== undefined) await upsertSetting('third_reminder_days', String(thirdReminderDays));

    const { adminEmail, smtpHost, smtpPort, smtpUser, smtpPass } = req.body;
    const trimmedAdminEmail = adminEmail === undefined ? undefined : String(adminEmail).trim();
    const trimmedSmtpHost = smtpHost === undefined ? undefined : String(smtpHost).trim();
    const trimmedSmtpUser = smtpUser === undefined ? undefined : String(smtpUser).trim();
    const trimmedSmtpPass = smtpPass === undefined ? undefined : String(smtpPass).trim();

    if (trimmedAdminEmail && !looksLikeEmail(trimmedAdminEmail)) {
      return res.status(400).json({ success: false, message: 'Admin email must be a valid email address.' });
    }

    if (trimmedSmtpHost && !looksLikeHostname(trimmedSmtpHost)) {
      return res.status(400).json({ success: false, message: 'SMTP host must be a mail server hostname like smtp.gmail.com, not an email address.' });
    }

    if (trimmedSmtpUser && !looksLikeEmail(trimmedSmtpUser)) {
      return res.status(400).json({ success: false, message: 'SMTP username must be a valid email address.' });
    }

    if (smtpPort !== undefined && smtpPort !== '') {
      const port = Number(smtpPort);
      if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        return res.status(400).json({ success: false, message: 'SMTP port must be a number between 1 and 65535.' });
      }
    }

    if (trimmedAdminEmail !== undefined) await upsertSetting('admin_email', trimmedAdminEmail);
    if (trimmedSmtpHost !== undefined) await upsertSetting('smtp_host', trimmedSmtpHost);
    if (smtpPort !== undefined) await upsertSetting('smtp_port', String(smtpPort).trim());
    if (trimmedSmtpUser !== undefined) await upsertSetting('smtp_user', trimmedSmtpUser);
    if (trimmedSmtpPass !== undefined && trimmedSmtpPass !== '') await upsertSetting('smtp_pass', trimmedSmtpPass);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── POST /api/sms/test ───────────────────────────────────────────────────────

async function testSms(req, res) {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ success: false, message: 'Phone number is required.' });

    const cfg = await getConfigFromDb();
    if (!cfg.client_id || !cfg.client_secret) {
      return res.status(400).json({ success: false, message: 'Hubtel credentials not configured.' });
    }

    const result = await sendHubtelSms({
      clientId: cfg.client_id,
      clientSecret: cfg.client_secret,
      senderId: cfg.sender_id || 'ODG',
      to,
      message: 'This is a test SMS from ODCM. Your Hubtel configuration is working correctly.',
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── POST /api/sms/test-email ────────────────────────────────────────────────

async function testEmail(req, res) {
  try {
    const cfg = await getConfigFromDb();

    if (!cfg.admin_email) {
      return res.status(400).json({ success: false, message: 'Admin email is not configured.' });
    }
    if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) {
      return res.status(400).json({ success: false, message: 'SMTP settings are incomplete. Configure host, username and password first.' });
    }

    const transporter = createSmtpTransport(cfg);
    await transporter.verify();
    const now = new Date();
    const weekKey = getIsoWeekKey(now);
    const weeklyExpired = await getWeeklyExpiredWithSentSms(now);
    const reportFileName = `odcm-weekly-expired-${weekKey}-preview.pdf`;
    const reportPdf = await buildWeeklySummaryPdfBuffer(weeklyExpired, now);

    const info = await transporter.sendMail({
      from: `"ODCM System" <${cfg.smtp_user}>`,
      to: cfg.admin_email,
      subject: `[ODCM] Test email — ${new Date().toLocaleDateString('en-GB')}`,
      html: buildWeeklySummaryEmailHtml(weeklyExpired, now, { isTest: true }),
      attachments: [
        {
          filename: reportFileName,
          content: reportPdf,
          contentType: 'application/pdf',
        },
      ],
    });

    const accepted = Array.isArray(info.accepted) ? info.accepted : [];
    const rejected = Array.isArray(info.rejected) ? info.rejected : [];
    const pending = Array.isArray(info.pending) ? info.pending : [];

    if (accepted.length === 0) {
      return res.status(502).json({
        success: false,
        message: 'SMTP did not accept any recipient for delivery.',
        data: {
          accepted,
          rejected,
          pending,
          response: info.response || '',
          messageId: info.messageId || '',
        },
      });
    }

    res.json({
      success: true,
      data: {
        message: `Test email accepted for delivery to ${cfg.admin_email}`,
        accepted,
        rejected,
        pending,
        response: info.response || '',
        messageId: info.messageId || '',
        reportFileName,
        itemCount: weeklyExpired.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: formatEmailError(err) });
  }
}

// ─── POST /api/sms/send/:vehicleId ────────────────────────────────────────────

async function sendSmsForVehicle(req, res) {
  try {
    const { vehicleId } = req.params;

    const { rows: vRows } = await pool.query(
      `SELECT s.id, s.plate_number, s.expiry_date, s.sms_status, s.last_sms_type,
              COALESCE(ic.name,  co.company_name)  AS customer_name,
              COALESCE(ic.phone, co.contact_phone) AS phone
       FROM subscriptions s
       LEFT JOIN individual_customers ic ON ic.id = s.individual_customer_id
       LEFT JOIN companies            co ON co.id = s.company_id
       WHERE s.id = $1`,
      [vehicleId],
    );

    const vehicle = vRows[0];
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    if (!vehicle.phone) return res.status(400).json({ success: false, message: 'Customer has no phone number on file.' });

    const cfg = await getConfigFromDb();
    if (!cfg.client_id || !cfg.client_secret) {
      return res.status(400).json({ success: false, message: 'Hubtel credentials not configured.' });
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expiry = new Date(vehicle.expiry_date); expiry.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((expiry - today) / 86400000);

    const smsType = daysLeft <= 0 ? 'expired' : 'due_soon';
    const template =
      smsType === 'expired'
        ? (cfg.expired_template || 'Dear {customerName}, your vehicle ({vehiclePlate}) subscription has expired. Please contact us to renew. - ODG')
        : (cfg.due_soon_template || 'Dear {customerName}, your vehicle ({vehiclePlate}) subscription expires in {daysLeft} day(s). Please renew to avoid deactivation. - ODG');

    const message = interpolate(template, {
      customerName: vehicle.customer_name,
      vehiclePlate: vehicle.plate_number,
      daysLeft: Math.max(0, daysLeft),
    });

    const result = await sendHubtelSms({
      clientId: cfg.client_id,
      clientSecret: cfg.client_secret,
      senderId: cfg.sender_id || 'ODG',
      to: vehicle.phone,
      message,
    });

    const newStatus = result.success ? 'Sent' : 'Failed';
    await pool.query(
      `UPDATE subscriptions
       SET sms_status = $1, sms_sent_at = NOW(), last_sms_type = $2, updated_at = NOW()
       WHERE id = $3`,
      [newStatus, smsType, vehicleId],
    );

    res.json({ success: true, data: { smsStatus: newStatus, smsType, failReason: result.message } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── Core SMS job logic (standalone — safe to call from scheduler or HTTP) ────

async function executeSmsJob() {
  const cfg = await getConfigFromDb();
  if (!cfg.client_id || !cfg.client_secret) {
    return { sent: 0, failed: 0, skipped: 0, removed: 0 };
  }

  const firstDays = parseInt(cfg.first_reminder_days || '14');
  const secondDays = parseInt(cfg.second_reminder_days || '7');
  const thirdDays = parseInt(cfg.third_reminder_days || '3');
  const dueSoonEnabled = cfg.due_soon_enabled === 'true';
  const expiredEnabled = cfg.expired_enabled === 'true';

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const { rows: vehicles } = await pool.query(
    `SELECT s.id, s.plate_number, s.expiry_date, s.status,
            s.sms_status, s.sms_sent_at, s.last_sms_type, s.monthly_amount,
            COALESCE(ic.name,  co.company_name)  AS customer_name,
            COALESCE(ic.phone, co.contact_phone) AS phone
     FROM subscriptions s
     LEFT JOIN individual_customers ic ON ic.id = s.individual_customer_id
     LEFT JOIN companies            co ON co.id = s.company_id
     WHERE s.status != 'Removed'`,
  );

  const results = { sent: 0, failed: 0, skipped: 0, removed: 0 };

  for (const v of vehicles) {
    if (!v.phone) { results.skipped++; continue; }

    const expiry = new Date(v.expiry_date); expiry.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((expiry - today) / 86400000);

    if (daysLeft <= 0) {
      // ── EXPIRED: send expired SMS, then always move vehicle to Removed ─────
      // Retry if the previous SMS attempt failed — only skip if already 'Sent'
      const expiredAlreadySent = v.last_sms_type === 'expired' && v.sms_status === 'Sent';
      let smsSentThisRun = false;
      if (expiredEnabled && !expiredAlreadySent) {
        const template = cfg.expired_template ||
          'Dear {customerName}, your vehicle ({vehiclePlate}) subscription has expired. Please contact us to renew. - ODG';
        const message = interpolate(template, {
          customerName: v.customer_name,
          vehiclePlate: v.plate_number,
          daysLeft: 0,
        });
        const result = await sendHubtelSms({
          clientId: cfg.client_id,
          clientSecret: cfg.client_secret,
          senderId: cfg.sender_id || 'ODG',
          to: v.phone,
          message,
        });
        const newStatus = result.success ? 'Sent' : 'Failed';
        smsSentThisRun = result.success;
        await pool.query(
          `UPDATE subscriptions
           SET sms_status = $1, sms_sent_at = NOW(), last_sms_type = 'expired', updated_at = NOW()
           WHERE id = $2`,
          [newStatus, v.id],
        );
        if (result.success) {
          results.sent++;
          console.log(`[SMS] Expired SENT → ${v.customer_name} (${v.plate_number})`);
        } else {
          results.failed++;
          console.error(`[SMS] Expired FAILED → ${v.customer_name} (${v.plate_number}) — ${result.message}`);
        }
      }

      // Move to Removed status immediately upon expiry
      await pool.query(
        `UPDATE subscriptions
         SET status = 'Removed', updated_at = NOW()
         WHERE id = $1`,
        [v.id],
      );
      results.removed++;
      continue;
    }

    // ── DUE SOON ──────────────────────────────────────────────────────────────
    if (!dueSoonEnabled || daysLeft > firstDays) { results.skipped++; continue; }

    let shouldSend = false;
    let smsTypeToSave = 'due_soon_1';

    // Figure out which phase we are in based on exact daysLeft
    // and whether we've already sent that specific phase.
    if (daysLeft === firstDays) {
      if (v.last_sms_type !== 'due_soon_1' || v.sms_status === 'Failed') {
        shouldSend = true;
        smsTypeToSave = 'due_soon_1';
      }
    } else if (daysLeft === secondDays) {
      if (v.last_sms_type !== 'due_soon_2' || v.sms_status === 'Failed') {
        shouldSend = true;
        smsTypeToSave = 'due_soon_2';
      }
    } else if (daysLeft === thirdDays) {
      if (v.last_sms_type !== 'due_soon_3' || v.sms_status === 'Failed') {
        shouldSend = true;
        smsTypeToSave = 'due_soon_3';
      }
    }

    if (!shouldSend) { results.skipped++; continue; }

    const template = cfg.due_soon_template ||
      'Dear {customerName}, your vehicle ({vehiclePlate}) subscription expires in {daysLeft} day(s). Please renew to avoid deactivation. - ODG';
    const message = interpolate(template, {
      customerName: v.customer_name,
      vehiclePlate: v.plate_number,
      daysLeft,
    });

    const result = await sendHubtelSms({
      clientId: cfg.client_id,
      clientSecret: cfg.client_secret,
      senderId: cfg.sender_id || 'ODG',
      to: v.phone,
      message,
    });

    const newStatus = result.success ? 'Sent' : 'Failed';
    await pool.query(
      `UPDATE subscriptions
       SET sms_status = $1, sms_sent_at = NOW(), last_sms_type = $2, updated_at = NOW()
       WHERE id = $3`,
      [newStatus, smsTypeToSave, v.id],
    );

    if (result.success) {
      results.sent++;
      console.log(`[SMS] Due-soon SENT → ${v.customer_name} (${v.plate_number}) — ${daysLeft}d left`);
    } else {
      results.failed++;
      console.error(`[SMS] Due-soon FAILED → ${v.customer_name} (${v.plate_number}) — ${result.message}`);
    }
  }

  // ── Send admin weekly summary once on Friday end-of-day window ───────────
  await sendWeeklyExpiredSummaryIfDue(cfg)
    .catch(err => console.error('[SMS] Admin weekly email error:', formatEmailError(err)));

  return results;
}

// ─── POST /api/sms/run-job ────────────────────────────────────────────────────

async function runSmsJob(req, res) {
  try {
    const results = await executeSmsJob();
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── GET /api/sms/stats ───────────────────────────────────────────────────────

async function getSmsStats(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE sms_status = 'Sent')                                       AS total_sent,
         COUNT(*) FILTER (WHERE sms_status = 'Failed')                                     AS total_failed,
         COUNT(*) FILTER (WHERE sms_status = 'Sent' AND DATE(sms_sent_at) = CURRENT_DATE)  AS sent_today,
         COUNT(*) FILTER (WHERE sms_status = 'Sent' AND last_sms_type LIKE 'due_soon%')    AS due_soon_sent,
         COUNT(*) FILTER (WHERE sms_status = 'Sent' AND last_sms_type = 'expired')         AS expired_sent
       FROM subscriptions`,
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getRecentSmsLogs(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT
        s.id, s.plate_number, s.sms_status, s.sms_sent_at, s.last_sms_type,
        COALESCE(ic.name, co.company_name) AS customer_name
       FROM subscriptions s
       LEFT JOIN individual_customers ic ON ic.id = s.individual_customer_id
       LEFT JOIN companies            co ON co.id = s.company_id
       WHERE s.sms_sent_at IS NOT NULL
       ORDER BY s.sms_sent_at DESC
       LIMIT 20`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getConfig,
  saveConfig,
  testSms,
  testEmail,
  sendSmsForVehicle,
  runSmsJob,
  getSmsStats,
  executeSmsJob,
  getRecentSmsLogs,
  sendHubtelSms,
  getConfigFromDb,
  createSmtpTransport,
};
