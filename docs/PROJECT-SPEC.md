# Project: LMS MERN Stack V1 – Enterprise Learning Management System

Act as a Senior Software Architect, Senior MERN Stack Developer, UI/UX Designer, DevSecOps Engineer, and Technical Lead.

Build a complete, modern, scalable, secure, production-oriented Learning Management System (LMS) using the latest stable MERN ecosystem.

The application must follow clean code principles, SOLID principles, modular architecture, reusable components, separation of concerns, maintainability, performance optimization, and industry-standard security practices.

IMPORTANT: This is a real development project, not a demo or prototype.

==================================================
1. TECHNOLOGY STACK
==================================================

Frontend:
- React with latest stable version
- TypeScript
- Vite
- React Router
- Tailwind CSS latest stable version
- shadcn/ui
- Radix UI
- Lucide React
- TanStack Query
- Zustand for client-side state
- React Hook Form
- Zod validation
- Axios
- Framer Motion / Motion
- Recharts for analytics
- TipTap for rich-text editing

Backend:
- Node.js latest LTS
- Express.js latest stable version
- TypeScript
- MongoDB
- Mongoose
- Redis for caching and temporary data
- JWT authentication
- Secure HTTP-only cookies
- Argon2id or bcrypt password hashing
- Zod validation
- Helmet
- CORS
- Rate limiting
- Pino logging
- Swagger / OpenAPI documentation

Development Tools:
- Git and GitHub
- ESLint
- Prettier
- Husky
- lint-staged
- Docker and Docker Compose
- Vitest
- Supertest
- Playwright
- GitHub Actions CI/CD

Before installation, verify current stable versions from official documentation. Do not blindly use outdated package versions or deprecated APIs.

==================================================
2. PROJECT ARCHITECTURE
==================================================

Keep frontend and backend completely separate.

Root structure:

lms-mern-stack-v1/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── common/
│   │   │   ├── forms/
│   │   │   └── layouts/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── courses/
│   │   │   ├── lessons/
│   │   │   ├── students/
│   │   │   ├── instructors/
│   │   │   ├── enrollments/
│   │   │   ├── assignments/
│   │   │   ├── quizzes/
│   │   │   ├── exams/
│   │   │   ├── certificates/
│   │   │   └── notifications/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── routes/
│   │   └── styles/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── database/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── roles/
│   │   │   ├── permissions/
│   │   │   ├── courses/
│   │   │   ├── categories/
│   │   │   ├── lessons/
│   │   │   ├── enrollments/
│   │   │   ├── instructors/
│   │   │   ├── students/
│   │   │   ├── assignments/
│   │   │   ├── quizzes/
│   │   │   ├── exams/
│   │   │   ├── certificates/
│   │   │   ├── payments/
│   │   │   └── notifications/
│   │   ├── middlewares/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── shared/
│   │   ├── jobs/
│   │   ├── routes/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── docs/
├── docker/
├── .github/workflows/
├── docker-compose.yml
├── .gitignore
├── README.md
├── PLAN.md
├── AGENTS.md
└── SECURITY.md

Follow feature-based modular architecture. Each backend module should have its own:
- model
- repository
- service
- controller
- routes
- validation schema
- types
- tests

Avoid unnecessary abstraction. Use shared utilities only when genuinely reusable.

==================================================
3. USER ROLES AND PERMISSIONS
==================================================

Implement Role-Based Access Control (RBAC) with granular permissions.

Roles:

1. Super Admin
2. Admin
3. Instructor
4. Student

Super Admin:
- Complete system management
- Manage administrators
- Manage roles and permissions
- Manage all users
- Manage all courses
- Platform configuration
- Analytics and reports
- Audit logs
- System settings

Admin:
- Manage students
- Manage instructors
- Manage courses
- Manage enrollments
- Manage assignments and exams
- View reports
- Manage announcements

Instructor:
- Instructor dashboard
- Create and manage courses
- Create sections and lessons
- Upload course materials
- Create assignments
- Create quizzes and exams
- Review submissions
- Grade students
- Track student progress

Student:
- Student dashboard
- Browse courses
- Enroll in courses
- Watch lessons
- Download permitted resources
- Submit assignments
- Attempt quizzes and exams
- Track learning progress
- View certificates
- Manage profile

