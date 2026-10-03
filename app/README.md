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

## Design « Aurora »

Un seul dégradé (violet → rose → ambre) porte la marque ; le reste est fait de surfaces
calmes, de filets et de verre dépoli pour que les contenus restent au premier plan. Tout
passe par des tokens dans `src/index.css` : clair/sombre, cinq couleurs d'accent
(Paramètres → Apparence) et le dégradé se règlent au même endroit.

Nouveautés côté produit, toutes compatibles avec le schéma Supabase existant :

- **Reels immersifs** : double-tap pour aimer, commentaires en panneau sans quitter le flux,
  lecture/pause, son, barre de progression, raccourcis clavier.
- **Statuts (stories)** : création texte / photo / vidéo, anneaux vu / non vu, réponses et
  réactions envoyées en message privé. Le contenu riche est encodé dans la colonne `label`
  de `stories` (préfixe `fm1:`), aucune migration n'est nécessaire.
- **Recherche** : palette `⌘K` ou `/`, recherches récentes, onglets Comptes / Hashtags /
  Publications.
- **Hashtags et @mentions cliquables**, vrai partage natif et copie de lien, signalement
  réellement enregistré, déblocage depuis les Paramètres.
- **Composer** : brouillon automatique, suggestions de hashtags, glisser-déposer, compression
  des photos avant envoi.
- **Notifications** groupées par période avec filtres.
- Préférences d'appareil : couleur d'accent, lecture automatique, retour haptique.
- Invitations personnelles partageables et attribution facultative des nouvelles inscriptions.
- Mode économie de données : vidéos à la demande, sans lecture automatique.

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

## Déploiement (Cloudflare Workers)

`wrangler.jsonc` sert `dist/` en assets statiques avec repli SPA sur `index.html`.

- Depuis votre machine : `npx wrangler login` puis `npm run deploy`.
- En CI : `.github/workflows/deploy.yml` vérifie d'abord l'historique des migrations,
  applique uniquement la migration attendue, lance les tests et le build, puis déploie
  le Worker Cloudflare. Une divergence d'historique ou un secret manquant arrête le flux.
- Secrets GitHub Actions requis : `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`,
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_SUPABASE_URL` et l'un de
  `VITE_SUPABASE_PUBLISHABLE_KEY` ou `VITE_SUPABASE_ANON_KEY`.
- L'ancien workflow Pages reste disponible en déclenchement manuel uniquement ; il ne
  publie plus automatiquement sur `gh-pages` à chaque push.

Les variables `VITE_*` sont intégrées au bundle au moment du build : il faut donc
re-déployer après les avoir changées.

## Installation (PWA)

Le build génère un manifeste et un service worker (`vite-plugin-pwa`, stratégie
`autoUpdate`) : la coquille de l'app, les polices et les médias déjà vus sont mis en
cache, donc l'app se lance hors connexion.

- Android / Chrome / Edge : une bannière « Installer l'application » apparaît dès que le
  navigateur le permet, et l'entrée reste disponible dans Paramètres. Fermer la bannière
  la met en veille 7 jours.
- iOS / Safari : pas d'événement d'installation, l'app affiche donc la marche à suivre
  (Partager → « Sur l'écran d'accueil »).
- Icônes dans `public/` : 192, 512, une variante `maskable` et l'icône Apple.

L'installabilité exige HTTPS et une origine servie par un serveur — elle fonctionne sur
le déploiement Cloudflare, pas dans l'aperçu mono-fichier.

## Confidentialité, médias, temps réel

- **Comptes privés** : bascule dans Paramètres. Suivre un compte privé envoie une demande ;
  le destinataire l'accepte ou la refuse depuis ses notifications. Les publications d'un
  compte privé sont masquées côté interface *et* côté RLS.
- **Médias** : le composer et les pièces jointes acceptent de vrais fichiers. Avec Supabase
  ils partent dans le bucket `media` (lecture publique, écriture limitée au dossier de
  l'utilisateur) ; sans backend, un aperçu local le temps de la session.
- **Temps réel** : abonnements Postgres sur `messages`, `notifications` et `posts`. Un
  message entrant dans une conversation non silencieuse déclenche une notification
  navigateur si l'autorisation est accordée (Paramètres).
- **Éphémère / sourdine / recherche / transfert** : par conversation, dans le menu du fil.

## Layout rules from the design

- `wide` ≥ 1000px: sidebar instead of the bottom tab bar; the right rail appears ≥ 1280px.
- Messages is a mode, not a tab: it hides the app chrome and, when wide, splits into a
  372px conversation list plus the thread.
- Inside the phone frame the app measures itself against the frame box, not the window
  (`ViewportProvider`), which is what keeps the tab bar and composer on the right line.
