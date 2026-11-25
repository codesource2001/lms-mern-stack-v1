import { Types } from 'mongoose';

import { AssignmentModel, type AssignmentDocument } from './assignment.model.js';
import { SubmissionModel, type SubmissionDocument } from './submission.model.js';

export class AssignmentRepository {
  async findById(id: string) {
    return AssignmentModel.findById(id).lean() as Promise<
      (AssignmentDocument & { _id: Types.ObjectId }) | null
    >;
  }

  async listByCourse(courseId: string) {
    return AssignmentModel.find({ course: new Types.ObjectId(courseId) })
      .sort({ createdAt: -1 })
      .lean() as Promise<Array<AssignmentDocument & { _id: Types.ObjectId }>>;
  }

  async create(input: {
    courseId: string;
    title: string;
    description: string;
    dueAt: Date | null;
    maxScore: number;
    createdById: string;
  }) {
    return AssignmentModel.create({
      course: new Types.ObjectId(input.courseId),
      title: input.title,
      description: input.description,
      dueAt: input.dueAt,
      maxScore: input.maxScore,
      createdBy: new Types.ObjectId(input.createdById),
    });
  }

  async listPublishedDueBetween(from: Date, to: Date, limit: number) {
    return AssignmentModel.find({
      status: 'published',
      dueAt: { $gte: from, $lte: to },
    })
      .sort({ dueAt: 1 })
      .limit(limit)
      .lean() as Promise<Array<AssignmentDocument & { _id: Types.ObjectId }>>;
  }

  async update(id: string, input: Record<string, unknown>) {
    return AssignmentModel.findByIdAndUpdate(
      id,
      { $set: input },
      { returnDocument: 'after', runValidators: true },
    ).lean() as Promise<(AssignmentDocument & { _id: Types.ObjectId }) | null>;
  }

  async delete(id: string) {
    await AssignmentModel.deleteOne({ _id: id });
  }
}

export class SubmissionRepository {
  async countUngradedByCourse(courseId: string): Promise<number> {
    const rows = await SubmissionModel.aggregate<{ count: number }>([
      {
        $lookup: {
          from: 'assignments',
          localField: 'assignment',
          foreignField: '_id',
          as: 'assignmentDoc',
        },
      },
      { $unwind: '$assignmentDoc' },
      { $match: { 'assignmentDoc.course': new Types.ObjectId(courseId), status: 'submitted' } },
      { $count: 'count' },
    ]);

    return rows[0]?.count ?? 0;
  }

  async gradeStatsForUser(userId: string) {
    const rows = await SubmissionModel.aggregate<{
      graded: number;
      score: number;
      maxScore: number;
    }>([
      { $match: { user: new Types.ObjectId(userId), grade: { $ne: null } } },
      {
        $lookup: {
          from: 'assignments',
          localField: 'assignment',
          foreignField: '_id',
          as: 'assignmentDoc',
        },
      },
      { $unwind: '$assignmentDoc' },
      {
        $group: {
          _id: null,
          graded: { $sum: 1 },
          score: { $sum: '$grade' },
          maxScore: { $sum: '$assignmentDoc.maxScore' },
        },
      },
    ]);

    return rows[0] ?? { graded: 0, score: 0, maxScore: 0 };
  }

  async findById(id: string) {
    return SubmissionModel.findById(id).lean() as Promise<
      (SubmissionDocument & { _id: Types.ObjectId }) | null
    >;
  }

  async findLatest(assignmentId: string, userId: string) {
    return SubmissionModel.findOne({
      assignment: new Types.ObjectId(assignmentId),
      user: new Types.ObjectId(userId),
    })
      .sort({ version: -1 })
      .lean() as Promise<(SubmissionDocument & { _id: Types.ObjectId }) | null>;
  }

  async listByAssignment(assignmentId: string) {
    return SubmissionModel.find({ assignment: new Types.ObjectId(assignmentId) })
      .sort({ submittedAt: -1 })
      .lean() as Promise<Array<SubmissionDocument & { _id: Types.ObjectId }>>;
  }

  async listByUser(userId: string) {
    return SubmissionModel.find({ user: new Types.ObjectId(userId) })
      .sort({ submittedAt: -1 })
      .lean() as Promise<Array<SubmissionDocument & { _id: Types.ObjectId }>>;
  }

  async create(input: {
    assignmentId: string;
    userId: string;
    version: number;
    fileKey: string | null;
    content: string | null;
    isLate: boolean;
  }) {
    return SubmissionModel.create({
      assignment: new Types.ObjectId(input.assignmentId),
      user: new Types.ObjectId(input.userId),
      version: input.version,
      fileKey: input.fileKey,
      content: input.content,
      isLate: input.isLate,
    });
  }

  async grade(id: string, input: { grade: number; feedback: string | null; gradedById: string }) {
    return SubmissionModel.findByIdAndUpdate(
      id,
      {
        $set: {
          grade: input.grade,
          feedback: input.feedback,
          gradedBy: new Types.ObjectId(input.gradedById),
          gradedAt: new Date(),
          status: 'graded',
        },
      },
      { returnDocument: 'after', runValidators: true },
    ).lean() as Promise<(SubmissionDocument & { _id: Types.ObjectId }) | null>;
  }
}
