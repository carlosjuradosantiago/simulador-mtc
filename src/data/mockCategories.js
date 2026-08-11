import { fallbackLicenseCategories } from './vehicleChoices.js';

export const licenseCategories = fallbackLicenseCategories.map((category, index) => ({
  ...category,
  progress: 0,
  accent: ['emerald', 'cyan', 'blue', 'orange', 'violet'][index % 5],
}));

export const futureCategories = ['Categorías profesionales adicionales'];
