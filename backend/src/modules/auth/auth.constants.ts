export const AUDIT_ACTIONS = {
  REGISTRATION_SUCCEEDED: 'auth.registration.succeeded',
  REGISTRATION_EMAIL_DELIVERY_FAILED: 'auth.registration.email_delivery_failed',
  EMAIL_VERIFIED: 'auth.email.verified',
  EMAIL_VERIFICATION_RESENT: 'auth.email.verification_resent',
  LOGIN_SUCCEEDED: 'auth.login.succeeded',
  LOGIN_FAILED: 'auth.login.failed',
  ACCOUNT_LOCKED: 'auth.account.locked',
  LOGOUT: 'auth.logout',
  LOGOUT_ALL: 'auth.logout_all',
  REFRESH_REUSE_DETECTED: 'auth.refresh.reuse_detected',
  PASSWORD_RESET_REQUESTED: 'auth.password.reset_requested',
  PASSWORD_RESET_COMPLETED: 'auth.password.reset_completed',
  PASSWORD_CHANGED: 'auth.password.changed',
  PROFILE_UPDATED: 'auth.profile.updated',
} as const;

export const ROLE_SLUGS = {
  STUDENT: 'student',
} as const;
