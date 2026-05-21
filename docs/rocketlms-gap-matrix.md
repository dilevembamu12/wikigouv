# RocketLMS -> NestJS Gap Matrix

Date: 2026-05-01

## Scope compare
- Source analyzed: `micleaneous/take-inspiration-from-the-rocketlms-project-presented-here/Source/Source/app/Http/Controllers`
- Rocket controllers normalized: `202`
- NestJS controllers currently implemented: `11`
- Missing normalized controller capabilities: `199`

## Already implemented in NestJS
- Auth/JWT/RBAC: `auth`, `users`
- LMS core: `courses`, `enrollments`, `quizzes`, `certificates`
- AI: `assistant`, `quiz-generator`, `case-simulator`
- Documents: `documents`
- Analytics: `analytics`
- Audit logs: `audit-logs`
- Participants / employees: `participants`, `employees`
- Notifications: `notifications` (list/create/update + filters/pagination)
- Supports: `supports` (list/create/update + filters/pagination + assignable agents)

## Major functional gaps (domain level)
- Webinars management (full parity): sessions, chapters, assignments, stats, certificates
- Blog/CMS: posts/categories/comments moderation
- Forums full stack: topics/posts/replies/reports/bookmarks
- Store/e-commerce domain: products/orders/discounts/specs/reviews
- Financial domain: payouts/sales/offline payments/installments/promotions
- Marketing domain: campaigns/referrals/special offers/purchase notifications
- Settings mega-domain: general/financial/personalization/theme/update app
- Meetings/live classes domain: reserve/join/manage
- Regionalization/translations/localization admin
- Support departments + conversations (currently only ticket head model)
- Advanced IAM-adjacent admin flows (impersonation, restrictions, login history at scale)

## Migration strategy (pragmatic)
1. Wave A: `forums` + `blog` + `categories` + `tags`
2. Wave B: `webinars` + `sessions` + `chapters` + `assignments`
3. Wave C: `store` + `orders` + `reviews` + `discounts`
4. Wave D: `financial` + `payout` + `installments`
5. Wave E: `marketing` + `referrals` + `purchase notifications`
6. Wave F: `settings` + `translator` + `regions`

## Constraints
- Full RocketLMS parity is a multi-wave migration project; not safe to ship as one atomic change.
- Each wave must include: DB migration, RBAC permissions, API controllers, tests, UI wiring, and docs.

