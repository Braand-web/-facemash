import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { Brand } from './components/ui';
import { Overlays } from './components/Overlays';
import { useApp } from './store';
import { demoMode, hasBackend } from './lib/supabase';

const Auth = lazy(() => import('./screens/Auth').then(({ Auth }) => ({ default: Auth })));
const Onboarding = lazy(() => import('./screens/Onboarding').then(({ Onboarding }) => ({ default: Onboarding })));
const Home = lazy(() => import('./screens/Home').then(({ Home }) => ({ default: Home })));
const Explore = lazy(() => import('./screens/Explore').then(({ Explore }) => ({ default: Explore })));
const Messages = lazy(() => import('./screens/Messages').then(({ Messages }) => ({ default: Messages })));
const Profile = lazy(() => import('./screens/Profile').then(({ Profile }) => ({ default: Profile })));
const Notifications = lazy(() => import('./screens/Lists').then(({ Notifications }) => ({ default: Notifications })));
const Saved = lazy(() => import('./screens/Lists').then(({ Saved }) => ({ default: Saved })));
const TagFeed = lazy(() => import('./screens/Lists').then(({ TagFeed }) => ({ default: TagFeed })));
const PostDetail = lazy(() => import('./screens/PostDetail').then(({ PostDetail }) => ({ default: PostDetail })));
const Settings = lazy(() => import('./screens/Settings').then(({ Settings }) => ({ default: Settings })));

function StatusNotice({ title, body, action }: { title: string; body: string; action?: { label: string; onClick: () => void } }) {
  return (
    <main className="auth-screen" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section className="auth-card" role="status" style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
        <div style={{ marginBottom: 22 }}>
          <Brand size={30} />
        </div>
        {!action && <span className="spinner" style={{ width: 26, height: 26, color: 'var(--accent)', margin: '0 auto 18px' }} />}
        <h1 className="display" style={{ margin: '0 0 10px', fontSize: 23, fontWeight: 800, letterSpacing: '-0.035em' }}>{title}</h1>
        <p style={{ margin: 0, color: 'var(--ink3)', fontSize: 14.5, lineHeight: 1.6 }}>{body}</p>
        {action && (
          <button className="btn btn-primary btn-lg btn-block" onClick={action.onClick} style={{ marginTop: 22 }}>
            {action.label}
          </button>
        )}
      </section>
    </main>
  );
}

export function AppRoutes() {
  const { session, authReady, syncing, accountError, retryAccount, t } = useApp();
  const loadingFallback = <StatusNotice title={t.authLoading} body={t.authLoadingBody} />;

  if (!hasBackend && !demoMode) {
    return <StatusNotice title={t.backendUnavailableTitle} body={t.backendUnavailableBody} />;
  }
  if (!authReady) return <StatusNotice title={t.authLoading} body={t.authLoadingBody} />;
  if (session?.authId && !syncing) {
    if (accountError) {
      return (
        <StatusNotice
          title={t.accountErrorTitle}
          body={t.accountErrorBody}
          action={{ label: t.retry, onClick: retryAccount }}
        />
      );
    }
    return <StatusNotice title={t.accountLoadingTitle} body={t.accountLoadingBody} />;
  }

  if (!session) {
    return (
      <Suspense fallback={loadingFallback}>
        <Auth />
      </Suspense>
    );
  }
  if (!session.onboarded) {
    return (
      <Suspense fallback={loadingFallback}>
        <Onboarding />
      </Suspense>
    );
  }

  return (
    <>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/following" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:kind/:id" element={<Messages />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/tag/:tag" element={<TagFeed />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Overlays />
    </>
  );
}
