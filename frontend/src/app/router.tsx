import { createBrowserRouter, Navigate } from 'react-router';
import { lazy, Suspense, type ReactNode } from 'react';

import { PublicLayout } from '@/components/layouts/public-layout';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { AppLayout } from '@/components/layouts/app-layout';
import { ProtectedRoute } from '@/components/common/protected-route';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { HomePage } from '@/features/home/home-page';
import { NotFoundPage } from '@/routes/not-found-page';

const LoginPage = lazy(() =>
  import('@/features/auth/pages/login-page').then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/features/auth/pages/register-page').then((module) => ({
    default: module.RegisterPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import('@/features/auth/pages/verify-email-page').then((module) => ({
    default: module.VerifyEmailPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/pages/forgot-password-page').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('@/features/auth/pages/reset-password-page').then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const DashboardPage = lazy(() =>
  import('@/features/analytics/pages/dashboard-page').then((module) => ({
    default: module.DashboardPage,
  })),
);
const NotificationsPage = lazy(() =>
  import('@/features/notifications/pages/notifications-page').then((module) => ({
    default: module.NotificationsPage,
  })),
);

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: PublicLayout,
    children: [
      { index: true, Component: HomePage },
      {
        path: 'login',
        element: (
          <Lazy>
            <LoginPage />
          </Lazy>
        ),
      },
      {
        path: 'register',
        element: (
          <Lazy>
            <RegisterPage />
          </Lazy>
        ),
      },
      {
        path: 'verify-email',
        element: (
          <Lazy>
            <VerifyEmailPage />
          </Lazy>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <Lazy>
            <ForgotPasswordPage />
          </Lazy>
        ),
      },
      {
        path: 'reset-password',
        element: (
          <Lazy>
            <ResetPasswordPage />
          </Lazy>
        ),
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
  {
    path: '/auth',
    Component: AuthLayout,
    children: [{ path: '*', element: <Navigate to="/login" replace /> }],
  },
  {
    path: '/app',
    element: (
      <ErrorBoundary>
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      </ErrorBoundary>
    ),
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute permission="analytics:read">
            <Lazy>
              <DashboardPage />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: 'notifications',
        element: (
          <ProtectedRoute permission="notifications:read">
            <Lazy>
              <NotificationsPage />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute permission="profile:read">
            <div className="space-y-4">
              <h1 className="font-display text-2xl font-semibold">Profile</h1>
              <p className="text-sm text-muted-foreground">
                Profile editing arrives with the full form implementation in later phases.
              </p>
            </div>
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: '*', Component: NotFoundPage },
]);
