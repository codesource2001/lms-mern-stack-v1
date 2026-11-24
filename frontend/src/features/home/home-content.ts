export type PhaseStatus = 'complete' | 'next' | 'planned';

export interface RoadmapPhase {
  number: number;
  title: string;
  summary: string;
  status: PhaseStatus;
}

export const roadmapPhases: RoadmapPhase[] = [
  {
    number: 1,
    title: 'Project setup & architecture',
    summary: 'Repository, toolchain, application shells, documentation, and CI.',
    status: 'complete',
  },
  {
    number: 2,
    title: 'Database & backend foundation',
    summary: 'MongoDB, Redis, shared middleware, OpenAPI, and health readiness.',
    status: 'complete',
  },
  {
    number: 3,
    title: 'Authentication & RBAC',
    summary: 'Sessions, token rotation, permissions, and audit logging.',
    status: 'next',
  },
  {
    number: 4,
    title: 'Frontend foundation',
    summary: 'Design system, layouts, route protection, and app providers.',
    status: 'planned',
  },
  {
    number: 5,
    title: 'User management',
    summary: 'Admin, instructor, and student account workflows.',
    status: 'planned',
  },
  {
    number: 6,
    title: 'Course management',
    summary: 'Catalog, categories, curriculum, pricing, and approvals.',
    status: 'planned',
  },
  {
    number: 7,
    title: 'Lessons & video',
    summary: 'Content types, protected assets, progress, and sequential access.',
    status: 'planned',
  },
  {
    number: 8,
    title: 'Enrollment & progress',
    summary: 'Access control, expiry, completion tracking, and certificates data.',
    status: 'planned',
  },
  {
    number: 9,
    title: 'Assignments',
    summary: 'Submissions, deadlines, grading, feedback, and file handling.',
    status: 'planned',
  },
  {
    number: 10,
    title: 'Quizzes & exams',
    summary: 'Question banks, timed attempts, grading, and results analytics.',
    status: 'planned',
  },
  {
    number: 11,
    title: 'Certificates',
    summary: 'Issuance, verification, unique identifiers, and PDF export.',
    status: 'planned',
  },
  {
    number: 12,
    title: 'Notifications & analytics',
    summary: 'In-app and email delivery, reminders, dashboards, and reports.',
    status: 'planned',
  },
  {
    number: 13,
    title: 'Security audit',
    summary: 'Threat review, dependency audit, authorization tests, and hardening.',
    status: 'planned',
  },
  {
    number: 14,
    title: 'Testing & deployment',
    summary: 'Coverage targets, Playwright journeys, Docker images, and release gates.',
    status: 'planned',
  },
  {
    number: 15,
    title: 'Production documentation',
    summary: 'Runbooks, operations guides, API reference, and handoff.',
    status: 'planned',
  },
];

export const stackGroups = [
  {
    title: 'Interface',
    items: [
      'React 19.3',
      'React Router 8.5',
      'Tailwind CSS 4.3',
      'TanStack Query 5',
      'Zod 4',
      'Lucide',
    ],
  },
  {
    title: 'API',
    items: [
      'Node.js 24 LTS',
      'Express 5.3',
      'TypeScript 5.9',
      'Mongoose 9',
      'Redis 6',
      'OpenAPI 3.1',
    ],
  },
  {
    title: 'Quality',
    items: ['ESLint 10', 'Prettier 3.10', 'Vitest 5', 'Supertest 7', 'Husky 9', 'GitHub Actions'],
  },
  {
    title: 'Local infrastructure',
    items: [
      'MongoDB 8.3 · connected',
      'Redis 8.12 · connected',
      'Docker Compose',
      'Readiness checks',
    ],
  },
] as const;
