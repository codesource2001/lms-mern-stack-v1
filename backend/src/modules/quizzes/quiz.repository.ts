import { Types } from 'mongoose';

import { QuestionBankModel, QuestionModel, QuizModel, QuizAttemptModel } from './quiz.model.js';

export class QuizRepository {
  async findBankById(id: string) {
    return QuestionBankModel.findById(id).lean();
  }

  async createBank(input: { title: string; courseId: string; createdById: string }) {
    return QuestionBankModel.create({
      title: input.title,
      course: new Types.ObjectId(input.courseId),
      createdBy: new Types.ObjectId(input.createdById),
    });
  }

  async createQuestion(input: {
    bankId: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    prompt: string;
    options: string[];
    correctAnswer: string;
    points: number;
  }) {
    return QuestionModel.create({
      bank: new Types.ObjectId(input.bankId),
      type: input.type,
      prompt: input.prompt,
      options: input.options,
      correctAnswer: input.correctAnswer,
      points: input.points,
    });
  }

  async findQuestionsByBank(bankId: string) {
    return QuestionModel.find({ bank: new Types.ObjectId(bankId) }).lean();
  }

  async findQuestionById(id: string) {
    return QuestionModel.findById(id).lean();
  }

  async createQuiz(input: {
    courseId: string;
    title: string;
    questionBankId: string;
    questionCount: number;
    durationMinutes: number;
    attemptsAllowed: number;
    shuffle: boolean;
    createdById: string;
  }) {
    return QuizModel.create({
      course: new Types.ObjectId(input.courseId),
      title: input.title,
      questionBank: new Types.ObjectId(input.questionBankId),
      questionCount: input.questionCount,
      durationMinutes: input.durationMinutes,
      attemptsAllowed: input.attemptsAllowed,
      shuffle: input.shuffle,
    });
  }

  async findQuizById(id: string) {
    return QuizModel.findById(id).lean();
  }

  async publishQuiz(id: string) {
    return QuizModel.findByIdAndUpdate(
      id,
      { $set: { status: 'published' } },
      { returnDocument: 'after' },
    ).lean();
  }

  async countAttempts(quizId: string, userId: string) {
    return QuizAttemptModel.countDocuments({
      quiz: new Types.ObjectId(quizId),
      user: new Types.ObjectId(userId),
    });
  }

  async createAttempt(input: {
    quizId: string;
    userId: string;
    questionIds: string[];
    expiresAt: Date;
    attemptNumber: number;
  }) {
    return QuizAttemptModel.create({
      quiz: new Types.ObjectId(input.quizId),
      user: new Types.ObjectId(input.userId),
      questionIds: input.questionIds.map((id) => new Types.ObjectId(id)),
      expiresAt: input.expiresAt,
      attemptNumber: input.attemptNumber,
    });
  }

  async findAttemptById(id: string) {
    return QuizAttemptModel.findById(id).lean();
  }

  async saveAnswer(attemptId: string, questionId: string, answer: string) {
    await QuizAttemptModel.updateOne(
      { _id: new Types.ObjectId(attemptId), status: 'in_progress' },
      { $set: { [`answers.${questionId}`]: answer } },
    );
  }

  async submitAttempt(id: string, now: Date) {
    return QuizAttemptModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), status: 'in_progress' },
      { $set: { submittedAt: now, status: 'submitted' } },
      { returnDocument: 'after' },
    ).lean();
  }

  async gradeAttempt(id: string, score: number, maxScore: number, status: 'graded' | 'submitted') {
    return QuizAttemptModel.findByIdAndUpdate(
      id,
      { $set: { score, maxScore, status } },
      { returnDocument: 'after' },
    ).lean();
  }
}
