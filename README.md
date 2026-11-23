# Quod accounts

This build adds email sign-in and private cloud workspaces to the Quod pilot. The existing pilot URL holds browser-local work. The account site is deployed on its own origin so testers can export their original work before moving it.

## Set up the account site

1. Create or choose a Supabase project. A free project is sufficient for testing. In the SQL editor apply `supabase/migrations/202611230001_workspace.sql` once, or apply it with the Supabase migration CLI. The migration creates the workspace table, access policy and revision-checked save operation. A signed-in user can only read and write their own workspace.
2. In Cloudflare Pages, connect this repository and select the branch containing this build. Use Node 24, the build command `npm run build` and output directory `dist`. The build needs `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the same Supabase project. The public key starts with `sb_publishable_`. Only these two public settings belong in this build.
3. In Supabase Authentication, enable email sign-in. Set Site URL to the deployed HTTPS origin and add its exact `/app.html` URL to the redirect allowlist. Cloudflare Pages serves HTML through extensionless routes, so also allow `/app`. Keep the default magic-link email template with `{{ .ConfirmationURL }}`.
4. To deliver links to pilot participants, configure custom SMTP in Supabase using your verified sending domain. Keep the SMTP password in Supabase. For an invite-only pilot, disable new signups and provision the permitted accounts before handing out the URL.
5. Verify delivery to a real test mailbox, open the link in the requesting browser, import a disposable pilot export, and sign in from another device to verify the saved project. Check the backup and retention settings for your chosen database plan before inviting people to rely on it.

Within Quod, **Account → Import pilot backup** accepts a JSON export from the original pilot and shows a preview. The site keeps unuploaded edits on the device. When two devices edit different versions of the same workspace, Quod offers a download of the device copy before loading the cloud copy. A clean device can open a newer version directly. The example uses separate browser storage.

## Local verification

Use Node 24 and run `npm ci`, then `npm test` for the PostgreSQL permissions and revision tests. With Chrome installed, run `npm run test:browser`. On platforms without Chrome at the default location, set `CHROME_PATH` to its executable. The browser tests start a temporary local service with synthetic accounts, exercise the real client library and build the web assets for that test origin. Run the production build with your real Supabase settings before deploying. The test service is never part of the output.
