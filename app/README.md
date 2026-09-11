# Facemash

React implementation of the Claude Design handoff in `../project` — a short-video social
app with a WhatsApp-style messaging mode, in French and English, dark by default.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Two entry points:

- `/` — the app: Pour toi feed, Abonnements, Explorer, Messages, profils, notifications.
- `/mobile` — the same app running at true scale inside an iPhone 402 × 874 frame.

## Modes

Without Supabase credentials the app runs on seeded demo data held in `localStorage`,
including the simulated replies, delivery receipts and calls from the prototype. This is
what "Entrer avec le compte de démonstration" gives you.

With `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set (see `.env.example`), sign-up and
sign-in go through Supabase Auth and every read and write targets the `facemash` schema —
posts, comments, likes, saves, reposts, follows, blocks, threads, messages, reactions,
channels, stories, notifications and settings. Migrations live in `../supabase/migrations`.
A signed-in account gets no simulated replies: the other side of a conversation is a real
row or nothing.

## Layout rules from the design

- `wide` ≥ 1000px: sidebar instead of the bottom tab bar; the right rail appears ≥ 1280px.
- Messages is a mode, not a tab: it hides the app chrome and, when wide, splits into a
  372px conversation list plus the thread.
- Inside the phone frame the app measures itself against the frame box, not the window
  (`ViewportProvider`), which is what keeps the tab bar and composer on the right line.
