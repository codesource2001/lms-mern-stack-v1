export const ROLE_SLUGS = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student',
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];

export const PERMISSIONS = {
  PROFILE_READ: 'profile:read',
  PROFILE_WRITE: 'profile:write',
  ACCOUNT_SECURITY: 'account:security',

  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_SUSPEND: 'users:suspend',
  USERS_ASSIGN_ROLE: 'users:assign_role',

  ROLES_READ: 'roles:read',
  ROLES_MANAGE: 'roles:manage',
  AUDIT_READ: 'audit:read',

  COURSES_READ: 'courses:read',
  COURSES_WRITE: 'courses:write',
  COURSES_PUBLISH: 'courses:publish',
  COURSES_DELETE: 'courses:delete',

  LESSONS_READ: 'lessons:read',
  LESSONS_WRITE: 'lessons:write',

  ENROLLMENTS_READ: 'enrollments:read',
  ENROLLMENTS_CREATE: 'enrollments:create',
  ENROLLMENTS_MANAGE: 'enrollments:manage',

  ASSIGNMENTS_READ: 'assignments:read',
  ASSIGNMENTS_WRITE: 'assignments:write',
  ASSIGNMENTS_SUBMIT: 'assignments:submit',
  ASSIGNMENTS_GRADE: 'assignments:grade',

  QUIZZES_READ: 'quizzes:read',
  QUIZZES_WRITE: 'quizzes:write',
  QUIZZES_ATTEMPT: 'quizzes:attempt',
  QUIZZES_GRADE: 'quizzes:grade',

  CERTIFICATES_READ: 'certificates:read',
  CERTIFICATES_ISSUE: 'certificates:issue',

  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_MANAGE: 'notifications:manage',

  ANALYTICS_READ: 'analytics:read',
  SETTINGS_MANAGE: 'settings:manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionDefinition {
  code: PermissionCode;
  description: string;
  group: string;
}

export const PERMISSION_CATALOG: readonly PermissionDefinition[] = [
  { code: PERMISSIONS.PROFILE_READ, description: 'Read your own profile', group: 'profile' },
  { code: PERMISSIONS.PROFILE_WRITE, description: 'Update your own profile', group: 'profile' },
  {
    code: PERMISSIONS.ACCOUNT_SECURITY,
    description: 'Change your password and manage sessions',
    group: 'profile',
  },

  { code: PERMISSIONS.USERS_READ, description: 'View user accounts', group: 'users' },
  { code: PERMISSIONS.USERS_WRITE, description: 'Create and edit user accounts', group: 'users' },
  {
    code: PERMISSIONS.USERS_SUSPEND,
    description: 'Suspend or reactivate user accounts',
    group: 'users',
  },
  { code: PERMISSIONS.USERS_ASSIGN_ROLE, description: 'Assign roles to users', group: 'users' },

  { code: PERMISSIONS.ROLES_READ, description: 'View roles and permissions', group: 'rbac' },
  { code: PERMISSIONS.ROLES_MANAGE, description: 'Create and modify roles', group: 'rbac' },
  { code: PERMISSIONS.AUDIT_READ, description: 'Read audit logs', group: 'rbac' },

  { code: PERMISSIONS.COURSES_READ, description: 'View courses and catalog', group: 'courses' },
  { code: PERMISSIONS.COURSES_WRITE, description: 'Create and edit courses', group: 'courses' },
  { code: PERMISSIONS.COURSES_PUBLISH, description: 'Publish courses', group: 'courses' },
  { code: PERMISSIONS.COURSES_DELETE, description: 'Delete courses', group: 'courses' },

  { code: PERMISSIONS.LESSONS_READ, description: 'View lessons', group: 'lessons' },
  { code: PERMISSIONS.LESSONS_WRITE, description: 'Create and edit lessons', group: 'lessons' },

  { code: PERMISSIONS.ENROLLMENTS_READ, description: 'View enrollments', group: 'enrollments' },
  { code: PERMISSIONS.ENROLLMENTS_CREATE, description: 'Enroll in a course', group: 'enrollments' },
  { code: PERMISSIONS.ENROLLMENTS_MANAGE, description: 'Manage enrollments', group: 'enrollments' },

  { code: PERMISSIONS.ASSIGNMENTS_READ, description: 'View assignments', group: 'assignments' },
  {
    code: PERMISSIONS.ASSIGNMENTS_WRITE,
    description: 'Create and edit assignments',
    group: 'assignments',
  },
  {
    code: PERMISSIONS.ASSIGNMENTS_SUBMIT,
    description: 'Submit assignment answers',
    group: 'assignments',
  },
  { code: PERMISSIONS.ASSIGNMENTS_GRADE, description: 'Grade assignments', group: 'assignments' },

  { code: PERMISSIONS.QUIZZES_READ, description: 'View quizzes', group: 'quizzes' },
  { code: PERMISSIONS.QUIZZES_WRITE, description: 'Create and edit quizzes', group: 'quizzes' },
  { code: PERMISSIONS.QUIZZES_ATTEMPT, description: 'Attempt quizzes', group: 'quizzes' },
  { code: PERMISSIONS.QUIZZES_GRADE, description: 'Grade quizzes', group: 'quizzes' },

  { code: PERMISSIONS.CERTIFICATES_READ, description: 'View certificates', group: 'certificates' },
  {
    code: PERMISSIONS.CERTIFICATES_ISSUE,
    description: 'Issue certificates',
    group: 'certificates',
  },

  {
    code: PERMISSIONS.NOTIFICATIONS_READ,
    description: 'Read notifications',
    group: 'notifications',
  },
  {
    code: PERMISSIONS.NOTIFICATIONS_MANAGE,
    description: 'Manage notifications',
    group: 'notifications',
  },

  { code: PERMISSIONS.ANALYTICS_READ, description: 'View analytics', group: 'analytics' },
  { code: PERMISSIONS.SETTINGS_MANAGE, description: 'Manage platform settings', group: 'settings' },
];

