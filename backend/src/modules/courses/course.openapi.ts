import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { registerRouteDocs, type RouteDoc } from '../../docs/openapi-route.js';

const categoryRoutes: readonly RouteDoc[] = [
  {
    method: 'get',
    path: '/categories',
    summary: 'List course categories',
    secured: false,
    responses: { 200: 'Category list' },
  },
  {
    method: 'post',
    path: '/categories',
    summary: 'Create a category',
    responses: { 201: 'Category created', 401: 'Unauthenticated', 422: 'Invalid category' },
  },
  {
    method: 'patch',
    path: '/categories/{id}',
    summary: 'Update a category',
    responses: { 200: 'Category updated', 401: 'Unauthenticated', 404: 'Category not found' },
  },
  {
    method: 'delete',
    path: '/categories/{id}',
    summary: 'Delete a category',
    responses: { 200: 'Category deleted', 401: 'Unauthenticated', 409: 'Category has children' },
  },
];

const courseRoutes: readonly RouteDoc[] = [
  {
    method: 'get',
    path: '/courses',
    summary: 'Browse the published course catalog',
    description: 'Paginated and filterable by category, tag, and search term.',
    secured: false,
    responses: { 200: 'Course page with pagination metadata', 422: 'Invalid query' },
  },
  {
    method: 'get',
    path: '/courses/mine',
    summary: 'List courses you teach',
    responses: { 200: 'Instructor course list', 401: 'Unauthenticated' },
  },
  {
    method: 'get',
    path: '/courses/{id}',
    summary: 'Get a published course',
    secured: false,
    responses: { 200: 'Course detail', 404: 'Course not found' },
  },
  {
    method: 'post',
    path: '/courses',
    summary: 'Create a draft course',
    responses: { 201: 'Course created', 401: 'Unauthenticated', 422: 'Invalid course' },
  },
  {
    method: 'patch',
    path: '/courses/{id}',
    summary: 'Update a course you own',
    responses: { 200: 'Course updated', 403: 'Forbidden', 404: 'Course not found' },
  },
  {
    method: 'post',
    path: '/courses/{id}/submit',
    summary: 'Submit a course for review',
    responses: { 200: 'Course submitted', 403: 'Forbidden', 409: 'Invalid state' },
  },
  {
    method: 'post',
    path: '/courses/{id}/publish',
    summary: 'Publish a submitted course',
    description: 'Requires the courses:publish permission.',
    responses: { 200: 'Course published', 403: 'Forbidden', 409: 'Invalid state' },
  },
  {
    method: 'post',
    path: '/courses/{id}/archive',
    summary: 'Archive a course',
    responses: { 200: 'Course archived', 403: 'Forbidden', 404: 'Course not found' },
  },
  {
    method: 'delete',
    path: '/courses/{id}',
    summary: 'Delete a course',
    responses: { 200: 'Course deleted', 403: 'Forbidden', 404: 'Course not found' },
  },
  {
    method: 'get',
    path: '/courses/{id}/sections',
    summary: 'List course sections',
    secured: false,
    responses: { 200: 'Section list', 404: 'Course not found' },
  },
  {
    method: 'post',
    path: '/courses/{id}/sections',
    summary: 'Add a section',
    responses: { 201: 'Section created', 403: 'Forbidden', 404: 'Course not found' },
  },
  {
    method: 'post',
    path: '/courses/{id}/thumbnail',
    summary: 'Upload a course thumbnail',
    description: 'Multipart upload, 5 MB maximum, private storage.',
    responses: { 200: 'Thumbnail saved', 400: 'File required', 403: 'Forbidden' },
  },
  {
    method: 'get',
    path: '/courses/{id}/lessons',
    summary: 'List lessons in a course',
    responses: { 200: 'Lesson list', 401: 'Unauthenticated', 404: 'Course not found' },
  },
  {
    method: 'post',
    path: '/courses/{id}/lessons',
    summary: 'Create a lesson',
    responses: { 201: 'Lesson created', 403: 'Forbidden', 404: 'Course not found' },
  },
  {
    method: 'post',
    path: '/courses/{id}/lessons/reorder',
    summary: 'Reorder lessons with an ordered id list',
    responses: { 200: 'Lessons reordered', 403: 'Forbidden', 422: 'Invalid order' },
  },
];

export function registerCourseOpenApi(registry: OpenAPIRegistry): void {
  registerRouteDocs(registry, 'Categories', categoryRoutes);
  registerRouteDocs(registry, 'Courses', courseRoutes);
}
