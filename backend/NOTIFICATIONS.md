Notifications feature - setup

1. Update database

- The `Notification` model was added to `prisma/schema.prisma`.
- To apply the schema change run (local dev):

```
npx prisma migrate dev --name add_notifications
npx prisma generate
```

If you use a different migration workflow (CI or manual SQL), generate the migration accordingly.

2. Backend

- A new NestJS module was added at `src/notifications` with controller and service.
- Endpoints:
  - `GET /api/notifications` — list for current user, query `?unread=1` filters unread only
  - `POST /api/notifications` — create notification (body: title, message, userId?, payload?, link?)
  - `POST /api/notifications/:id/read` — mark a single notification read
  - `POST /api/notifications/mark-all-read` — mark all read for current user

3. Frontend

- Client helpers: `frontend/lib/api/notifications.ts`
- UI component: `frontend/components/ui/NotificationsList.tsx`
- Header integration: `frontend/components/layout/AdminHeader.tsx` shows unread count and dropdown.

4. Automatic triggers & reminders

- The backend now automatically creates notifications for proposal lifecycle events:
  - On submit: approvers are notified.
  - On approve/reject: the proposal creator is notified.
- A scheduler runs periodically (every 10 minutes) and sends reminder notifications to approvers for proposals pending >24 hours. It updates `lastReminderSentAt` on the `proposal` to avoid duplicate reminders.

Files added/changed for this behavior:
- `src/proposals/proposals.service.ts` — calls `NotificationsService` on submit/approve/reject.
- `src/notifications/notifications.scheduler.ts` — periodic reminder job.
- `prisma/schema.prisma` — added `lastReminderSentAt` column to `Proposal` model.

Note: old notifications that contain legacy links under `/admin/proposals/...` are normalized by the API to `/proposals/...` so they open the public proposal page.

To apply schema changes (including `lastReminderSentAt`) run the migration step above.
