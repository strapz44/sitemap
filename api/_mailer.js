/**
 * Mailer — Prerender V3
 * Uses Resend REST API (no npm package needed — native https module only).
 * Set RESEND_API_KEY in environment variables.
 * Free tier: 3 000 emails/month — https://resend.com
 */

const https = require('https')

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const FROM_EMAIL     = process.env.MAIL_FROM || 'Prerender <noreply@prerender.io>'

/**
 * Send an email via Resend API.
 * @param {{ to: string, subject: string, html: string }} opts
 */
async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    // Dev fallback — log the email instead of sending
    console.info('[mailer] RESEND_API_KEY not set — email would have been sent to:', to)
    console.info('[mailer] Subject:', subject)
    return { ok: true, dev: true }
  }

  const body = JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = ''
        res.on('data', (c) => { data += c })
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ ok: true, id: json.id })
            } else {
              console.error('[mailer] Resend error:', json)
              resolve({ ok: false, error: json })
            }
          } catch {
            resolve({ ok: false, error: data })
          }
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

/**
 * Password reset email template.
 */
function resetPasswordEmail(resetUrl) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:32px 40px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Réinitialisation du mot de passe</h1>
    </div>
    <div style="padding:32px 40px;">
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">
        Réinitialiser mon mot de passe
      </a>
      <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;line-height:1.6;">
        Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas fait cette demande, ignorez cet email.
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px 40px;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Prerender — Ne pas répondre à cet email.</p>
    </div>
  </div>
</body>
</html>`
}

module.exports = { sendEmail, resetPasswordEmail }
