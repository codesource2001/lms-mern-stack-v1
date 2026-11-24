import { createBrowserRouter } from 'react-router';

import { PublicLayout } from '@/components/layouts/public-layout';
import { HomePage } from '@/features/home/home-page';
import { NotFoundPage } from '@/routes/not-found-page';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: PublicLayout,
    children: [
      { index: true, Component: HomePage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
