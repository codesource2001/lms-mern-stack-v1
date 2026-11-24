import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HomePage } from '@/features/home/home-page';

describe('HomePage', () => {
  it('presents the phase status and foundation guarantees', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /learning infrastructure with product craft/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/phase 2 of 15/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /read the roadmap/i })).toHaveAttribute(
      'href',
      '#roadmap',
    );
  });

  it('documents the next delivery phase', () => {
    render(<HomePage />);

    expect(screen.getByText('Database & backend foundation')).toBeInTheDocument();
    expect(screen.getByText('Authentication & RBAC')).toBeInTheDocument();
    expect(screen.getAllByText('Next').length).toBeGreaterThan(0);
  });
});
