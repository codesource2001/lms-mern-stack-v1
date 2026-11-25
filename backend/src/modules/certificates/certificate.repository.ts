import { Types } from 'mongoose';

import { CertificateModel, type CertificateDocument } from './certificate.model.js';

export class CertificateRepository {
  async findById(id: string) {
    return CertificateModel.findById(id).lean() as Promise<
      (CertificateDocument & { _id: Types.ObjectId }) | null
    >;
  }

  async findByCertificateId(certificateId: string) {
    return CertificateModel.findOne({ certificateId }).lean() as Promise<
      (CertificateDocument & { _id: Types.ObjectId }) | null
    >;
  }

  async findActive(userId: string, courseId: string) {
    return CertificateModel.findOne({
      user: new Types.ObjectId(userId),
      course: new Types.ObjectId(courseId),
      active: true,
    }).lean() as Promise<(CertificateDocument & { _id: Types.ObjectId }) | null>;
  }

  async listByUser(userId: string) {
    return CertificateModel.find({ user: new Types.ObjectId(userId) })
      .sort({ issuedAt: -1 })
      .lean() as Promise<Array<CertificateDocument & { _id: Types.ObjectId }>>;
  }

  /**
   * Returns null when the unique active-certificate index rejects a concurrent
   * issuance. The service then reads the winner instead of failing the request.
   */
  async create(input: {
    certificateId: string;
    userId: string;
    courseId: string;
    recipientName: string;
    courseTitle: string;
  }) {
    try {
      return await CertificateModel.create({
        certificateId: input.certificateId,
        user: new Types.ObjectId(input.userId),
        course: new Types.ObjectId(input.courseId),
        recipientName: input.recipientName,
        courseTitle: input.courseTitle,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return null;
      }

      throw error;
    }
  }

  async revoke(input: { certificateId: string; actorId: string; reason: string; now: Date }) {
    return CertificateModel.findOneAndUpdate(
      { certificateId: input.certificateId, active: true },
      {
        $set: {
          active: false,
          revokedAt: input.now,
          revokedReason: input.reason,
          revokedBy: new Types.ObjectId(input.actorId),
        },
      },
      { returnDocument: 'after' },
    ).lean() as Promise<(CertificateDocument & { _id: Types.ObjectId }) | null>;
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}
