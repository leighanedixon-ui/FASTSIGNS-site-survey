# FASTSIGNS Site Survey — Netlify + GitHub setup

This form runs as a static page. When the surveyor taps **Survey Complete** (enabled
once Site Code + Surveyor are filled), the survey **files itself** to a GitHub
repository via a small Netlify serverless function, and that tap also **unlocks Send
& PDF**. If anything changes afterward, the same record is updated. **Send** and
**PDF** let the installer email their company and the install coordinator.

For each submission, two files are committed:

```
surveys/<SITECODE>/<SITECODE>_<YYYYMMDD>_<HHMM>.html   ← self-contained, photos baked in, opens in any browser / prints to PDF
surveys/<SITECODE>/<SITECODE>_<YYYYMMDD>_<HHMM>.json   ← machine-readable record (photos reduced to counts)
```

---

## 1. Repositories

- **Site repo** — holds the form itself; connect this one to Netlify for hosting.
- **Surveys repo** *(recommended: a separate repo)* — where completed surveys land.

> Using a separate surveys repo means filing a survey never triggers a website
> rebuild. You *can* point at the same repo, but expect a redeploy on every submission.

## 2. Deploy the site to Netlify

Either:
- **Single file (simplest):** rename `FASTSIGNS Site Survey Form (offline).html` to
  `index.html` and deploy it together with `netlify.toml` and the `netlify/`
  folder, **or**
- **Multi-file project:** deploy the whole folder (`Site Survey Form.html` +
  `survey/` + `netlify/` + `netlify.toml`). Set the form's file as your index or
  rename it to `index.html`.

Netlify will pick up the function in `netlify/functions/` automatically.

## 3. Create a GitHub token

GitHub → **Settings → Developer settings → Fine-grained personal access tokens**:
- **Repository access:** only the **surveys** repo.
- **Permissions:** *Contents → Read and write*.
- Copy the token (starts with `github_pat_…`).

> A fine-grained token scoped to one repo is safest. A classic token with `repo`
> scope also works.

## 4. Add environment variables in Netlify

Site → **Site configuration → Environment variables**:

| Key             | Value                                  |
|-----------------|----------------------------------------|
| `GITHUB_TOKEN`  | the token from step 3                  |
| `GITHUB_OWNER`  | the GitHub user/org owning the repo    |
| `GITHUB_REPO`   | the **surveys** repo name              |
| `GITHUB_BRANCH` | `main` (optional; defaults to `main`)  |

Redeploy so the function picks up the variables.

The token lives **only** on Netlify's server side inside the function — it is never
in the page and never reaches the installer's browser.

## 5. Confirmation emails (Resend)

Every survey now collects a required **Surveyor Email**. When a survey files
successfully, the function sends that surveyor a short confirmation email —
and the same email lets them look up all their filed surveys from **My Surveys**
in the app.

1. Create a free account at **resend.com**.
2. **Domains** → add and verify a sending domain (or use Resend's shared test
   domain while trying this out).
3. **API Keys** → create a key with send permission.
4. In Netlify, add two more environment variables:

| Key               | Value                                                |
|-------------------|-------------------------------------------------------|
| `RESEND_API_KEY`  | the API key from step 3                               |
| `RESEND_FROM`     | a verified sender, e.g. `Site Survey <survey@yourdomain.com>` |

Redeploy. If these two variables are absent, filing still works — the app just
skips sending the confirmation email (it never blocks or fails the survey).

## 6. Test

Open the deployed form, fill in a **Site Code** and **Surveyor**, add some
measurements, then tap **Review → Survey Complete**. Within a couple of seconds a
file should appear in `surveys/…` in the surveys repo, and Send & PDF unlock. The
Review screen shows “Filed to FASTSIGNS ✓”. Editing after completing updates the same
file; **Reopen to edit** re-locks Send & PDF until completed again.

---

### Notes
- **Offline:** filing needs a connection. If completed while offline, the survey
  files itself the moment the device is back online (Send & PDF still unlock
  immediately, and there's a **Retry now** link).
- **One record per survey:** each survey has a stable id, so re-files overwrite the
  same `surveys/<SITE>/<SITE>_<id>.html` instead of creating duplicates. Tapping
  **New site** starts a fresh record.
- **Photo size:** photos are embedded in the HTML snapshot, so a survey with many
  photos can be a few MB. That's fine for Git, but if you'd rather store photos as
  separate image files alongside the HTML, that's a small change — just ask.
- **Endpoint:** the form posts to `/.netlify/functions/submit-survey` (same origin).
  If you host the function elsewhere, change `SUBMIT_ENDPOINT` in `survey/review.jsx`.
- **My Surveys lookup:** reads `/.netlify/functions/list-surveys?email=…`, which
  walks the surveys repo's git tree and matches each record's `surveyorEmail`. Same
  GitHub env vars as filing — no extra setup needed beyond step 4.

---

## Planned dashboard improvements (not yet built)

### 1. Email notifications
Automated alerts to **leighane.dixon@fastsigns.com** and **david.campbell@fastsigns.com**
on dashboard events (new survey submitted, status change).
- Add both addresses to notification config — Netlify Site Settings → Notifications,
  or as env vars if routed through a backend mailer (SendGrid/Nodemailer/Resend).
- Decide trigger events: submission, new entry, export completed.
- Consider an admin UI field to manage recipients without a redeploy.

### 2. PDF export — flexible photo options
Export button becomes a dropdown with three options:
- **Download Full Survey (PDF)** — text, fields, metadata, embedded photos (current behavior).
- **Download Survey Only (PDF)** — text, fields, metadata; no images. Filename: `Survey_SiteID_Date.pdf`.
- **Download Photos (PDF)** — photos only, grouped under section-label headers (e.g.
  "Section: Exterior Signage", "Section: Interior — Lobby", "Section: Damaged Areas"),
  in the same order as the survey's sections. Header/footer carries survey ID, site
  name, and date. Filename: `Photos_SiteID_Date.pdf`.

Implementation: a PDF library with conditional rendering (pdf-lib, pdfmake, or
Puppeteer); section labels pull from the existing survey section/field names.
