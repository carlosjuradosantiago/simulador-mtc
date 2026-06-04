import { Outlet } from 'react-router-dom';
import Footer from '../components/layout/Footer.jsx';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-white">
      <Outlet />
      <Footer />
    </div>
  );
}
