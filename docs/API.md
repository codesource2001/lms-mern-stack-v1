# Atrium LMS API reference and versioning

| Field             | Value                                                |
| ----------------- | ---------------------------------------------------- |
| Base path         | `/api/v1`                                            |
| Contract          | OpenAPI 3.1, generated from Zod and path descriptors |
| Exported document | [`api/openapi.json`](api/openapi.json)               |
| Updated           | 26 November 2026                                     |

## Versioning policy

- The API major version is carried in the URL path (`/api/v1`). Breaking changes require a new major path (`/api/v2`) with both versions served during migration.
- Non-breaking additions (new endpoints, optional request fields, new response fields) stay on v1.
- Removing a field, changing a field's meaning, tightening a validation rule in an incompatible way, or changing an error code is breaking.
- `APP_VERSION` is the application release version and appears in the API root and OpenAPI `info.version`; it is not the API contract version.
- Swagger UI is mounted at `/api-docs` outside production, or in production only when `ENABLE_API_DOCS=true` is set deliberately.

## Response envelope

Success:

```json
{
  "success": true,
  "message": "Human-readable outcome",
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

Failure:

```json
{
  "success": false,
  "message": "Safe, user-facing message",
  "code": "MACHINE_READABLE_CODE",
  "errors": [{ "field": "body.email", "message": "Invalid email", "code": "invalid_format" }],
  "requestId": "uuid"
}
```

Stable error codes include `VALIDATION_ERROR`, `AUTH_REQUIRED`, `INVALID_ACCESS_TOKEN`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `CSRF_REJECTED`, and `INTERNAL_SERVER_ERROR`.

## Authentication

- Browser sessions use a short-lived access JWT in memory and an opaque rotating refresh token in an `HttpOnly`, `SameSite=Lax` cookie.
- Send `Authorization: Bearer <accessToken>` on protected routes. The SPA refreshes automatically on a `401` response.
- Cookie-authenticated refresh and logout require a trusted `Origin` or `Referer`; non-browser clients must send one explicitly.
- Roles and permissions are re-resolved server-side on every request. Client-supplied role data is never trusted.

## Pagination and filtering

List endpoints accept `page` and `limit`; the maximum page size is 100. Paginated responses include `meta` with `total`, `totalPages`, `hasNextPage`, and `hasPreviousPage`. Analytics aggregates are bounded server-side (top courses 100, trend 12 months, upcoming work 20).

## Categories in the generated document

`Accounting`, `Authentication`, `Users`, `Categories`, `Courses`, `Lessons`, `Enrollments`, `Assignments`, `Quizzes`, `Certificates`, `Notifications`, `Announcements`, `Analytics`, `Operations`, and `Discovery`.

## Regenerating the reference

```bash
npm run docs:api
```

The CLI writes `docs/api/openapi.json` from the in-process registry. Regenerate and commit the file whenever a route, tag, or documented response changes. The OpenAPI test asserts that representative paths from every domain remain registered.
