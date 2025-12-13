/**
 * OTP Service Module
 * Handles SMS OTP generation and verification using SMS Online Ghana
 */

import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';

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
 * Send OTP via SMS Online Ghana
 */
async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const apiKey = process.env.SMS_ONLINE_API_KEY;
    const senderName = process.env.SMS_ONLINE_SENDER || 'AKCB';

    if (!apiKey) {
      console.warn('[OTP] SMS Online Ghana not configured. OTP:', message.match(/\d{6}/)?.[0]);
      // In development, log OTP to console
      console.log(`[OTP DEV MODE] Phone: ${phoneNumber}, OTP: ${message.match(/\d{6}/)?.[0]}`);
      return true;
    }

    // Format phone number for SMS Online Ghana (233XXXXXXXXX format)
    let formattedPhone = phoneNumber;
    if (phoneNumber.startsWith('0')) {
      formattedPhone = '233' + phoneNumber.substring(1);
    } else if (phoneNumber.startsWith('+233')) {
      formattedPhone = phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('233')) {
      formattedPhone = '233' + phoneNumber;
    }

    // Prepare SMS request data
    const smsData = {
      text: message,
      type: 0, // GSM default encoding
      sender: senderName,
      destinations: [formattedPhone]
    };

    // Create HTTPS agent with CA certificate bundle
    let httpsAgent;
    const cacertPath = path.join(process.cwd(), 'cacert.pem');
    
    try {
      if (fs.existsSync(cacertPath)) {
        const ca = fs.readFileSync(cacertPath);
        httpsAgent = new https.Agent({
          ca: ca,
          rejectUnauthorized: true
        });
        console.log('[OTP] Using CA certificate bundle from cacert.pem');
      } else {
        console.warn('[OTP] cacert.pem not found, using default SSL settings');
        httpsAgent = new https.Agent({
          rejectUnauthorized: true
        });
      }
    } catch (certError) {
      console.warn('[OTP] Error loading cacert.pem:', certError);
      httpsAgent = new https.Agent({
        rejectUnauthorized: true
      });
    }

    // Send SMS via SMS Online Ghana API
    const response = await axios.post(
      'https://api.smsonlinegh.com/v5/message/sms/send',
      smsData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Host': 'api.smsonlinegh.com',
          'Authorization': `key ${apiKey}`
        },
        httpsAgent,
        timeout: 10000 // 10 second timeout
      }
    );

    // Check response status
    if (response.status === 200 && response.data.handshake?.id === 0) {
      console.log(`[OTP] SMS sent successfully to ${formattedPhone}`);
      
      // Log delivery status for each destination
      if (response.data.data?.destinations) {
        response.data.data.destinations.forEach((dest: any) => {
          console.log(`[OTP] Destination ${dest.to}: ${dest.status.label} (${dest.status.id})`);
        });
      }
      
      return true;
    } else {
      console.error('[OTP] SMS API returned non-success status:', response.data);
      return false;
    }
  } catch (error: any) {
    console.error('[OTP] Failed to send SMS:', error.response?.data || error.message);
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
      // Format phone number display (show last 6 digits)
      const maskedPhone = phoneNumber.length > 6 
        ? phoneNumber.slice(0, -6) + '******' + phoneNumber.slice(-3)
        : phoneNumber;
      
      return {
        success: true,
        message: `A 6-digit verification code has been sent to ${phoneNumber}. Please enter the code to continue.`,
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
