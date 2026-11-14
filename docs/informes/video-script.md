# Video script — Internship Portal (≈ 8 minutes)

Recorded on production: <https://pasantias.165-227-8-179.sslip.io>, with the interface in **English**.
All demo accounts use the password `Password123!`.

## Before recording

- Open **two browser windows**, one normal and one private (incognito), so two roles can be logged in at the same time: the company in one, the student in the other. The admin can reuse either window later.
- Have a small **PDF** (the CV) and an **image** (a logo) at hand.
- Open in tabs: the GitHub repository, the latest green run in **Actions**, and **Swagger** (`/api/docs`).
- Check that the interface is in English (language selector in the top bar).
- Do a quick dry run: publish, apply, accept and remove once, so nothing surprises you. Use a new offer title in the real take (for example "Junior Backend Developer — Video").

Timings are approximate. *Italics* are what to do on screen; the quoted text is what to say.

---

## 1. Introduction — 0:00 to 0:40

*On screen: the app's landing page (offers search), not logged in.*

> "Hi, I'm Thomas Reynoso, and this is my final project for the Programming Technician degree, tutored by Juan Ignacio Schiavonni.
> It's an internship and junior job portal. Companies publish internships and junior positions, students search for them and apply, and both sides can talk to each other inside the platform. An administrator moderates accounts and offers.
> The app is live on my own server, and I'll show the whole flow for the three roles."

## 2. Architecture in one minute — 0:40 to 1:40

*On screen: the GitHub repository, scroll the README; then the deployment diagram in `docs/despliegue.md`.*

> "It's a monorepo with npm workspaces: a React 19 and TypeScript frontend, and a REST API built with NestJS.
> The data lives in PostgreSQL, accessed with Prisma. Authentication uses JWT with role-based guards, so every endpoint knows whether it's for students, companies or admins.
> CVs and logos are stored in a private Backblaze B2 bucket, and emails are sent through Brevo.
> In production, everything runs with Docker on a DigitalOcean server: Caddy serves the frontend and forwards `/api` to the API container, with HTTPS out of the box.
> The whole app is available in English and Spanish."

*Optional: switch the language to Spanish and back, on the app.*

## 3. Browsing without an account — 1:40 to 2:15

*On screen: the offers page, not logged in. Type a search, pick a category and a modality, open an offer, then open the company page.*

> "Anyone can browse offers without an account. I can search by text and filter by category, tags, type, modality, workload and province. The filters live in the URL, so a search can be shared.
> Each offer shows the company, the details and the deadline, and each company has a public page with its open offers.
> To apply, though, you need a student account."

## 4. The company publishes an offer — 2:15 to 3:15

*Window 1: log in as `rrhh@techsur.dev`. Show the green color of the company area. Open "Company profile" and briefly show the logo card. Then "My offers" → "Publish an offer": fill in title, description, category, a couple of tags, type, remote modality, workload, and a deadline. Publish.*

> "Now I'm logged in as a company, TechSur. Each role has its own color, so you always know which area you're in.
> The company manages its profile, including its logo, which is shown on its offers.
> Let's publish a new internship. The form validates everything on both sides, in the browser and in the API: for example, on-site and hybrid offers require a province, and the minimum salary can't be higher than the maximum.
> Here's the offer in 'My offers', with its applicant count."

## 5. The student applies — 3:15 to 4:15

*Window 2 (private): log in as `ana.gomez@alumnos.dev` (purple area). Open "My profile" and show the CV card (upload the PDF if there is none). Go to "Offers", find the new offer, open it and apply with a short cover letter. Then open "My applications".*

> "In the other window I'm Ana, a student. Her profile has her studies, contact details and her CV as a PDF. Files are private: the API checks the real file type and only hands out signed links that expire.
> Ana finds the new offer and applies with a short message. Her current CV is attached to the application.
> In 'My applications' she can follow the status of each one: pending, accepted or rejected. She can also withdraw it while it's pending."

## 6. The company reviews and replies — 4:15 to 5:15

*Window 1 (company): show the bell with the new notification and open it. Go to the offer's applicants, open Ana's profile and the CV, go back and **accept** the application. Click "Message" and send a short message.*

> "Back to the company. The bell shows a new notification: Ana applied.
> In the applicants list, the company can see each student's profile and download their CV, filter by status, and accept or reject.
> I'll accept Ana, and send her a message. Every application has its own conversation between the student and the company."

*Window 2 (student): wait for the notification counter (it refreshes every 30 seconds), open the notifications, then the conversation, and reply.*

> "On Ana's side, she gets a notification that she was accepted, and the message. She can reply right here. Notifications and messages are refreshed periodically."

## 7. The administrator moderates — 5:15 to 6:45

*Log out in one of the windows and log in as `admin@pasantias.dev` (orange area). Show the dashboard.*

> "Finally, the administrator. The dashboard shows the main metrics: students and companies, offers by status, applications, and the latest moderation actions."

*Open "Offers", search for the offer from the video and click **Remove**. Try to confirm with an empty reason to show it is required, then write a reason and confirm.*

> "The admin can review every offer in any status. If one breaks the rules, it can be removed, and a reason is required. Students stop seeing it and its conversations are closed, but nothing is deleted."

*Switch to the company window: show the new notification and open the offer, which shows the reason.*

> "The company is notified, and it can still see its offer with the reason."

*Back to the admin: restore the offer. Then open "Accounts", filter by students, deactivate `lucas.perez@alumnos.dev` with a reason, and reactivate him.*

> "The offer can be restored, and it goes back to the status it had.
> Accounts work the same way: the admin can search students and companies and deactivate an account with a reason. That person can't log in anymore and gets an email. If it's a company, its offers are hidden. Reactivating brings everything back."

*Open "Catalog" briefly, then "Activity".*

> "The admin also manages the categories and tags used by the filters. And every moderation action is recorded in the activity log: who did it, when and why."

## 8. Quality and API — 6:45 to 7:40

*On screen: GitHub Actions with a green run, open the Backend job to show the steps. Then Swagger.*

> "On quality: every push runs a GitHub Actions pipeline with linting, type checking, unit tests, and end-to-end tests. The backend has 157 end-to-end tests that hit the real API against a fresh PostgreSQL database, covering every module.
> The whole API is documented with Swagger, including the error codes of each endpoint. Errors come back with a stable code, and the frontend shows its own translated message for each one.
> Deploying is one script on the server: it builds the images, runs the database migrations, waits for the API to be healthy and only then publishes the new frontend."

## 9. Closing — 7:40 to 8:00

*On screen: the admin dashboard or the landing page.*

> "To sum up: all eleven planned modules are implemented, the app is live, tested and documented in the repository. Thanks for watching!"

---

## Short glossary for the narration

| Spanish | English |
| --- | --- |
| pasantía | internship |
| postulación / postularse | application / to apply |
| postulante | applicant |
| oferta dada de baja | removed offer |
| carga horaria | workload |
| modalidad presencial / remota / híbrida | on-site / remote / hybrid |
| desactivar una cuenta | to deactivate an account |
| motivo | reason |
| despliegue | deployment |