Important:
- Never rely on frontend role checks alone.
- Enforce permissions on every protected backend endpoint.
- Use permission-based authorization rather than hardcoded role checks throughout the application.
- Implement secure account status and administrative suspension controls.

==================================================
4. AUTHENTICATION AND SECURITY
==================================================

Implement complete authentication:

- User registration
- Login and logout
- Email verification
- Forgot password
- Password reset
- Refresh token rotation
- Session management
- Logout from all devices
- Change password
- Profile management
- Optional MFA support

Security requirements:

- Short-lived access tokens.
- Refresh tokens stored securely in HTTP-only, Secure, SameSite cookies.
- Hash passwords using Argon2id or bcrypt with appropriate settings.
- Store refresh-token hashes server-side.
- Implement token rotation and reuse detection.
- Prevent brute-force attacks using rate limiting.
- Validate and sanitize user input.
- Protect against XSS, CSRF, NoSQL injection and broken access control.
- Configure CORS with an explicit origin allowlist.
- Use Helmet and secure cookie settings.
- Never expose secrets in frontend code.
- Never return password hashes or token hashes in API responses.
- Implement centralized error handling.
- Avoid logging passwords, tokens or sensitive personal information.
- Add account lockout or progressive delays for suspicious login attempts.
- Add security audit logs for sensitive operations.

Use environment variables and provide .env.example files without real secrets.

==================================================
5. LMS CORE FEATURES
==================================================

A. Course Management
- Create, edit and delete courses.
- Course categories and subcategories.
- Course thumbnails and banners.
- Course descriptions.
- Course pricing and free courses.
- Draft, published and archived states.
- Course prerequisites.
- Course curriculum.
- Sections and lessons.
- Course tags and search.
- Course approval workflow.

B. Lesson Management
- Video lessons.
- Text lessons.
- PDF resources.
- Downloadable attachments.
- Lesson duration.
- Lesson completion tracking.
- Preview lessons.
- Sequential lesson unlocking.

C. Enrollment
- Free enrollment.
- Paid enrollment.
- Enrollment history.
- Course access control.
- Enrollment expiration.
- Learning progress.

D. Assignments
- Assignment creation.
- Submission uploads.
- Submission deadlines.
- Instructor grading.
- Feedback and marks.
- Submission history.

E. Quiz and Examination
- Multiple-choice questions.
- True/false questions.
- Short answers.
- Question banks.
- Random question selection.
- Time-limited examinations.
- Automatic grading where applicable.
- Results and analytics.
- Attempt history.

F. Certificates
- Automatic certificate generation.
- Unique certificate ID.
- Certificate verification page.
- PDF certificate export.

G. Notifications
- In-app notifications.
- Email notifications.
- Course announcements.
- Assignment deadline reminders.
- Examination notifications.

H. Analytics
- Total users.
- Active students.
- Total instructors.
- Total courses.
- Enrollment statistics.
- Revenue statistics.
- Course completion rates.
- Student performance.
- Instructor activity.

==================================================
6. MODERN UI/UX DESIGN
==================================================

Create a premium, modern SaaS-style educational platform.

Design inspiration:
- Linear
- Vercel
- Stripe
- Coursera
- Udemy
- Modern SaaS dashboards

Visual direction:
- Clean light theme by default.
- Optional dark mode.
- Soft neutral backgrounds.
- Subtle gradients.
- Professional typography.
- Consistent spacing.
- Rounded cards.
- Soft shadows.
- Beautiful icons.
- Smooth animations.
- Minimal visual clutter.

Use a consistent design system:
- Color tokens.
- Typography scale.
- Spacing scale.
- Border radius.
- Shadows.
- Reusable buttons.
- Inputs.
- Dialogs.
- Dropdowns.
- Tables.
- Cards.
- Badges.
- Skeleton loaders.
- Empty states.
- Toast notifications.

Frontend pages:

Public:
- Home page
- About
- Course catalog
- Course details
- Instructor profiles
- Pricing
- Contact
- Login
- Registration
- Forgot password

