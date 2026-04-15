/**
 * Capital Pyre — Email Utility
 * Adapted from IAMS (UB CSI341).
 * Same Nodemailer + Gmail SMTP pattern.
 * Extended with Capital Pyre-specific email templates.
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email.
 * @param {string} to      - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} html    - HTML body content
 */
const sendEmail = async (to, subject, html) => {
  if (!process.env.SMTP_USER) {
    console.warn('[Mailer] SMTP not configured — skipping email to', to);
    return;
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'Capital Pyre <no-reply@capitalpyre.com>',
    to,
    subject,
    html,
  });
};

// ── Email templates ───────────────────────────────────────

const emailTemplates = {

  // Auth
  welcomeUser: (firstname, role) => ({
    subject: 'Welcome to Capital Pyre 🔥',
    html: `
      <h2>Welcome, ${firstname}!</h2>
      <p>Your Capital Pyre account has been created as a <strong>${role}</strong>.</p>
      <p>Log in to complete your profile and start connecting with ${role === 'investor' ? 'entrepreneurs and SMEs' : 'investors'}.</p>
      <p><em>Where capital ignites.</em></p>
    `,
  }),

  passwordReset: (firstname, resetUrl) => ({
    subject: 'Capital Pyre — Password Reset Request',
    html: `
      <h2>Password Reset</h2>
      <p>Hi ${firstname}, we received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  }),

  // KYC & Approvals
  kycApproved: (firstname) => ({
    subject: 'Capital Pyre — Account Verified ✅',
    html: `
      <h2>You're verified, ${firstname}!</h2>
      <p>Your identity has been verified. You now have full access to Capital Pyre.</p>
      <p>Start browsing investors or complete your profile to get matched.</p>
    `,
  }),

  smeApproved: (orgName) => ({
    subject: 'Capital Pyre — SME Profile Approved',
    html: `
      <h2>Congratulations!</h2>
      <p>Your SME profile for <strong>${orgName}</strong> has been approved on Capital Pyre.</p>
      <p>Investors can now discover your business and your Capital Readiness Score is live.</p>
    `,
  }),

  smeRejected: (orgName, reason) => ({
    subject: 'Capital Pyre — SME Profile Update',
    html: `
      <p>Dear ${orgName},</p>
      <p>Your SME registration was not approved at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please update your profile and resubmit, or contact support for assistance.</p>
    `,
  }),

  // Matching
  matchReceived: (entrepreneurName, investorName) => ({
    subject: 'Capital Pyre — New Match Request 🔥',
    html: `
      <h2>You have a new match, ${entrepreneurName}!</h2>
      <p><strong>${investorName}</strong> is interested in your profile and has sent a match request.</p>
      <p>Log in to review their profile and accept or decline.</p>
    `,
  }),

  matchAccepted: (investorName, entrepreneurName) => ({
    subject: 'Capital Pyre — Match Accepted',
    html: `
      <h2>Match confirmed, ${investorName}!</h2>
      <p><strong>${entrepreneurName}</strong> has accepted your match request.</p>
      <p>Your Deal Room is now open. Log in to start the conversation.</p>
    `,
  }),

  // Deals
  dealStageAdvanced: (recipientName, entrepreneurName, newStage) => ({
    subject: `Capital Pyre — Deal Update: ${newStage}`,
    html: `
      <h2>Deal update for ${recipientName}</h2>
      <p>The deal with <strong>${entrepreneurName}</strong> has advanced to the <strong>${newStage}</strong> stage.</p>
      <p>Log in to your Deal Room to review documents and next steps.</p>
    `,
  }),

  // Logbooks
  logbookReviewed: (studentName, weekNumber) => ({
    subject: `Capital Pyre — Week ${weekNumber} Progress Reviewed`,
    html: `
      <h2>Your progress log was reviewed, ${studentName}!</h2>
      <p>Your Week ${weekNumber} progress logbook has been reviewed by your investor.</p>
      <p>Log in to read their feedback.</p>
    `,
  }),

  // CRS Score
  crsUpdated: (firstname, score) => ({
    subject: 'Capital Pyre — Your Capital Readiness Score Updated',
    html: `
      <h2>Capital Readiness Score Update</h2>
      <p>Hi ${firstname}, your Capital Readiness Score has been updated.</p>
      <p>Your new score: <strong>${score}/100</strong></p>
      <p>Log in to see the full breakdown and tips to improve your score.</p>
    `,
  }),

  // Bond pools
  addedToBondPool: (smeOwnerName, poolName) => ({
    subject: 'Capital Pyre — Your SME Has Been Added to a Bond Pool',
    html: `
      <h2>Bond Pool Notice</h2>
      <p>Hi ${smeOwnerName}, your SME has been included in the <strong>${poolName}</strong> bond pool.</p>
      <p>This means institutional investors can now access your business as part of a structured investment instrument.</p>
      <p>Log in to view the bond pool details.</p>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
