import { AppError } from '../../shared/errors/app-error.js';
import { CourseRepository } from '../courses/course.repository.js';
import { QuizRepository } from './quiz.repository.js';

export class QuizService {
  constructor(
    private readonly quizzes: QuizRepository,
    private readonly courses: CourseRepository,
  ) {}

  async createBank(input: { title: string; courseId: string; actorId: string; isAdmin: boolean }) {
    const course = await this.courses.findById(input.courseId);

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (!input.isAdmin && course.instructor.toString() !== input.actorId) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    return this.quizzes.createBank({
      title: input.title,
      courseId: input.courseId,
      createdById: input.actorId,
    });
  }

  async addQuestion(input: {
    bankId: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    prompt: string;
    options: string[];
    correctAnswer: string;
    points: number;
    actorId: string;
    isAdmin: boolean;
  }) {
    const bank = await this.quizzes.findBankById(input.bankId);

    if (bank === null) {
      throw new AppError('Question bank not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const course = await this.courses.findById(bank.course.toString());

    if (course === null || (!input.isAdmin && course.instructor.toString() !== input.actorId)) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    return this.quizzes.createQuestion(input);
  }

  async createQuiz(input: {
    courseId: string;
    title: string;
    questionBankId: string;
    questionCount: number;
    durationMinutes: number;
    attemptsAllowed: number;
    shuffle: boolean;
    actorId: string;
    isAdmin: boolean;
  }) {
    const course = await this.courses.findById(input.courseId);

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (!input.isAdmin && course.instructor.toString() !== input.actorId) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    const bank = await this.quizzes.findBankById(input.questionBankId);

    if (bank === null) {
      throw new AppError('Question bank not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return this.quizzes.createQuiz({
      courseId: input.courseId,
      title: input.title,
      questionBankId: input.questionBankId,
      questionCount: input.questionCount,
      durationMinutes: input.durationMinutes,
      attemptsAllowed: input.attemptsAllowed,
      shuffle: input.shuffle,
      createdById: input.actorId,
    });
  }

  async publishQuiz(id: string, actorId: string, isAdmin: boolean) {
    const quiz = await this.quizzes.findQuizById(id);

    if (quiz === null) {
      throw new AppError('Quiz not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const course = await this.courses.findById(quiz.course.toString());

    if (course === null || (!isAdmin && course.instructor.toString() !== actorId)) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    return this.quizzes.publishQuiz(id);
  }

  async countPendingManualByCourse(courseId: string): Promise<number> {
    return this.quizzes.countPendingManualByCourse(courseId);
  }

  async getGradeStatsForUser(userId: string) {
    return this.quizzes.gradeStatsForUser(userId);
  }

  async startAttempt(quizId: string, userId: string) {
    const quiz = await this.quizzes.findQuizById(quizId);

    if (quiz === null || quiz.status !== 'published') {
      throw new AppError('Quiz not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const attempts = await this.quizzes.countAttempts(quizId, userId);

    if (attempts >= quiz.attemptsAllowed) {
      throw new AppError('No attempts remaining', {
        statusCode: 409,
        code: 'ATTEMPT_LIMIT_REACHED',
      });
    }

    const questions = await this.quizzes.findQuestionsByBank(quiz.questionBank.toString());

    if (questions.length < quiz.questionCount) {
      throw new AppError('Quiz is not configured correctly', { statusCode: 409, code: 'CONFLICT' });
    }

    const shuffled = quiz.shuffle ? [...questions].sort(() => Math.random() - 0.5) : questions;
    const selected = shuffled
      .slice(0, quiz.questionCount)
      .map((question) => question._id.toString());

    const attemptNumber = attempts + 1;
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + quiz.durationMinutes * 60 * 1000);

    return this.quizzes.createAttempt({
      quizId,
      userId,
      questionIds: selected,
      expiresAt,
      attemptNumber,
    });
  }

  async getAttempt(attemptId: string, userId: string, isAdmin: boolean) {
    const attempt = await this.quizzes.findAttemptById(attemptId);

    if (attempt === null || (!isAdmin && attempt.user.toString() !== userId)) {
      throw new AppError('Attempt not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const quiz = await this.quizzes.findQuizById(attempt.quiz.toString());

    if (quiz === null) {
      throw new AppError('Quiz not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const questions = await this.quizzes.findQuestionsByBank(quiz.questionBank.toString());
    const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));

    const selectedQuestions = attempt.questionIds
      .map((id) => questionMap.get(id.toString()))
      .filter((question): question is NonNullable<typeof question> => question !== undefined)
      .map((question) => ({
        id: question._id.toString(),
        type: question.type,
        prompt: question.prompt,
        options: question.options,
        points: question.points,
      }));

    return {
      attempt: {
        id: attempt._id.toString(),
        quizId: attempt.quiz.toString(),
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        submittedAt: attempt.submittedAt,
        status: attempt.status,
        score: attempt.score,
        maxScore: attempt.maxScore,
      },
      questions: selectedQuestions,
      answers: Object.fromEntries(attempt.answers ?? []),
    };
  }

  async saveAnswer(attemptId: string, userId: string, questionId: string, answer: string) {
    const attempt = await this.quizzes.findAttemptById(attemptId);

    if (
      attempt === null ||
      attempt.user.toString() !== userId ||
      attempt.status !== 'in_progress'
    ) {
      throw new AppError('Attempt not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (new Date() > new Date(attempt.expiresAt)) {
      throw new AppError('Attempt has expired', { statusCode: 409, code: 'ATTEMPT_EXPIRED' });
    }

    await this.quizzes.saveAnswer(attemptId, questionId, answer);

    return { saved: true };
  }

  async submitAttempt(attemptId: string, userId: string) {
    const attempt = await this.quizzes.findAttemptById(attemptId);

    if (
      attempt === null ||
      attempt.user.toString() !== userId ||
      attempt.status !== 'in_progress'
    ) {
      throw new AppError('Attempt not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const now = new Date();

    if (now > new Date(attempt.expiresAt)) {
      throw new AppError('Attempt has expired', { statusCode: 409, code: 'ATTEMPT_EXPIRED' });
    }

    const updated = await this.quizzes.submitAttempt(attemptId, now);

    if (updated === null) {
      throw new AppError('Attempt not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const quiz = await this.quizzes.findQuizById(updated.quiz.toString());
    const questions = await this.quizzes.findQuestionsByBank(quiz!.questionBank.toString());
    const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));
    const answers = Object.fromEntries(updated.answers ?? []);

    let score = 0;
    let maxScore = 0;
    let hasShortAnswer = false;

    for (const questionId of updated.questionIds.map((id) => id.toString())) {
      const question = questionMap.get(questionId);

      if (question === undefined) {
        continue;
      }

      maxScore += question.points;

      if (question.type === 'short_answer') {
        hasShortAnswer = true;
        continue;
      }

      const submitted = String(answers[questionId] ?? '')
        .trim()
        .toLowerCase();
      const correct = String(question.correctAnswer).trim().toLowerCase();

      if (submitted !== '' && submitted === correct) {
        score += question.points;
      }
    }

    const status = hasShortAnswer ? 'submitted' : 'graded';

    await this.quizzes.gradeAttempt(updated._id.toString(), score, maxScore, status);

    return {
      attemptId: updated._id.toString(),
      status,
      score: hasShortAnswer ? null : score,
      maxScore,
    };
  }

  async gradeAttempt(attemptId: string, actorId: string, isAdmin: boolean, score: number) {
    const attempt = await this.quizzes.findAttemptById(attemptId);

    if (attempt === null) {
      throw new AppError('Attempt not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const quiz = await this.quizzes.findQuizById(attempt.quiz.toString());

    if (quiz === null) {
      throw new AppError('Quiz not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const course = await this.courses.findById(quiz.course.toString());

    if (course === null || (!isAdmin && course.instructor.toString() !== actorId)) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    return this.quizzes.gradeAttempt(attemptId, score, attempt.maxScore ?? 0, 'graded');
  }
}

export const quizRepository = new QuizRepository();
export const courseRepositoryForQuizzes = new CourseRepository();
export const quizService = new QuizService(quizRepository, courseRepositoryForQuizzes);
