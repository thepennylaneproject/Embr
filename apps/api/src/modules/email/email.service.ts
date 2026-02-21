/**
 * Email Service
 * Handles sending transactional emails via SendGrid or AWS SES
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly apiKey: string;
  private readonly provider: 'sendgrid' | 'ses' | 'mock';

  constructor(private readonly configService: ConfigService) {
    this.fromEmail = this.configService.get('EMAIL_FROM', 'noreply@embr.io');
    this.fromName = this.configService.get('EMAIL_FROM_NAME', 'Embr');
    this.apiKey = this.configService.get('SENDGRID_API_KEY', '');
    
    // Determine provider based on config
    if (this.apiKey) {
      this.provider = 'sendgrid';
    } else if (this.configService.get('AWS_SES_REGION')) {
      this.provider = 'ses';
    } else {
      this.provider = 'mock';
      this.logger.warn('No email provider configured - emails will be logged only');
    }
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    const { to, subject, html, text } = options;
    const from = options.from || `${this.fromName} <${this.fromEmail}>`;

    if (this.provider === 'mock') {
      this.logger.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
      this.logger.debug(`[MOCK EMAIL] Content: ${text || html.substring(0, 100)}...`);
      return;
    }

    if (this.provider === 'sendgrid') {
      await this.sendViaSendGrid({ to, from, subject, html, text });
    } else if (this.provider === 'ses') {
      await this.sendViaSES({ to, from, subject, html, text });
    }
  }

  /**
   * Send via SendGrid
   */
  private async sendViaSendGrid(options: {
    to: string;
    from: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: options.to }] }],
          from: { email: this.fromEmail, name: this.fromName },
          subject: options.subject,
          content: [
            ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
            { type: 'text/html', value: options.html },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid error: ${response.status} - ${error}`);
      }

      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw error;
    }
  }

  /**
   * Send via AWS SES (placeholder - requires @aws-sdk/client-ses)
   */
  private async sendViaSES(options: {
    to: string;
    from: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    // AWS SES implementation would go here
    // For now, log a warning and fall back to mock
    this.logger.warn('AWS SES not fully implemented - logging email instead');
    this.logger.log(`[SES PLACEHOLDER] To: ${options.to} | Subject: ${options.subject}`);
  }

  // =====================================
  // TEMPLATE METHODS
  // =====================================

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/auth/reset-password?token=${resetToken}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Reset Your Embr Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Reset Your Password</h1>
            <p>We received a request to reset your Embr password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Embr. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Reset your Embr password by visiting: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
    const verifyUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/auth/verify-email?token=${verificationToken}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Verify Your Embr Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Welcome to Embr! 🔥</h1>
            <p>Thanks for signing up. Please verify your email address to get started:</p>
            <a href="${verifyUrl}" class="button">Verify Email</a>
            <p>This link will expire in 24 hours.</p>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Embr. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to Embr! Verify your email by visiting: ${verifyUrl}\n\nThis link expires in 24 hours.`,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, username: string): Promise<void> {
    const appUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    
    await this.sendEmail({
      to: email,
      subject: 'Welcome to Embr! 🔥',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Welcome, ${username}! 🎉</h1>
            <p>Your Embr account is ready. Here's what you can do:</p>
            <ul>
              <li>📝 Share posts and connect with creators</li>
              <li>💼 Browse gigs and find opportunities</li>
              <li>💰 Earn through tips and freelance work</li>
              <li>💬 Message collaborators directly</li>
            </ul>
            <a href="${appUrl}" class="button">Get Started</a>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Embr. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to Embr, ${username}! Your account is ready. Visit ${appUrl} to get started.`,
    });
  }

  /**
   * Send gig application notification
   */
  async sendGigApplicationNotification(
    email: string,
    gigTitle: string,
    applicantName: string,
    applicationId: string,
  ): Promise<void> {
    const appUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    const reviewUrl = `${appUrl}/gigs/applications/${applicationId}`;
    
    await this.sendEmail({
      to: email,
      subject: `New Application for "${gigTitle}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>New Gig Application 📬</h1>
            <p><strong>${applicantName}</strong> has applied to your gig:</p>
            <p style="font-size: 18px; color: #FF6B35;">"${gigTitle}"</p>
            <a href="${reviewUrl}" class="button">Review Application</a>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Embr. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `${applicantName} applied to your gig "${gigTitle}". Review at: ${reviewUrl}`,
    });
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(
    email: string,
    amount: number,
    description: string,
  ): Promise<void> {
    const formattedAmount = (amount / 100).toFixed(2);
    
    await this.sendEmail({
      to: email,
      subject: `Payment Received: $${formattedAmount}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .amount { font-size: 36px; color: #22C55E; font-weight: bold; margin: 20px 0; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Payment Received! 💰</h1>
            <p class="amount">$${formattedAmount}</p>
            <p>${description}</p>
            <p>The funds have been added to your Embr wallet.</p>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Embr. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Payment received: $${formattedAmount} - ${description}`,
    });
  }
}