export const ALL_PERMISSION_CODES: readonly PermissionCode[] = PERMISSION_CATALOG.map(
  (definition) => definition.code,
);

export interface RoleDefinition {
  slug: RoleSlug;
  name: string;
  description: string;
  rank: number;
  isSystem: boolean;
  permissionCodes: readonly PermissionCode[];
}

const selfPermissions = [
  PERMISSIONS.PROFILE_READ,
  PERMISSIONS.PROFILE_WRITE,
  PERMISSIONS.ACCOUNT_SECURITY,
] as const;

const superAdminPermissions = ALL_PERMISSION_CODES;
const adminPermissions = ALL_PERMISSION_CODES.filter(
  (code) => code !== PERMISSIONS.ROLES_MANAGE && code !== PERMISSIONS.USERS_ASSIGN_ROLE,
);
const instructorPermissions = [
  ...selfPermissions,
  PERMISSIONS.COURSES_READ,
  PERMISSIONS.COURSES_WRITE,
  PERMISSIONS.COURSES_PUBLISH,
  PERMISSIONS.LESSONS_READ,
  PERMISSIONS.LESSONS_WRITE,
  PERMISSIONS.ENROLLMENTS_READ,
  PERMISSIONS.ASSIGNMENTS_READ,
  PERMISSIONS.ASSIGNMENTS_WRITE,
  PERMISSIONS.ASSIGNMENTS_GRADE,
  PERMISSIONS.QUIZZES_READ,
  PERMISSIONS.QUIZZES_WRITE,
  PERMISSIONS.QUIZZES_GRADE,
  PERMISSIONS.CERTIFICATES_READ,
  PERMISSIONS.NOTIFICATIONS_READ,
  PERMISSIONS.ANALYTICS_READ,
];
const studentPermissions = [
  ...selfPermissions,
  PERMISSIONS.COURSES_READ,
  PERMISSIONS.LESSONS_READ,
  PERMISSIONS.ENROLLMENTS_READ,
  PERMISSIONS.ENROLLMENTS_CREATE,
  PERMISSIONS.ASSIGNMENTS_READ,
  PERMISSIONS.ASSIGNMENTS_SUBMIT,
  PERMISSIONS.QUIZZES_READ,
  PERMISSIONS.QUIZZES_ATTEMPT,
  PERMISSIONS.CERTIFICATES_READ,
  PERMISSIONS.NOTIFICATIONS_READ,
];

export const ROLE_CATALOG: readonly RoleDefinition[] = [
  {
    slug: ROLE_SLUGS.SUPER_ADMIN,
    name: 'Super Admin',
    description: 'Unrestricted platform administration',
    rank: 100,
    isSystem: true,
    permissionCodes: superAdminPermissions,
  },
  {
    slug: ROLE_SLUGS.ADMIN,
    name: 'Admin',
    description: 'Day-to-day platform administration without role management',
    rank: 80,
    isSystem: true,
    permissionCodes: adminPermissions,
  },
  {
    slug: ROLE_SLUGS.INSTRUCTOR,
    name: 'Instructor',
    description: 'Course creation, lesson content, and grading',
    rank: 50,
    isSystem: true,
    permissionCodes: instructorPermissions,
  },
  {
    slug: ROLE_SLUGS.STUDENT,
    name: 'Student',
    description: 'Learner access to courses and assessments',
    rank: 20,
    isSystem: true,
    permissionCodes: studentPermissions,
  },
];
