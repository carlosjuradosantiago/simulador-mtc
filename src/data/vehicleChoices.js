import carImage from '../assets/vehicles/car-a1.webp';
import motorcycleImage from '../assets/vehicles/motorcycle-a2a.webp';
import truckImage from '../assets/vehicles/truck-heavy.webp';

export const fallbackLicenseCategories = [
  { id: 25, title: 'A-I', name: 'Licencia A-I', vehicle: 'Auto particular', shortLabel: 'Particular', description: 'Autos, camionetas y vehículos de uso particular.' },
  { id: 16, title: 'A-IIA', name: 'Licencia A-IIA', vehicle: 'Taxi y vehículo especial', shortLabel: 'Taxi y ambulancia', description: 'Taxi, turismo, transporte especial y vehículos de emergencia.' },
  { id: 17, title: 'A-IIB', name: 'Licencia A-IIB', vehicle: 'Microbús y camión mediano', shortLabel: 'Microbús y camión', description: 'Microbuses, minibuses y vehículos de carga medianos.' },
  { id: 18, title: 'A-IIIA', name: 'Licencia A-IIIA', vehicle: 'Ómnibus', shortLabel: 'Ómnibus', description: 'Ómnibus urbanos, interurbanos y articulados.' },
  { id: 19, title: 'A-IIIB', name: 'Licencia A-IIIB', vehicle: 'Camión y volquete', shortLabel: 'Camión y volquete', description: 'Camiones, remolcadores, volquetes y vehículos de carga pesada.' },
  { id: 20, title: 'A-IIIC', name: 'Licencia A-IIIC', vehicle: 'Ómnibus y camión pesado', shortLabel: 'Ómnibus + camión', description: 'Combina transporte pesado de personas y mercancías.' },
  { id: 22, title: 'B-IIA', name: 'Licencia B-IIA', vehicle: 'Bicimoto', shortLabel: 'Bicimoto', description: 'Bicimotos para uso particular o transporte de mercancías.' },
  { id: 23, title: 'B-IIB', name: 'Licencia B-IIB', vehicle: 'Motocicleta', shortLabel: 'Motocicleta', description: 'Motocicletas y sidecars para uso particular.' },
  { id: 24, title: 'B-IIC', name: 'Licencia B-IIC', vehicle: 'Mototaxi', shortLabel: 'Mototaxi', description: 'Trimotos para transporte de pasajeros o mercancías.' },
];

export const vehicleChoices = [
  {
    id: 'car',
    title: 'Auto',
    subtitle: 'Auto particular',
    categoryId: 25,
    categoryCode: 'A-I',
    categoryIds: [25, 16],
    image: carImage,
    imageAlt: 'Automóvil particular azul',
  },
  {
    id: 'motorcycle',
    title: 'Moto',
    subtitle: 'Motocicleta',
    categoryId: 23,
    categoryCode: 'B-IIB',
    categoryIds: [22, 23, 24],
    image: motorcycleImage,
    imageAlt: 'Motocicleta negra',
  },
  {
    id: 'heavy',
    title: 'Vehículo grande',
    subtitle: 'Camión o bus',
    categoryId: 19,
    categoryCode: 'A-IIIB',
    categoryIds: [17, 18, 19, 20],
    image: truckImage,
    imageAlt: 'Camión de carga blanco',
  },
];

export function getCategoryById(categories, categoryId) {
  const fallback = fallbackLicenseCategories.find((category) => String(category.id) === String(categoryId))
    ?? fallbackLicenseCategories[0];
  const category = categories.find((item) => String(item.id) === String(categoryId));

  return category
    ? { ...fallback, ...category, title: fallback.title, vehicle: fallback.vehicle, description: fallback.description }
    : fallback;
}

export function getVehicleChoice(categoryId) {
  return vehicleChoices.find((choice) => choice.categoryIds.includes(Number(categoryId))) ?? vehicleChoices[0];
}
