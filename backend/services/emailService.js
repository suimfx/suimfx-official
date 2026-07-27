import nodemailer from 'nodemailer'
import EmailSettings from '../models/EmailSettings.js'
import EmailTemplate from '../models/EmailTemplate.js'
import User from '../models/User.js'

// Effective settings for a tenant (own row → global fallback). adminId null = global.
const resolveSettings = async (adminId = null) => {
  return await EmailSettings.getForAdmin(adminId)
}

// Build a transporter from a settings row. Not cached — per-tenant configs differ,
// and email volume is low enough that a fresh transport per send is fine.
const buildTransporter = (settings) => {
  if (!settings || !settings.smtpHost || !settings.smtpUser) return null
  // Port 465 = SSL (secure: true), Port 587 = STARTTLS (secure: false)
  const useSecure = settings.smtpPort === 465
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: useSecure,
    auth: { user: settings.smtpUser, pass: settings.smtpPass },
    tls: { rejectUnauthorized: false }
  })
}

const getTransporter = async (adminId = null) => {
  return buildTransporter(await resolveSettings(adminId))
}

// Replace template variables
const replaceVariables = (content, variables) => {
  let result = content
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value || '')
  }
  return result
}

// Send email using template
// adminId (optional, last arg for backward compatibility): send using that tenant's
// SMTP + from-address. Omitted/null → global settings, so every existing caller is
// unaffected. Pass a user's assignedAdmin to send from their broker's own email.
export const sendTemplateEmail = async (templateSlug, toEmail, variables = {}, adminId = null) => {
  try {
    // If the caller didn't specify a tenant, resolve it from the recipient's own
    // broker (assignedAdmin). This makes EVERY notification (KYC, deposit,
    // withdrawal, challenge, …) send from that user's broker mailbox automatically,
    // without changing each caller — with a global fallback for platform users.
    let effectiveAdminId = adminId
    if (!effectiveAdminId && toEmail) {
      try {
        const recipient = await User.findOne({ email: toEmail }).select('assignedAdmin').lean()
        if (recipient?.assignedAdmin) effectiveAdminId = recipient.assignedAdmin
      } catch (_) { /* fall back to global */ }
    }
    const settings = await resolveSettings(effectiveAdminId)

    // Check if SMTP is enabled
    if (!settings || !settings.smtpEnabled) {
      console.log('SMTP is disabled, skipping email')
      return { success: false, message: 'SMTP is disabled' }
    }

    if (!settings.smtpHost) {
      console.log('Email settings not configured')
      return { success: false, message: 'Email settings not configured' }
    }

    const template = await EmailTemplate.findOne({ slug: templateSlug })
    if (!template) {
      console.log(`Template not found: ${templateSlug}`)
      return { success: false, message: 'Template not found' }
    }

    if (!template.isEnabled) {
      console.log(`Template disabled: ${templateSlug}`)
      return { success: false, message: 'Template is disabled' }
    }

    const transport = buildTransporter(settings)
    if (!transport) {
      return { success: false, message: 'Failed to create email transport' }
    }

    const subject = replaceVariables(template.subject, variables)
    const html = replaceVariables(template.htmlContent, variables)

    const mailOptions = {
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: toEmail,
      subject: subject,
      html: html
    }

    const info = await transport.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
    
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, message: error.message }
  }
}

// Generate OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Signup email-verification OTP enabled for this tenant (SMTP + otpVerificationEnabled).
export const isOTPEnabled = async (adminId = null) => {
  const settings = await resolveSettings(adminId)
  if (!settings) return false
  return settings.smtpEnabled && settings.otpVerificationEnabled
}

// Login two-factor (email OTP) enabled for this tenant (SMTP + loginOtpEnabled).
export const isLoginOtpEnabled = async (adminId = null) => {
  const settings = await resolveSettings(adminId)
  if (!settings) return false
  return settings.smtpEnabled && settings.loginOtpEnabled
}

// Get OTP expiry in minutes for a tenant (falls back to 10).
export const getOTPExpiry = async (adminId = null) => {
  const settings = await resolveSettings(adminId)
  return settings?.otpExpiryMinutes || 10
}

// Test SMTP connection for a tenant.
export const testSMTPConnection = async (adminId = null) => {
  try {
    const transport = await getTransporter(adminId)
    if (!transport) {
      return { success: false, message: 'SMTP not configured' }
    }
    await transport.verify()
    return { success: true, message: 'SMTP connection successful' }
  } catch (error) {
    return { success: false, message: error.message }
  }
}

export default {
  sendTemplateEmail,
  generateOTP,
  isOTPEnabled,
  isLoginOtpEnabled,
  getOTPExpiry,
  testSMTPConnection
}
