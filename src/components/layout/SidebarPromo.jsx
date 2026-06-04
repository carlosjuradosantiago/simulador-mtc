import sidebarPromo from '../../assets/reference/sidebar-promo.png';

export default function SidebarPromo() {
  return (
    <div className="mt-auto overflow-hidden rounded-xl bg-blue-500/20 ring-1 ring-white/10">
      <img src={sidebarPromo} alt="Constancia que te lleva lejos" className="h-auto w-full rounded-xl object-cover" />
    </div>
  );
}
