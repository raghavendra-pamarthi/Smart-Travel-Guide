# Smart Travel Guide — Separate Admin Panel

## Admin entry

The Admin interface is completely separate from the Traveller and Local Guide interfaces:

- `/admin/login` — secure Admin login
- `/admin` — Admin Dashboard
- `/admin/guides` — Local Guide verification
- `/admin/places` — Place verification
- `/admin/reviews` — Reviews & Ratings monitoring
- `/admin/travellers` — Traveller management
- `/admin/bookings` — booking monitoring
- `/admin/reports` — Reports & Complaints
- `/admin/help` — Help Desk
- `/admin/analytics` — Analytics
- `/admin/settings` — Settings

No Admin navigation is rendered in Traveller or Local Guide layouts.

## Admin credentials

For deployment, configure these in `backend/.env` (do not commit the file):

```env
ADMIN_ID=your-admin-email
ADMIN_PASSWORD=your-strong-admin-password
```

For local evaluation only, if these variables are absent the development fallback is:

- Admin ID: `admin@smarttravelguide.local`
- Password: `Admin@12345`

Change these before real deployment.

Admin authentication uses its own Express session fields and does not reuse the Traveller/Local Guide app session token.

## Verification rules

- New Local Guide registrations start as `Pending`.
- Only `Verified` guides are returned by the guide search used by travellers.
- Existing guides from older project data without a verification field are treated as `Verified` to preserve the existing project behavior.
- New place submissions are stored as `Pending` and are not inserted into the public catalogue until an Admin approves them.
- Rejected catalogue places are hidden from the public place API.
- Package verification/moderation controls are intentionally absent. Admin only sees package information where needed for monitoring.

## Existing functionality

Traveller and Local Guide routes, sessions, packages, availability, bookings, Guide/Travel System requests, notifications, search, recommendations and roadmap functionality remain separate from the Admin UI.
