export type AnimalType = 'GOAT' | 'SHEEP' | 'CATTLE' | 'PIG' | 'ALPACA' | 'OTHER';
export type AnimalGender = 'FEMALE' | 'MALE' | 'NEUTERED_MALE';

export interface AnimalConfig {
  animalType: AnimalType;

  // Display names
  singular: string;
  plural: string;
  singularCapitalized: string;
  pluralCapitalized: string;

  // Gender terms  (maps AnimalGender → display label)
  genderLabels: Record<AnimalGender, string>;

  // Breeding terminology
  breedingTerms: {
    femaleRole: string;      // "Doe", "Ewe", "Cow"
    maleRole: string;        // "Buck", "Ram", "Bull"
    offspringPlural: string; // "Kids", "Lambs", "Calves"
    offspringSingular: string;
    birthEventNoun: string;  // "Kidding", "Lambing", "Calving"
    pendingBirthAlert: string;
  };

  // Dashboard stat labels
  dashboardLabels: {
    totalLabel: string;
    femaleLabel: string;
    maleLabel: string;
    offspringThisYearLabel: string;
  };

  emoji: string;
  exportPrefix: string;
  breedPlaceholder: string;
  tagIdPlaceholder: string;
}

export const ANIMAL_CONFIGS: Record<AnimalType, AnimalConfig> = {
  GOAT: {
    animalType: 'GOAT',
    singular: 'goat',
    plural: 'goats',
    singularCapitalized: 'Goat',
    pluralCapitalized: 'Goats',
    genderLabels: { FEMALE: 'Doe', MALE: 'Buck', NEUTERED_MALE: 'Wether' },
    breedingTerms: {
      femaleRole: 'Doe',
      maleRole: 'Buck',
      offspringPlural: 'Kids',
      offspringSingular: 'Kid',
      birthEventNoun: 'Kidding',
      pendingBirthAlert: 'Kidding alert',
    },
    dashboardLabels: {
      totalLabel: 'Total Goats',
      femaleLabel: 'Does',
      maleLabel: 'Bucks',
      offspringThisYearLabel: 'Kids This Year',
    },
    emoji: '🐐',
    exportPrefix: 'goat',
    breedPlaceholder: 'e.g. Nubian',
    tagIdPlaceholder: 'e.g. GT-001',
  },
  SHEEP: {
    animalType: 'SHEEP',
    singular: 'sheep',
    plural: 'sheep',
    singularCapitalized: 'Sheep',
    pluralCapitalized: 'Sheep',
    genderLabels: { FEMALE: 'Ewe', MALE: 'Ram', NEUTERED_MALE: 'Wether' },
    breedingTerms: {
      femaleRole: 'Ewe',
      maleRole: 'Ram',
      offspringPlural: 'Lambs',
      offspringSingular: 'Lamb',
      birthEventNoun: 'Lambing',
      pendingBirthAlert: 'Lambing alert',
    },
    dashboardLabels: {
      totalLabel: 'Total Sheep',
      femaleLabel: 'Ewes',
      maleLabel: 'Rams',
      offspringThisYearLabel: 'Lambs This Year',
    },
    emoji: '🐑',
    exportPrefix: 'sheep',
    breedPlaceholder: 'e.g. Merino',
    tagIdPlaceholder: 'e.g. SH-001',
  },
  CATTLE: {
    animalType: 'CATTLE',
    singular: 'cow',
    plural: 'cattle',
    singularCapitalized: 'Cow',
    pluralCapitalized: 'Cattle',
    genderLabels: { FEMALE: 'Cow', MALE: 'Bull', NEUTERED_MALE: 'Steer' },
    breedingTerms: {
      femaleRole: 'Cow',
      maleRole: 'Bull',
      offspringPlural: 'Calves',
      offspringSingular: 'Calf',
      birthEventNoun: 'Calving',
      pendingBirthAlert: 'Calving alert',
    },
    dashboardLabels: {
      totalLabel: 'Total Cattle',
      femaleLabel: 'Cows',
      maleLabel: 'Bulls',
      offspringThisYearLabel: 'Calves This Year',
    },
    emoji: '🐄',
    exportPrefix: 'cattle',
    breedPlaceholder: 'e.g. Angus',
    tagIdPlaceholder: 'e.g. CT-001',
  },
  PIG: {
    animalType: 'PIG',
    singular: 'pig',
    plural: 'pigs',
    singularCapitalized: 'Pig',
    pluralCapitalized: 'Pigs',
    genderLabels: { FEMALE: 'Sow', MALE: 'Boar', NEUTERED_MALE: 'Barrow' },
    breedingTerms: {
      femaleRole: 'Sow',
      maleRole: 'Boar',
      offspringPlural: 'Piglets',
      offspringSingular: 'Piglet',
      birthEventNoun: 'Farrowing',
      pendingBirthAlert: 'Farrowing alert',
    },
    dashboardLabels: {
      totalLabel: 'Total Pigs',
      femaleLabel: 'Sows',
      maleLabel: 'Boars',
      offspringThisYearLabel: 'Piglets This Year',
    },
    emoji: '🐖',
    exportPrefix: 'pig',
    breedPlaceholder: 'e.g. Yorkshire',
    tagIdPlaceholder: 'e.g. PG-001',
  },
  ALPACA: {
    animalType: 'ALPACA',
    singular: 'alpaca',
    plural: 'alpacas',
    singularCapitalized: 'Alpaca',
    pluralCapitalized: 'Alpacas',
    genderLabels: { FEMALE: 'Female', MALE: 'Male', NEUTERED_MALE: 'Gelding' },
    breedingTerms: {
      femaleRole: 'Female',
      maleRole: 'Male',
      offspringPlural: 'Crias',
      offspringSingular: 'Cria',
      birthEventNoun: 'Birthing',
      pendingBirthAlert: 'Birth alert',
    },
    dashboardLabels: {
      totalLabel: 'Total Alpacas',
      femaleLabel: 'Females',
      maleLabel: 'Males',
      offspringThisYearLabel: 'Crias This Year',
    },
    emoji: '🦙',
    exportPrefix: 'alpaca',
    breedPlaceholder: 'e.g. Huacaya',
    tagIdPlaceholder: 'e.g. AL-001',
  },
  OTHER: {
    animalType: 'OTHER',
    singular: 'animal',
    plural: 'animals',
    singularCapitalized: 'Animal',
    pluralCapitalized: 'Animals',
    genderLabels: { FEMALE: 'Female', MALE: 'Male', NEUTERED_MALE: 'Neutered' },
    breedingTerms: {
      femaleRole: 'Female',
      maleRole: 'Male',
      offspringPlural: 'Offspring',
      offspringSingular: 'Offspring',
      birthEventNoun: 'Birth',
      pendingBirthAlert: 'Birth alert',
    },
    dashboardLabels: {
      totalLabel: 'Total Animals',
      femaleLabel: 'Females',
      maleLabel: 'Males',
      offspringThisYearLabel: 'Born This Year',
    },
    emoji: '🐾',
    exportPrefix: 'animal',
    breedPlaceholder: 'e.g. Mixed',
    tagIdPlaceholder: 'e.g. AN-001',
  },
};

export function getAnimalConfig(animalType: AnimalType | null | undefined): AnimalConfig {
  if (!animalType) return ANIMAL_CONFIGS.OTHER;
  return ANIMAL_CONFIGS[animalType] ?? ANIMAL_CONFIGS.OTHER;
}

/** When multiple herd types exist, returns a generic mixed config; otherwise the single type's config. */
export function getMixedConfig(types: AnimalType[]): AnimalConfig {
  const unique = [...new Set(types)];
  if (unique.length === 1) return getAnimalConfig(unique[0]);
  return ANIMAL_CONFIGS.OTHER;
}
