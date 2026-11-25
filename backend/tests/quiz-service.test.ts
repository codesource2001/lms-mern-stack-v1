/* eslint-disable */
import { describe, expect, it } from 'vitest';

import { QuizService } from '../src/modules/quizzes/quiz.service.js';

const COURSE_ID = 'course-1';
const OTHER_COURSE_ID = 'course-2';
const INSTRUCTOR_ID = 'instructor-1';
const OTHER_INSTRUCTOR_ID = 'instructor-2';
const STUDENT_ID = 'student-1';
const OTHER_STUDENT_ID = 'student-2';
const ADMIN_ID = 'admin-1';

function makeFixture() {
  const banks = new Map<string, any>();
  const questions = new Map<string, any>();
  const quizzes = new Map<string, any>();
  const attempts = new Map<string, any>();
  const gradedCalls: Array<{ id: string; score: number; maxScore: number; status: string }> = [];
  let nextId = 1;

  const quizRepository = {
    async findBankById(id: string) {
      return banks.get(id) ?? null;
    },
    async createBank(input: any) {
      const id = `bank-${nextId++}`;
      const document = {
        _id: { toString: () => id },
        title: input.title,
        course: { toString: () => input.courseId },
        createdBy: { toString: () => input.createdById },
      };
      banks.set(id, document);
      return document;
    },
    async createQuestion(input: any) {
      const id = `question-${nextId++}`;
      const document = {
        _id: { toString: () => id },
        bank: { toString: () => input.bankId },
        type: input.type,
        prompt: input.prompt,
        options: input.options,
        correctAnswer: input.correctAnswer,
        points: input.points,
      };
      questions.set(id, document);
      return document;
    },
    async findQuestionsByBank(bankId: string) {
      return [...questions.values()].filter((question) => question.bank.toString() === bankId);
    },
    async createQuiz(input: any) {
      const id = `quiz-${nextId++}`;
      const document = {
        _id: { toString: () => id },
        course: { toString: () => input.courseId },
        title: input.title,
        questionBank: { toString: () => input.questionBankId },
        questionCount: input.questionCount,
        durationMinutes: input.durationMinutes,
        attemptsAllowed: input.attemptsAllowed,
        shuffle: input.shuffle,
        status: 'draft',
        createdBy: { toString: () => input.createdById },
      };
      quizzes.set(id, document);
      return document;
    },
    async findQuizById(id: string) {
      return quizzes.get(id) ?? null;
    },
    async publishQuiz(id: string) {
      const quiz = quizzes.get(id);

      if (quiz === undefined) {
        return null;
      }

      quiz.status = 'published';
      return quiz;
    },
    async countAttempts(quizId: string, userId: string) {
      return [...attempts.values()].filter(
        (attempt) => attempt.quiz.toString() === quizId && attempt.user.toString() === userId,
      ).length;
    },
    async createAttempt(input: any) {
      const id = `attempt-${nextId++}`;
      const document = {
        _id: { toString: () => id },
        quiz: { toString: () => input.quizId },
        user: { toString: () => input.userId },
        questionIds: input.questionIds.map((questionId: string) => ({
          toString: () => questionId,
        })),
        answers: [],
        startedAt: new Date(),
        expiresAt: input.expiresAt,
        submittedAt: null,
        score: null,
        maxScore: null,
        status: 'in_progress',
        attemptNumber: input.attemptNumber,
      };
      attempts.set(id, document);
      return document;
    },
    async findAttemptById(id: string) {
      return attempts.get(id) ?? null;
    },
    async saveAnswer(attemptId: string, questionId: string, answer: string) {
      const attempt = attempts.get(attemptId);

      if (attempt === undefined) {
        return;
      }

      const existing = attempt.answers.find(([key]: [string, string]) => key === questionId);

      if (existing === undefined) {
        attempt.answers.push([questionId, answer]);
      } else {
        existing[1] = answer;
      }
    },
    async submitAttempt(id: string, now: Date) {
      const attempt = attempts.get(id);

      if (attempt === undefined || attempt.status !== 'in_progress') {
        return null;
      }

      attempt.status = 'submitted';
      attempt.submittedAt = now;
      return attempt;
    },
    async gradeAttempt(id: string, score: number, maxScore: number, status: string) {
      const attempt = attempts.get(id);

      if (attempt === undefined) {
        return null;
      }

      gradedCalls.push({ id, score, maxScore, status });
      attempt.score = score;
      attempt.maxScore = maxScore;
      attempt.status = status;
      return attempt;
    },
  };

  const courses = new Map<string, any>([
    [
      COURSE_ID,
      {
        _id: { toString: () => COURSE_ID },
        instructor: { toString: () => INSTRUCTOR_ID },
        status: 'published',
      },
    ],
    [
      OTHER_COURSE_ID,
      {
        _id: { toString: () => OTHER_COURSE_ID },
        instructor: { toString: () => OTHER_INSTRUCTOR_ID },
        status: 'published',
      },
    ],
  ]);

  const courseRepository = {
    async findById(id: string) {
      return courses.get(id) ?? null;
    },
  };

  const service = new QuizService(
    quizRepository as never,
    courseRepository as never,
    async () => true,
  );

  async function seedBank(courseId = COURSE_ID) {
    return quizRepository.createBank({
      title: 'Bank',
      courseId,
      createdById: INSTRUCTOR_ID,
    });
  }

  async function seedQuestion(bankId: string, input: any) {
    return quizRepository.createQuestion({
      bankId,
      type: 'multiple_choice',
      options: [],
      points: 1,
      ...input,
    });
  }

  async function seedQuiz(input: any = {}) {
    const bank = input.bank ?? (await seedBank());
    const quiz = await quizRepository.createQuiz({
      courseId: input.courseId ?? COURSE_ID,
      title: input.title ?? 'Quiz',
      questionBankId: bank._id.toString(),
      questionCount: input.questionCount ?? 1,
      durationMinutes: input.durationMinutes ?? 30,
      attemptsAllowed: input.attemptsAllowed ?? 1,
      shuffle: false,
      createdById: INSTRUCTOR_ID,
    });
    quiz.status = input.status ?? 'published';
    return quiz;
  }

  return {
    service,
    quizRepository,
    courseRepository,
    banks,
    questions,
    quizzes,
    attempts,
    gradedCalls,
    seedBank,
    seedQuestion,
    seedQuiz,
  };
}

