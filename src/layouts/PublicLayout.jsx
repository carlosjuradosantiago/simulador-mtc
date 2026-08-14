import { Outlet } from 'react-router-dom';
import PublicFooter from '../components/layout/PublicFooter.jsx';
import PublicHeader from '../components/layout/PublicHeader.jsx';

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-ink">
      <PublicHeader />
      <main className="flex-1"><Outlet /></main>
      <PublicFooter />
    </div>
  );
}
