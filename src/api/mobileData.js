import phonesData from './phones.json';

export const phones = phonesData;

export const FEATURE_CONFIG = {
  price:       { label: 'Price',           unit: '₹',    min: 3000,    max: 200000, step: 1000 },
  battery:     { label: 'Battery',         unit: 'mAh',  min: 2000,    max: 10000,  step: 100  },
  screen:      { label: 'Screen',          unit: '"',    min: 4.0,     max: 8.0,    step: 0.1  },
  storage:     { label: 'Storage',         unit: 'GB',   min: 32,      max: 1024,   step: 32   },
  ram:         { label: 'RAM',             unit: 'GB',   min: 2,       max: 18,     step: 1    },
  processor:   { label: 'Processor',       unit: 'GHz',  min: 1.0,     max: 3.5,    step: 0.1  },
  camera:      { label: 'Camera',          unit: 'MP',   min: 8,       max: 200,    step: 2    },
  charging:    { label: 'Charging',        unit: 'W',    min: 10,      max: 240,    step: 5    },
  performance: { label: 'Performance',     unit: '/10',  min: 1,       max: 10,     step: 0.1  },
  quality:     { label: 'Build Quality',   unit: '/10',  min: 1,       max: 10,     step: 0.1  },
  sound:       { label: 'Sound',           unit: '/10',  min: 1,       max: 10,     step: 0.1  },
  design:      { label: 'Design',          unit: '/10',  min: 1,       max: 10,     step: 0.1  },
  network:     { label: 'Network/5G',      unit: '/10',  min: 1,       max: 10,     step: 0.1  },
  software:    { label: 'Software',        unit: '/10',  min: 1,       max: 10,     step: 0.1  },
  build:       { label: 'Durability',      unit: '/10',  min: 1,       max: 10,     step: 0.1  },
};

export const ALL_FEATURES = Object.keys(FEATURE_CONFIG);
