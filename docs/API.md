# API (MVP actuel)

Base URL: `http://localhost:4000/api`

## Auth/User

- `GET /me`
- `PATCH /me/profile`
- `GET /auth/session`
- `POST /auth/sync-profile`

## Courses / LMS

- `GET /courses`
- `POST /courses`
- `GET /courses/public?q=&level=&status=&page=&pageSize=`
- `PATCH /courses/public/:id`
- `DELETE /courses/public/:id`
- `POST /courses/:id/enroll`
- `GET /courses/:id/progress`
- `GET /enrollments/me`
- `POST /lessons/:id/complete`
- `POST /quizzes`
- `POST /quizzes/:id/start`
- `POST /quiz-attempts/:id/submit`
- `GET /quiz-attempts/:id/result`

## Certificates

- `GET /certificates/me`
- `GET /certificates/:id`
- `GET /certificates/verify/:hash`

## Documents (MVP structure)

- `GET /documents`
- `POST /documents/upload` (multipart `file`, max 10MB, MIME: PDF/DOCX/TXT)
- `POST /documents/:id/process`
- `POST /documents/:id/validate`

## AI (MVP structure)

- `POST /ai/assistant/chat` (rate limited)
- `POST /ai/quiz-generator` (rate limited)
- `POST /ai/case-simulator/start` (rate limited)

## Analytics / Audit

- `GET /analytics/overview`
- `GET /analytics/dashboard`
- `GET /audit-logs?q=&action=&entityType=&actorUserId=&dateFrom=&dateTo=&page=&pageSize=`
- `GET /audit-logs/export.csv?q=&action=&entityType=&actorUserId=&dateFrom=&dateTo=`
