import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { Overlays } from './components/Overlays';
import { Auth } from './screens/Auth';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { Explore } from './screens/Explore';
import { Messages } from './screens/Messages';
import { Profile } from './screens/Profile';
import { Notifications, Saved, TagFeed } from './screens/Lists';
import { PostDetail } from './screens/PostDetail';
import { Settings } from './screens/Settings';
import { useApp } from './store';

export function AppRoutes() {
  const { session } = useApp();

  if (!session) return <Auth />;
  if (!session.onboarded) return <Onboarding />;

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
