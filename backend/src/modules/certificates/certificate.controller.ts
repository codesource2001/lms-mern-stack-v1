import type { RequestHandler } from 'express';
import PDFDocument from 'pdfkit';

import { sendSuccess } from '../../shared/http/response.js';
import { getValidated } from '../../middlewares/validate.js';
import { hasAdminRole } from '../auth/auth.middleware.js';
import { certificateService } from './certificate.service.js';

export function createCertificateController() {
  const issue: RequestHandler = async (req, res) => {
    const input = getValidated<{ courseId: string }>(req, 'body');
    const { certificate, created } = await certificateService.issue({
      userId: req.auth!.userId,
      courseId: input.courseId,
      actorUserId: req.auth!.userId,
    });

    sendSuccess(res, {
      statusCode: created ? 201 : 200,
      message: created ? 'Certificate issued' : 'Certificate already issued',
      data: { certificate, created },
    });
  };

  const issueForUser: RequestHandler = async (req, res) => {
    const input = getValidated<{ userId: string; courseId: string }>(req, 'body');
    const { certificate, created } = await certificateService.issue({
      userId: input.userId,
      courseId: input.courseId,
      actorUserId: req.auth!.userId,
    });

    sendSuccess(res, {
      statusCode: created ? 201 : 200,
      message: created ? 'Certificate issued' : 'Certificate already issued',
      data: { certificate, created },
    });
  };

  const verify: RequestHandler = async (req, res) => {
    const result = await certificateService.verify(req.params.certificateId as string);
    sendSuccess(res, { message: 'Certificate verification', data: result });
  };

  const mine: RequestHandler = async (req, res) => {
    const items = await certificateService.listMine(req.auth!.userId);
    sendSuccess(res, { message: 'Certificates', data: { items } });
  };

  const revoke: RequestHandler = async (req, res) => {
    const input = getValidated<{ reason: string }>(req, 'body');
    const certificate = await certificateService.revoke({
      certificateId: req.params.certificateId as string,
      actorId: req.auth!.userId,
      reason: input.reason,
    });
    sendSuccess(res, { message: 'Certificate revoked', data: { certificate } });
  };

  const pdf: RequestHandler = async (req, res) => {
    const certificate = await certificateService.getForDownload({
      certificateId: req.params.certificateId as string,
      actorId: req.auth!.userId,
      isAdmin: hasAdminRole(req.auth!),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificateId}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store');

    const document = new PDFDocument({ size: 'A4', margin: 72 });
    document.pipe(res);

    document.fontSize(26).text('Certificate of Completion', { align: 'center' });
    document.moveDown(1.5);
    document.fontSize(16).text(certificate.recipientName, { align: 'center' });
    document.moveDown();
    document.fontSize(14).text(`has completed ${certificate.courseTitle}`, { align: 'center' });
    document.moveDown(1.5);
    document.fontSize(11).text(`Certificate ID: ${certificate.certificateId}`, { align: 'center' });
    document.text(`Issued: ${certificate.issuedAt.toISOString().slice(0, 10)}`, {
      align: 'center',
    });
    document.moveDown(2);
    document
      .fontSize(9)
      .fillColor('#57635c')
      .text(
        'Verify this certificate with its certificate ID through the Atrium LMS certificate verification service.',
        { align: 'center' },
      );

    document.end();
  };

  return { issue, issueForUser, verify, mine, revoke, pdf };
}

export const certificateController = createCertificateController();