Admin:
- Dashboard
- Users
- Instructors
- Students
- Courses
- Categories
- Enrollments
- Assignments
- Examinations
- Reports
- Notifications
- Roles and permissions
- Settings

Instructor:
- Dashboard
- My courses
- Create course
- Course curriculum builder
- Lesson editor
- Students
- Assignments
- Quiz builder
- Exam management
- Grading
- Analytics

Student:
- Dashboard
- My learning
- Course player
- Course catalog
- Assignments
- Quizzes
- Examinations
- Certificates
- Notifications
- Profile and settings

UI requirements:
- Fully responsive.
- Mobile-first design.
- Collapsible sidebar.
- Responsive navigation.
- Search and filtering.
- Pagination.
- Data tables.
- Form validation.
- Confirmation dialogs.
- Loading skeletons.
- Error and empty states.
- Accessible keyboard navigation.
- WCAG-aware color contrast.
- Reduced-motion support.

Use reusable layout components and separate layouts for public, admin, instructor and student areas.

==================================================
7. BACKEND API DESIGN
==================================================

Use REST API with versioning.

Base URL:

/api/v1

Example endpoints:

Authentication:
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/me

Users:
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id

Courses:
GET    /courses
GET    /courses/:id
POST   /courses
PATCH  /courses/:id
DELETE /courses/:id
POST   /courses/:id/publish

Lessons:
GET  /courses/:courseId/lessons
POST /courses/:courseId/lessons
PATCH /lessons/:id
DELETE /lessons/:id

Enrollments:
POST /enrollments
GET  /enrollments/my
GET  /enrollments/:id

Assignments:
POST /assignments
GET  /assignments
POST /assignments/:id/submissions
PATCH /submissions/:id/grade

Examinations:
POST /exams
GET  /exams
POST /exams/:id/attempts
POST /exams/:id/submit

Use:
- Consistent HTTP status codes.
- Centralized response utilities.
- Pagination.
- Filtering.
- Sorting.
- Search.
- Request validation.
- API documentation.
- Consistent error responses.

Example response:

{
  "success": true,
  "message": "Course fetched successfully",
  "data": {},
  "meta": {}
}

Example error:

{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}

==================================================
8. DATABASE DESIGN
==================================================

Design scalable MongoDB schemas with appropriate references and indexes.

Collections:
- users
- roles
- permissions
- courses
- categories
- sections
- lessons
- enrollments
- assignments
- submissions
- quizzes
- questions
- exams
- examAttempts
- certificates
- notifications
- payments
- auditLogs
- refreshTokens

Requirements:
- Define schema validation.
- Add appropriate indexes.
- Add compound indexes for common queries.
- Use pagination for large datasets.
- Prevent duplicate enrollments.
- Maintain data consistency.
- Use transactions where required and supported.
- Avoid excessive populate operations.
- Optimize aggregation pipelines.
- Add timestamps.
- Define deletion and retention policies.
- Avoid storing large video files directly in MongoDB.

==================================================
9. FILE AND VIDEO MANAGEMENT
==================================================

Implement a reusable storage abstraction.

Support:
- Local storage for development.
- Cloudinary or S3-compatible object storage for production.
- Video uploads.
- PDF uploads.
- Course thumbnails.
- Instructor profile images.
- Assignment submissions.

Security:
- Validate file MIME types and signatures.
- Restrict file size.
- Generate unique filenames.
- Use private storage for protected materials.
- Use signed URLs where supported.
- Verify authorization before granting file access.
- Prevent path traversal.
- Configure upload quotas.

Keep storage providers replaceable without rewriting business logic.

==================================================
10. PERFORMANCE AND SCALABILITY
==================================================

Implement:
- Redis caching where appropriate.
- Database indexing.
- Efficient pagination.
- Lazy-loaded frontend routes.
- Image optimization.
- API response optimization.
- Request compression.
- Rate limiting.
- Background jobs for email and heavy tasks.
- Proper connection pooling.
- Logging and monitoring.
- Graceful shutdown.

Do not introduce unnecessary caching or complexity.

==================================================
11. TESTING AND CODE QUALITY
==================================================

Backend:
- Unit tests.
- Service tests.
- Repository tests.
- API integration tests.
- Authentication tests.
- Authorization tests.

