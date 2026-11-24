import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ProtectedRoute } from '@/components/common/protected-route';
import { useAuthStore } from '@/stores/auth-store';

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', () => {
    useAuthStore.setState({ status: 'unauthenticated', user: null, accessToken: null });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={<ProtectedRoute>Protected</ProtectedRoute>} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders children for authenticated users', () => {
    useAuthStore.setState({
      status: 'authenticated',
      accessToken: 'token',
      user: {
        id: '1',
        name: 'Ada',
        email: 'ada@example.com',
        status: 'active',
        roles: [],
        permissions: [],
        emailVerified: true,
      },
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={<ProtectedRoute>Protected content</ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
