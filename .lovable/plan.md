

## Switch to Your Own Supabase Project

Right now the app is connected to Lovable Cloud (the built-in managed backend). To move it to **your own** Supabase project, the connection has to be swapped first — then I'll re-push the auth schema there.

### Step 1 — You connect your Supabase project

I can't paste your Supabase URL / keys into the project manually — `src/integrations/supabase/client.ts` and `.env` are auto-generated files that get overwritten by Lovable's official Supabase integration. The only safe way to switch backends is through the built-in connector.

**How to connect (desktop):**
1. Top-right of the Lovable editor → click the green **Supabase** button
2. Click **Connect Supabase** → authorize Lovable
3. Pick the Supabase project you want to use

**How to connect (mobile):**
1. Tap the `…` button bottom-right → **Settings** → look for the Supabase / Cloud connector option, or use desktop for this step (easier)

Once connected, Lovable automatically:
- Replaces `.env` with your project's URL + anon key
- Regenerates `src/integrations/supabase/client.ts` to point at your project
- Disables Lovable Cloud (the two can't coexist)

> ⚠️ The auth tables I created earlier live in the Lovable Cloud database. They will **not** carry over to your Supabase. I'll re-create them in your project in Step 2.

### Step 2 — I push the auth schema to your Supabase

After you confirm the connection is swapped, I'll run a fresh migration against **your** Supabase that creates:

- `app_role` enum (`admin`, `user`)
- `profiles` table (id → auth.users, email, display_name, avatar_url, timestamps)
- `user_roles` table (user_id, role, unique pair)
- `has_role(_user_id, _role)` security-definer function
- `handle_new_user()` trigger on `auth.users` → auto-creates profile + assigns `user` role
- RLS policies on both tables (users see/edit own data; admins see all)

### Step 3 — You configure auth URLs in your Supabase dashboard

In your own Supabase dashboard → **Authentication → URL Configuration**:
- **Site URL**: `https://id-preview--60eb79be-fbed-4fb3-9966-70949558cb14.lovable.app` (and later your published/custom domain)
- **Redirect URLs**: add the same URL(s)

Optional: under **Authentication → Providers → Email**, turn off "Confirm email" if you want instant login during testing.

### Step 4 — Verify

The auth UI (`/auth` page, header login/logout) is already built and doesn't need to change — it'll automatically talk to your Supabase as soon as the client is repointed. We just sign up a test user and confirm the row appears in **your** Supabase → Table Editor → `profiles`.

### What you need to do right now

👉 Click the green **Supabase** button (top-right of the editor) and connect your project. Reply here once it's connected and I'll push the migration to your Supabase.

