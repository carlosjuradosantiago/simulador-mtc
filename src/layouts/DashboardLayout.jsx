import { Outlet } from 'react-router-dom';
import Topbar from '../components/layout/Topbar.jsx';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-white">
      <Topbar />
      <main className="pb-[72px] lg:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
