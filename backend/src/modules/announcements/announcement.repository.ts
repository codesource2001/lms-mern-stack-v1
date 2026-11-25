import { Types } from 'mongoose';

import {
  AnnouncementModel,
  toAnnouncementRecord,
  type AnnouncementDocument,
  type AnnouncementRecord,
} from './announcement.model.js';

type AnnouncementWithId = AnnouncementDocument & { _id: Types.ObjectId };

export class AnnouncementRepository {
  async create(input: {
    courseId: string;
    authorId: string;
    title: string;
    body: string;
    publishedAt: Date;
  }): Promise<AnnouncementRecord> {
    const document = await AnnouncementModel.create({
      course: new Types.ObjectId(input.courseId),
      author: new Types.ObjectId(input.authorId),
      title: input.title,
      body: input.body,
      publishedAt: input.publishedAt,
    });

    return toAnnouncementRecord(document);
  }

  findById(id: string): Promise<AnnouncementWithId | null> {
    return AnnouncementModel.findById(id).lean();
  }

  async listByCourse(courseId: string, limit: number, skip: number) {
    const documents = (await AnnouncementModel.find({ course: new Types.ObjectId(courseId) })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean()) as AnnouncementWithId[];

    return documents.map(toAnnouncementRecord);
  }

  async countByCourse(courseId: string): Promise<number> {
    return AnnouncementModel.countDocuments({ course: new Types.ObjectId(courseId) });
  }

  async deleteById(id: string): Promise<void> {
    await AnnouncementModel.deleteOne({ _id: id });
  }
}

export const announcementRepository = new AnnouncementRepository();