Frontend:
- Component tests.
- Form validation tests.
- Route protection tests.
- Feature tests.

End-to-end:
- Registration.
- Login.
- Course creation.
- Enrollment.
- Lesson completion.
- Assignment submission.
- Exam attempt.
- Certificate generation.

Use ESLint, Prettier, TypeScript strict mode and meaningful test coverage.

==================================================
12. DEVOPS AND DEPLOYMENT
==================================================

Create:
- Frontend Dockerfile.
- Backend Dockerfile.
- Docker Compose.
- MongoDB configuration.
- Redis configuration.
- Production environment examples.
- GitHub Actions CI pipeline.
- Build validation.
- Test automation.
- Lint checks.
- Deployment documentation.

Include health-check endpoints and production logging.

Never commit .env files, private keys, database dumps or secrets.

==================================================
13. DEVELOPMENT DOCUMENTATION
==================================================

Create these files:

README.md:
- Project overview.
- Features.
- Technologies.
- Installation.
- Environment setup.
- Development commands.
- API documentation.
- Deployment instructions.

PLAN.md:
- Complete development roadmap.
- Phases.
- Tasks.
- Dependencies.
- Progress checklist.

AGENTS.md:
- Architecture rules.
- Coding conventions.
- Naming conventions.
- Security requirements.
- Testing requirements.
- Git commit conventions.
- Instructions for future AI coding agents.

SECURITY.md:
- Security policy.
- Vulnerability reporting.
- Security best practices.

==================================================
14. GIT AND VERSION CONTROL
==================================================

GitHub repository:

https://github.com/codesource2001/lms-mern-stack-v1.git

Initialize Git using:

echo "# lms-mern-stack-v1" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/codesource2001/lms-mern-stack-v1.git
git push -u origin main

Use professional commit conventions:

feat: add authentication module
feat: implement course management
feat: add instructor dashboard
fix: resolve enrollment validation
refactor: improve repository architecture
perf: optimize course queries
test: add authentication tests
docs: update API documentation
chore: configure development tooling
security: improve refresh token handling

Do not commit everything in one large commit.

Commit feature-wise after validating each completed feature.

==================================================
15. STRICT DEVELOPMENT RULES
==================================================

1. First analyze the project structure.
2. Check installed dependencies and versions.
3. Read existing code before changing it.
4. Create PLAN.md before major implementation.
5. Implement frontend and backend separately.
6. Use TypeScript strict mode.
7. Follow SOLID and DRY principles.
8. Use reusable components and services.
9. Follow Repository Pattern in backend data access.
10. Avoid duplicated business logic.
11. Avoid massive controller and component files.
12. Keep business logic out of route handlers.
13. Validate every incoming request.
14. Enforce authorization on the backend.
15. Use centralized error handling.
16. Write tests for important features.
17. Do not leave fake APIs or incomplete placeholders.
18. Do not claim a feature is complete without testing it.
19. Keep documentation updated.
20. Never introduce breaking changes without documenting them.

==================================================
16. IMPLEMENTATION PHASES
==================================================

Phase 1: Project setup and architecture.
Phase 2: Database and backend foundation.
Phase 3: Authentication and RBAC.
Phase 4: Frontend foundation and design system.
Phase 5: User management.
Phase 6: Course management.
Phase 7: Lesson and video management.
Phase 8: Enrollment and learning progress.
Phase 9: Assignment management.
Phase 10: Quiz and examination system.
Phase 11: Certificate system.
Phase 12: Notifications and analytics.
Phase 13: Security audit and optimization.
Phase 14: Testing and Docker deployment.
Phase 15: Production documentation.

Start with Phase 1 only.

Before writing code:
- Analyze requirements.
- Design architecture.
- Prepare folder structure.
- Create PLAN.md.
- Create AGENTS.md.
- Identify dependencies.
- Explain architectural decisions.

Do not generate the entire application in one response.

Work phase by phase, feature by feature. After each phase, run checks and tests, report completed tasks, identify remaining work, and suggest the next implementation step.

FINAL GOAL:

Build a premium, secure, maintainable and scalable MERN Learning Management System with completely separate frontend and backend applications, reusable code, clean architecture, modern UI/UX, and production-ready engineering practices.