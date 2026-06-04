import DrivingIllustration from './DrivingIllustration.jsx';
import dashboardHeroScene from '../../assets/reference/dashboard-hero-scene.png';
import { BRAND_NAME } from '../../data/brand.js';

export default function RoadScene({ compact = false }) {
  return (
    <div className={`relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-blue-100 via-sky-50 to-white ${compact ? 'h-36' : 'h-full min-h-36'}`}>
      {compact ? (
        <DrivingIllustration className="absolute inset-0 h-full w-full" />
      ) : (
        <img src={dashboardHeroScene} alt={`Escena vial de ${BRAND_NAME}`} className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  );
}
