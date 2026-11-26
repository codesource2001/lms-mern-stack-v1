import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { registerRouteDocs, type RouteDoc } from '../../docs/openapi-route.js';

const quizRoutes: readonly RouteDoc[] = [
  {
    method: 'post',
    path: '/quizzes/banks',
    summary: 'Create a question bank',
    responses: { 201: 'Question bank created', 403: 'Forbidden', 404: 'Course not found' },
  },
  {
    method: 'post',
    path: '/quizzes/questions',
    summary: 'Add a question to a bank',
    responses: { 201: 'Question added', 403: 'Forbidden', 404: 'Bank not found' },
  },
  {
    method: 'post',
    path: '/quizzes',
    summary: 'Create a quiz',
    responses: { 201: 'Quiz created', 403: 'Forbidden', 404: 'Bank not found' },
  },
  {
    method: 'post',
    path: '/quizzes/{id}/publish',
    summary: 'Publish a quiz',
    responses: { 200: 'Quiz published', 403: 'Forbidden', 404: 'Quiz not found' },
  },
  {
    method: 'post',
    path: '/quizzes/{id}/attempts',
    summary: 'Start a timed attempt',
    description: 'Requires active course access and an available attempt.',
    responses: {
      201: 'Attempt started',
      403: 'Forbidden',
      404: 'Quiz not found',
      409: 'Attempt limit reached or quiz misconfigured',
    },
  },
  {
    method: 'get',
    path: '/quizzes/attempts/{id}',
    summary: 'Get an attempt without correct answers',
    responses: { 200: 'Attempt and questions', 401: 'Unauthenticated', 404: 'Attempt not found' },
  },
  {
    method: 'post',
    path: '/quizzes/attempts/{id}/answers',
    summary: 'Save an answer during an attempt',
    responses: { 200: 'Answer saved', 404: 'Attempt not found', 409: 'Attempt expired' },
  },
  {
    method: 'post',
    path: '/quizzes/attempts/{id}/submit',
    summary: 'Submit an attempt for grading',
    description: 'Server-authoritative expiry; objective questions are graded immediately.',
    responses: { 200: 'Attempt submitted', 404: 'Attempt not found', 409: 'Attempt expired' },
  },
  {
    method: 'post',
    path: '/quizzes/attempts/{id}/grade',
    summary: 'Manually grade a short-answer attempt',
    responses: { 200: 'Attempt graded', 403: 'Forbidden', 404: 'Attempt not found' },
  },
];

export function registerQuizOpenApi(registry: OpenAPIRegistry): void {
  registerRouteDocs(registry, 'Quizzes', quizRoutes);
}
