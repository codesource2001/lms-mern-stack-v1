import { Types } from 'mongoose';

import { EnrollmentModel, type EnrollmentDocument } from './enrollment.model.js';

export class EnrollmentRepository {
  async findByUserAndCourse(userId: string, courseId: string) {
    return EnrollmentModel.findOne({
      user: new Types.ObjectId(userId),
      course: new Types.ObjectId(courseId),
    }).lean() as Promise<(EnrollmentDocument & { _id: Types.ObjectId }) | null>;
  }

  async listByUser(userId: string) {
    return EnrollmentModel.find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean() as Promise<Array<EnrollmentDocument & { _id: Types.ObjectId }>>;
  }

  async listByCourse(courseId: string) {
    return EnrollmentModel.find({ course: new Types.ObjectId(courseId) })
      .sort({ createdAt: -1 })
      .lean() as Promise<Array<EnrollmentDocument & { _id: Types.ObjectId }>>;
  }

  async listActiveUserIdsByCourse(courseId: string, limit: number): Promise<string[]> {
    const documents = (await EnrollmentModel.find({
      course: new Types.ObjectId(courseId),
      status: 'active',
    })
      .select('user')
      .limit(limit)
      .lean()) as Array<Pick<EnrollmentDocument, 'user'>>;

    return documents.map((document) => document.user.toString());
  }

  async analyticsSummary() {
    const [total, active, pendingPayment, expired, revoked] = await Promise.all([
      EnrollmentModel.countDocuments(),
      EnrollmentModel.countDocuments({ status: 'active' }),
      EnrollmentModel.countDocuments({ status: 'pending_payment' }),
      EnrollmentModel.countDocuments({ status: 'expired' }),
      EnrollmentModel.countDocuments({ status: 'revoked' }),
    ]);

    const activeUsers = await EnrollmentModel.distinct('user', { status: 'active' });

    const perCourse = await EnrollmentModel.aggregate<{
      _id: Types.ObjectId;
      count: number;
      grossCents: number;
    }>([
      { $match: { status: 'active' } },
      { $group: { _id: '$course', count: { $sum: 1 }, grossCents: { $sum: '$pricePaidCents' } } },
      { $sort: { count: -1 } },
      { $limit: 100 },
    ]);

    const trend = await EnrollmentModel.aggregate<{ _id: string; count: number }>([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 12 },
    ]);

    return {
      total,
      active,
      pendingPayment,
      expired,
      revoked,
      activeStudents: activeUsers.length,
      activeByCourse: perCourse.map((row) => ({
        courseId: row._id.toString(),
        count: row.count,
        grossCents: row.grossCents,
      })),
      trend: trend.reverse().map((row) => ({ month: row._id, count: row.count })),
    };
  }

  async create(input: {
    userId: string;
    courseId: string;
    pricePaidCents: number;
    expiresAt: Date | null;
    status?: 'pending_payment' | 'active';
  }) {
    return EnrollmentModel.create({
      user: new Types.ObjectId(input.userId),
      course: new Types.ObjectId(input.courseId),
      pricePaidCents: input.pricePaidCents,
      expiresAt: input.expiresAt,
      status: input.status ?? 'active',
    });
  }

  async findById(id: string) {
    return EnrollmentModel.findById(id).lean() as Promise<
      (EnrollmentDocument & { _id: Types.ObjectId }) | null
    >;
  }

  async activateById(id: string) {
    return EnrollmentModel.findByIdAndUpdate(
      id,
      { $set: { status: 'active' } },
      { returnDocument: 'after' },
    ).lean() as Promise<(EnrollmentDocument & { _id: Types.ObjectId }) | null>;
  }

  async revokeById(id: string, _now: Date) {
    return EnrollmentModel.findByIdAndUpdate(
      id,
      { $set: { status: 'revoked' } },
      { returnDocument: 'after' },
    ).lean() as Promise<(EnrollmentDocument & { _id: Types.ObjectId }) | null>;
  }

  async expireIfNeeded(
    enrollment: { id: string; expiresAt: Date | null; status: string },
    now: Date,
  ) {
    if (
      enrollment.status === 'active' &&
      enrollment.expiresAt !== null &&
      enrollment.expiresAt.getTime() <= now.getTime()
    ) {
      await EnrollmentModel.updateOne({ _id: enrollment.id }, { $set: { status: 'expired' } });
      return 'expired';
    }

    return enrollment.status;
  }
}
