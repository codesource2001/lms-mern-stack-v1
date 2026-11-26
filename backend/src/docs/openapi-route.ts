import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { env } from '../config/env.js';

export type OpenApiMethod = 'get' | 'post' | 'patch' | 'delete';

export interface RouteDoc {
  method: OpenApiMethod;
  path: string;
  summary: string;
  description?: string;
  secured?: boolean;
  responses: Record<number, string>;
}

/** Registers a group of path summaries without duplicating envelope schemas. */
export function registerRouteDocs(
  registry: OpenAPIRegistry,
  tag: string,
  routes: readonly RouteDoc[],
): void {
  for (const route of routes) {
    registry.registerPath({
      method: route.method,
      path: `${env.API_PREFIX}${route.path}`,
      tags: [tag],
      summary: route.summary,
      ...(route.description === undefined ? {} : { description: route.description }),
      ...(route.secured === false ? {} : { security: [{ bearerAuth: [] }] }),
      responses: Object.fromEntries(
        Object.entries(route.responses).map(([status, description]) => [
          Number(status),
          { description },
        ]),
      ),
    });
  }
}