describe('QuizService', () => {
  it('rejects question bank creation by an instructor who does not own the course', async () => {
    const fixture = makeFixture();

    await expect(
      fixture.service.createBank({
        title: 'Unauthorized bank',
        courseId: COURSE_ID,
        actorId: OTHER_INSTRUCTOR_ID,
        isAdmin: false,
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('allows an administrator to create a question bank on another instructor course', async () => {
    const fixture = makeFixture();

    const bank = await fixture.service.createBank({
      title: 'Admin bank',
      courseId: COURSE_ID,
      actorId: ADMIN_ID,
      isAdmin: true,
    });

    expect(bank.title).toBe('Admin bank');
    expect(fixture.banks.size).toBe(1);
  });

  it('rejects quiz creation when the question bank does not exist', async () => {
    const fixture = makeFixture();

    await expect(
      fixture.service.createQuiz({
        courseId: COURSE_ID,
        title: 'Quiz',
        questionBankId: 'missing-bank',
        questionCount: 1,
        durationMinutes: 30,
        attemptsAllowed: 1,
        shuffle: false,
        actorId: INSTRUCTOR_ID,
        isAdmin: false,
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('rejects publishing a quiz by an instructor who does not own the course', async () => {
    const fixture = makeFixture();
    const quiz = await fixture.seedQuiz({ status: 'draft' });

    await expect(
      fixture.service.publishQuiz(quiz._id.toString(), OTHER_INSTRUCTOR_ID, false),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });

    const published = await fixture.service.publishQuiz(quiz._id.toString(), ADMIN_ID, true);
    expect(published?.status).toBe('published');
  });

  it('refuses to start a quiz that is not published', async () => {
    const fixture = makeFixture();
    const quiz = await fixture.seedQuiz({ status: 'draft' });

    await expect(
      fixture.service.startAttempt(quiz._id.toString(), STUDENT_ID),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('rejects an attempt when the learner has no access to the course', async () => {
    const fixture = makeFixture();
    const quiz = await fixture.seedQuiz();
    const restricted = new QuizService(
      fixture.quizRepository as never,
      fixture.courseRepository as never,
      async () => false,
    );

    await expect(restricted.startAttempt(quiz._id.toString(), STUDENT_ID)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('enforces the attempt limit', async () => {
    const fixture = makeFixture();
    const bank = await fixture.seedBank();
    await fixture.seedQuestion(bank._id.toString(), { prompt: 'Question' });
    const quiz = await fixture.seedQuiz({ bank, attemptsAllowed: 1 });
    await fixture.service.startAttempt(quiz._id.toString(), STUDENT_ID);

    await expect(
      fixture.service.startAttempt(quiz._id.toString(), STUDENT_ID),
    ).rejects.toMatchObject({ statusCode: 409, code: 'ATTEMPT_LIMIT_REACHED' });
  });

  it('rejects an answer saved after the attempt expires', async () => {
    const fixture = makeFixture();
    const bank = await fixture.seedBank();
    await fixture.seedQuestion(bank._id.toString(), { prompt: 'Question' });
    const quiz = await fixture.seedQuiz({ bank });
    const attempt = await fixture.service.startAttempt(quiz._id.toString(), STUDENT_ID);
    attempt.expiresAt = new Date('2020-01-01T00:00:00.000Z');

    await expect(
      fixture.service.saveAnswer(attempt._id.toString(), STUDENT_ID, 'question-1', 'answer'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'ATTEMPT_EXPIRED' });
  });

  it('rejects submission after the attempt expires', async () => {
    const fixture = makeFixture();
    const bank = await fixture.seedBank();
    await fixture.seedQuestion(bank._id.toString(), { prompt: 'Question' });
    const quiz = await fixture.seedQuiz({ bank });
    const attempt = await fixture.service.startAttempt(quiz._id.toString(), STUDENT_ID);
    attempt.expiresAt = new Date('2020-01-01T00:00:00.000Z');

    await expect(
      fixture.service.submitAttempt(attempt._id.toString(), STUDENT_ID),
    ).rejects.toMatchObject({ statusCode: 409, code: 'ATTEMPT_EXPIRED' });
  });

  it('grades objective answers with trimmed, case-insensitive comparison', async () => {
    const fixture = makeFixture();
    const bank = await fixture.seedBank();
    const capital = await fixture.seedQuestion(bank._id.toString(), {
      prompt: 'Capital of France?',
      correctAnswer: 'Paris',
      points: 2,
    });
    const booleanQuestion = await fixture.seedQuestion(bank._id.toString(), {
      prompt: 'The sky is blue.',
      type: 'true_false',
      correctAnswer: 'True',
      points: 1,
    });
    const quiz = await fixture.seedQuiz({ bank, questionCount: 2 });
    const attempt = await fixture.service.startAttempt(quiz._id.toString(), STUDENT_ID);

    await fixture.service.saveAnswer(
      attempt._id.toString(),
      STUDENT_ID,
      capital._id.toString(),
      '  paris ',
    );
    await fixture.service.saveAnswer(
      attempt._id.toString(),
      STUDENT_ID,
      booleanQuestion._id.toString(),
      'true',
    );

    const result = await fixture.service.submitAttempt(attempt._id.toString(), STUDENT_ID);

    expect(result).toEqual({
      attemptId: attempt._id.toString(),
      status: 'graded',
      score: 3,
      maxScore: 3,
    });
    expect(fixture.gradedCalls).toEqual([
      { id: attempt._id.toString(), score: 3, maxScore: 3, status: 'graded' },
    ]);
  });

  it('leaves short answers for manual grading and withholds the score', async () => {
    const fixture = makeFixture();
    const bank = await fixture.seedBank();
    const objective = await fixture.seedQuestion(bank._id.toString(), {
      prompt: 'Pick one',
      options: ['A', 'B'],
      correctAnswer: 'A',
      points: 1,
    });
    await fixture.seedQuestion(bank._id.toString(), {
      prompt: 'Explain your reasoning',
      type: 'short_answer',
      correctAnswer: 'Any reasonable explanation',
      points: 4,
    });
    const quiz = await fixture.seedQuiz({ bank, questionCount: 2 });
    const attempt = await fixture.service.startAttempt(quiz._id.toString(), STUDENT_ID);

    await fixture.service.saveAnswer(
      attempt._id.toString(),
      STUDENT_ID,
      objective._id.toString(),
      'A',
    );

    const result = await fixture.service.submitAttempt(attempt._id.toString(), STUDENT_ID);

    expect(result).toEqual({
      attemptId: attempt._id.toString(),
      status: 'submitted',
      score: null,
      maxScore: 5,
    });
    expect(fixture.gradedCalls[0]).toMatchObject({ score: 1, maxScore: 5, status: 'submitted' });
  });

  it('does not expose correct answers while an attempt is in progress', async () => {
    const fixture = makeFixture();
    const bank = await fixture.seedBank();
    await fixture.seedQuestion(bank._id.toString(), {
      prompt: 'Secret answer',
      correctAnswer: 'Hidden',
    });
    const quiz = await fixture.seedQuiz({ bank });
    const attempt = await fixture.service.startAttempt(quiz._id.toString(), STUDENT_ID);

    const result = await fixture.service.getAttempt(attempt._id.toString(), STUDENT_ID, false);

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]).not.toHaveProperty('correctAnswer');
  });

  it('returns 404 for another learner attempt but allows an administrator to read it', async () => {
    const fixture = makeFixture();
    const bank = await fixture.seedBank();
    await fixture.seedQuestion(bank._id.toString(), { prompt: 'Question' });
    const quiz = await fixture.seedQuiz({ bank });
    const attempt = await fixture.service.startAttempt(quiz._id.toString(), STUDENT_ID);

    await expect(
      fixture.service.getAttempt(attempt._id.toString(), OTHER_STUDENT_ID, false),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    const adminView = await fixture.service.getAttempt(attempt._id.toString(), ADMIN_ID, true);
    expect(adminView.attempt.id).toBe(attempt._id.toString());
  });

  it('rejects manual grading by a non-owner and allows an administrator', async () => {
    const fixture = makeFixture();
    const bank = await fixture.seedBank();
    await fixture.seedQuestion(bank._id.toString(), { prompt: 'Question' });
    const quiz = await fixture.seedQuiz({ bank });
    const attempt = await fixture.service.startAttempt(quiz._id.toString(), STUDENT_ID);
    attempt.maxScore = 5;

    await expect(
      fixture.service.gradeAttempt(attempt._id.toString(), OTHER_INSTRUCTOR_ID, false, 4),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });

    const graded = await fixture.service.gradeAttempt(attempt._id.toString(), ADMIN_ID, true, 4);
    expect(graded).toMatchObject({ score: 4, status: 'graded' });
  });
});
