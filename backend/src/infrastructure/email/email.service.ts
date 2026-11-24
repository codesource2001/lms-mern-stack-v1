import type { Transporter } from 'nodemailer';

import nodemailer from 'nodemailer';

import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createDevTransport(): EmailService {
  return {
    send(message) {
      logger.info(
        {
          to: message.to,
          subject: message.subject,
          text: message.text,
        },
        'Development email preview',
      );
      return Promise.resolve();
    },
  };
}

function createSmtpTransport(): EmailService {
  const auth =
    env.SMTP_USER === undefined || env.SMTP_PASSWORD === undefined
      ? undefined
      : {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        };

  const transporter: Transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth,
  });

  return {
    async send(message) {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    },
  };
}

export function createEmailService(): EmailService {
  if (env.NODE_ENV === 'production' && env.SMTP_HOST === undefined) {
    throw new Error('SMTP_HOST is required in production');
  }

  return env.SMTP_HOST === undefined ? createDevTransport() : createSmtpTransport();
}

export const emailService = createEmailService();

export function verificationEmailTemplate(input: {
  name: string;
  verificationUrl: string;
}): EmailMessage {
  const safeName = escapeHtml(input.name);
  const safeUrl = escapeHtml(input.verificationUrl);

  return {
    to: '',
    subject: 'Verify your Atrium LMS email address',
    text: `Hello ${input.name},\n\nVerify your email address by visiting:\n${input.verificationUrl}\n\nThis link expires soon. If you did not create an account, you can ignore this email.\n`,
    html: `<p>Hello ${safeName},</p><p>Verify your email address by visiting <a href="${safeUrl}">this link</a>.</p><p>If you did not create an account, you can ignore this email.</p>`,
  };
}

export function passwordResetEmailTemplate(input: {
  name: string;
  resetUrl: string;
}): EmailMessage {
  const safeName = escapeHtml(input.name);
  const safeUrl = escapeHtml(input.resetUrl);

  return {
    to: '',
    subject: 'Reset your Atrium LMS password',
    text: `Hello ${input.name},\n\nReset your password by visiting:\n${input.resetUrl}\n\nThis link expires soon. If you did not request a reset, you can ignore this email.\n`,
    html: `<p>Hello ${safeName},</p><p>Reset your password by visiting <a href="${safeUrl}">this link</a>.</p><p>If you did not request a reset, you can ignore this email.</p>`,
  };
}
