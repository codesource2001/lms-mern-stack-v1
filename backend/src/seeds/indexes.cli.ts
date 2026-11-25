import { logger } from '../config/logger.js';
import { connectMongo, disconnectMongo } from '../infrastructure/mongo/connection.js';

import { AnnouncementModel } from '../modules/announcements/announcement.model.js';
import { AssignmentModel } from '../modules/assignments/assignment.model.js';
import { SubmissionModel } from '../modules/assignments/submission.model.js';
import { AuditLogModel } from '../modules/audit/audit-log.model.js';
import { RefreshTokenModel } from '../modules/auth/refresh-token.model.js';
import { SessionModel } from '../modules/auth/session.model.js';
import { CertificateModel } from '../modules/certificates/certificate.model.js';
import { CategoryModel } from '../modules/courses/category.model.js';
import { CourseModel } from '../modules/courses/course.model.js';
import { SectionModel } from '../modules/courses/section.model.js';
import { EnrollmentModel } from '../modules/enrollments/enrollment.model.js';
import { LessonCompletionModel } from '../modules/lessons/lesson-completion.model.js';
import { LessonModel } from '../modules/lessons/lesson.model.js';
import {
  NotificationModel,
  NotificationPreferenceModel,
} from '../modules/notifications/notification.model.js';
import { PermissionModel } from '../modules/rbac/permission.model.js';
import { RoleModel } from '../modules/rbac/role.model.js';
import {
  QuestionBankModel,
  QuestionModel,
  QuizAttemptModel,
  QuizModel,
} from '../modules/quizzes/quiz.model.js';
import { UserModel } from '../modules/users/user.model.js';

const models = [
  UserModel,
  RoleModel,
  PermissionModel,
  SessionModel,
  RefreshTokenModel,
  AuditLogModel,
  CategoryModel,
  CourseModel,
  SectionModel,
  LessonModel,
  LessonCompletionModel,
  EnrollmentModel,
  AssignmentModel,
  SubmissionModel,
  QuestionBankModel,
  QuestionModel,
  QuizModel,
  QuizAttemptModel,
  CertificateModel,
  NotificationModel,
  NotificationPreferenceModel,
  AnnouncementModel,
];

async function main(): Promise<void> {
  await connectMongo();

  try {
    for (const model of models) {
      await model.createIndexes();
      logger.info({ collection: model.collection.name }, 'Indexes verified');
    }

    logger.info({ collections: models.length }, 'Index verification complete');
  } finally {
    await disconnectMongo();
  }
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Index verification failed');
  process.exitCode = 1;
});
