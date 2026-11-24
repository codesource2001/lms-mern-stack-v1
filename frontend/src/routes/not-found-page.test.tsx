import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { NotFoundPage } from '@/routes/not-found-page';

describe('NotFoundPage', () => {
  it('offers a way back to the foundation overview', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /not been built yet/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /return to the foundation overview/i }),
    ).toHaveAttribute('href', '/');
  });
});
