# Advance HRMS backend

## Access after upgrading

Apply the Django migrations before restarting the API and Celery services. An
existing Django superuser can manage access. Grant the following permissions
to the appropriate HR roles from Role Management or Django admin.

| Capability | Permission |
| --- | --- |
| View vacancies, candidate matches, and hiring activity | `recruitment:view` |
| Create vacancies | `recruitment:add` |
| Shortlist, manage stages, schedule interviews, and maintain offers | `recruitment:update` |
| Convert a hire into an employee | `users:add` |

The assigned interviewer needs recruitment view and update permissions to
submit a scorecard. Sign in again to refresh the navigation permissions.
For existing demo accounts that still have their original known passwords,
reset their passwords with `python manage.py changepassword <email>` before
making the service accessible. Use `seed_db` only on a fresh development
database. It prints randomly generated demo credentials.

## Production deployment

From the repository root, set `HRMS_ENV_FILE` to the protected deployment
configuration and use `docker compose -f docker-compose.production.yml`.
Set a unique `SECRET_KEY`, a PostgreSQL `DATABASE_URL`, and explicit
`ALLOWED_HOSTS`. Configure `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`
if the frontend and API use separate origins. Set `TRUST_PROXY_HTTPS_HEADER=1`
only when a trusted reverse proxy overwrites the forwarded protocol header.

Build the image, run `migrate` and `collectstatic --noinput` through the backend
service, and then start the services. Serve the Vite build and Django static
assets behind a TLS reverse proxy. Route `/api/v1/` and `/admin/` to Gunicorn.
If serving profile photos from media storage, expose only the profile photo
directory. Mail attachments are downloaded through an authenticated endpoint.
Back up PostgreSQL and media storage.

Production outbound mail supports TLS on IMAP 993 and SMTP 465 or 587. Configure
`MAIL_ALLOWED_HOSTS` with trusted provider hostnames for custom accounts.
Set network egress rules to match that deployment policy.

Recruitment ranks candidates by comma-separated skill overlap. Scheduling and
offers are recorded in HireFlow. Calendar invitations and offer delivery are
handled outside the application.
