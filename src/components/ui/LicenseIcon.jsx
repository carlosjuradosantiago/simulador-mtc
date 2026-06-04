import { Bike, BusFront, Car, CarFront, Scooter, Truck } from 'lucide-react';

const iconMap = {
  A1: Bike,
  'A-I': Car,
  A2A: Scooter,
  'A-IIA': CarFront,
  A2B: Bike,
  'A-IIB': BusFront,
  A3A: Car,
  'A-IIIA': BusFront,
  A3B: BusFront,
  'A-IIIB': Truck,
  'A-IIIC': Truck,
  'B-IIA': Scooter,
  'B-IIB': Bike,
  'B-IIC': Scooter,
  default: Truck,
};

const colorMap = {
  emerald: 'text-emerald-600 bg-emerald-50',
  cyan: 'text-cyan-600 bg-cyan-50',
  blue: 'text-brand bg-blue-50',
  orange: 'text-warning bg-orange-50',
  violet: 'text-violet-600 bg-violet-50',
};

export default function LicenseIcon({ category, accent = 'blue', className = 'h-7 w-7' }) {
  const Icon = iconMap[category] ?? iconMap.default;

  return (
    <span className={`grid h-14 w-14 place-items-center rounded-full ${colorMap[accent]}`}>
      <Icon className={className} />
    </span>
  );
}
