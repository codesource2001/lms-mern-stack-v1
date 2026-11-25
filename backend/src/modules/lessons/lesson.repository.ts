import { Types } from 'mongoose';

import { LessonModel, type LessonDocument } from './lesson.model.js';
import { LessonCompletionModel } from './lesson-completion.model.js';

export class LessonRepository {
  async listByCourse(courseId: string) {
    return LessonModel.find({ course: new Types.ObjectId(courseId) })
      .sort({ order: 1 })
      .lean() as Promise<Array<LessonDocument & { _id: Types.ObjectId }>>;
  }

  async findById(id: string) {
    return LessonModel.findById(id).lean() as Promise<
      (LessonDocument & { _id: Types.ObjectId }) | null
    >;
  }

  async create(input: {
    courseId: string;
    sectionId: string | null;
    title: string;
    type: 'video' | 'text' | 'pdf' | 'resource';
    content: string | null;
    assetKey: string | null;
    durationSeconds: number | null;
    order: number;
    isPreview: boolean;
  }) {
    return LessonModel.create({
      course: new Types.ObjectId(input.courseId),
      section: input.sectionId === null ? null : new Types.ObjectId(input.sectionId),
      title: input.title,
      type: input.type,
      content: input.content,
      assetKey: input.assetKey,
      durationSeconds: input.durationSeconds,
      order: input.order,
      isPreview: input.isPreview,
    });
  }

  async update(id: string, input: Record<string, unknown>) {
    return LessonModel.findByIdAndUpdate(
      id,
      { $set: input },
      { returnDocument: 'after', runValidators: true },
    ).lean() as Promise<(LessonDocument & { _id: Types.ObjectId }) | null>;
  }

  async delete(id: string) {
    await LessonModel.deleteOne({ _id: id });
  }

  async reorder(courseId: string, orderedIds: string[]) {
    const operations = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(id), course: new Types.ObjectId(courseId) },
        update: { $set: { order: index } },
      },
    }));

    if (operations.length > 0) {
      await LessonModel.bulkWrite(operations);
    }
  }

  async lessonCountsByCourse(courseIds: readonly string[]) {
    if (courseIds.length === 0) {
      return [];
    }

    return LessonModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { course: { $in: courseIds.map((id) => new Types.ObjectId(id)) } } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]);
  }

  async completionCountsByCourse(courseIds: readonly string[]) {
    if (courseIds.length === 0) {
      return [];
    }

    return LessonCompletionModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $lookup: {
          from: 'lessons',
          localField: 'lesson',
          foreignField: '_id',
          as: 'lessonDoc',
        },
      },
      { $unwind: '$lessonDoc' },
      { $match: { 'lessonDoc.course': { $in: courseIds.map((id) => new Types.ObjectId(id)) } } },
      { $group: { _id: '$lessonDoc.course', count: { $sum: 1 } } },
    ]);
  }

  async userCompletionCountByCourse(userId: string, courseId: string): Promise<number> {
    const result = await LessonCompletionModel.aggregate<{ count: number }>([
      { $match: { user: new Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'lessons',
          localField: 'lesson',
          foreignField: '_id',
          as: 'lessonDoc',
        },
      },
      { $unwind: '$lessonDoc' },
      { $match: { 'lessonDoc.course': new Types.ObjectId(courseId) } },
      { $count: 'count' },
    ]);

    return result[0]?.count ?? 0;
  }

  async markComplete(userId: string, lessonId: string) {
    return LessonCompletionModel.findOneAndUpdate(
      { user: new Types.ObjectId(userId), lesson: new Types.ObjectId(lessonId) },
      { $set: { completedAt: new Date() } },
      { upsert: true, returnDocument: 'after' },
    ).lean();
  }

  async isComplete(userId: string, lessonId: string) {
    const completion = await LessonCompletionModel.findOne({
      user: new Types.ObjectId(userId),
      lesson: new Types.ObjectId(lessonId),
    }).lean();
    return completion !== null;
  }
}
