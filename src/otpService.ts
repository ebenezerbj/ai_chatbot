/**
 * OTP Service Module
 * Handles SMS OTP generation and verification using Twilio
 */

import twilio from 'twilio';

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 3;

interface OTPSession {
  accountNumber: string;
  phoneNumber: string;
  otp: string;
  generatedAt: Date;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}

// In-memory OTP store (for production, use Redis)
const otpSessions = new Map<string, OTPSession>();

/**
 * Generate random OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via Twilio SMS
 */
async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('[OTP] Twilio not configured. OTP:', message.match(/\d{6}/)?.[0]);
      // In development, log OTP to console
      console.log(`[OTP DEV MODE] Phone: ${phoneNumber}, OTP: ${message.match(/\d{6}/)?.[0]}`);
      return true;
    }

    const client = twilio(accountSid, authToken);
    
    // Format phone number for Twilio (ensure +233 format)
    let formattedPhone = phoneNumber;
    if (phoneNumber.startsWith('0')) {
      formattedPhone = '+233' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('+')) {
      formattedPhone = '+233' + phoneNumber;
    }

    await client.messages.create({
      body: message,
      from: fromNumber,
      to: formattedPhone
    });

    console.log(`[OTP] SMS sent successfully to ${formattedPhone}`);
    return true;
  } catch (error: any) {
    console.error('[OTP] Failed to send SMS:', error.message);
    return false;
  }
}

/**
 * Generate and send OTP to customer
 */
export async function generateAndSendOTP(
  accountNumber: string,
  phoneNumber: string,
  customerName?: string
): Promise<{ success: boolean; message: string; sessionKey: string }> {
  try {
    // Generate OTP
    const otp = generateOTP();
    const now = new Date();
    const sessionKey = `${accountNumber}_${phoneNumber}`;

    // Create OTP session
    const otpSession: OTPSession = {
      accountNumber,
      phoneNumber,
      otp,
      generatedAt: now,
      expiresAt: new Date(now.getTime() + OTP_EXPIRY),
      attempts: 0,
      verified: false
    };

    otpSessions.set(sessionKey, otpSession);

    // Send SMS
    const name = customerName ? customerName.split(' ')[0] : 'Customer';
    const message = `Hello ${name}, your AKCB verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    
    const sent = await sendSMS(phoneNumber, message);

    if (sent) {
      return {
        success: true,
        message: `A 6-digit verification code has been sent to your registered phone number ${phoneNumber.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')}. Please enter the code to continue.`,
        sessionKey
      };
    } else {
      // Clean up session if SMS failed
      otpSessions.delete(sessionKey);
      return {
        success: false,
        message: 'Unable to send verification code at this time. Please try again later or contact customer service at +233 20 205 5170.',
        sessionKey: ''
      };
    }
  } catch (error: any) {
    console.error('[OTP] Error generating OTP:', error.message);
    return {
      success: false,
      message: 'An error occurred. Please try again later.',
      sessionKey: ''
    };
  }
}

/**
 * Verify OTP entered by customer
 */
export function verifyOTP(
  sessionKey: string,
  enteredOTP: string
): { success: boolean; message: string; accountNumber?: string } {
  const session = otpSessions.get(sessionKey);

  if (!session) {
    return {
      success: false,
      message: 'No verification session found. Please request a new code.'
    };
  }

  // Check if already verified
  if (session.verified) {
    return {
      success: false,
      message: 'This verification code has already been used. Please request a new code if needed.'
    };
  }

  // Check expiry
  if (session.expiresAt < new Date()) {
    otpSessions.delete(sessionKey);
    return {
      success: false,
      message: 'Verification code has expired. Please request a new code.'
    };
  }

  // Check max attempts
  session.attempts++;
  if (session.attempts > MAX_OTP_ATTEMPTS) {
    otpSessions.delete(sessionKey);
    return {
      success: false,
      message: 'Maximum verification attempts exceeded. Please request a new code or contact customer service at +233 20 205 5170.'
    };
  }

  // Verify OTP
  if (enteredOTP === session.otp) {
    session.verified = true;
    otpSessions.set(sessionKey, session);
    
    // Clean up session after 1 minute (allow time for authenticated requests)
    setTimeout(() => {
      otpSessions.delete(sessionKey);
    }, 60000);

    return {
      success: true,
      message: 'Verification successful! You can now access your account information.',
      accountNumber: session.accountNumber
    };
  }

  return {
    success: false,
    message: `Invalid verification code. You have ${MAX_OTP_ATTEMPTS - session.attempts} attempt(s) remaining.`
  };
}

/**
 * Check if OTP is verified for a session
 */
export function isOTPVerified(sessionKey: string): boolean {
  const session = otpSessions.get(sessionKey);
  return session?.verified ?? false;
}

/**
 * Clean up expired OTP sessions (run periodically)
 */
export function cleanupExpiredOTPs(): void {
  const now = new Date();
  for (const [key, session] of otpSessions.entries()) {
    if (session.expiresAt < now || (session.verified && session.generatedAt.getTime() < now.getTime() - 60000)) {
      otpSessions.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupExpiredOTPs, 60000);
