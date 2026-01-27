/**
 * Walkthrough data types and mock data for testing
 */

// Building types enum
export enum EnumBuildingTypes {
  SINGLE_DWELLING = 'single-dwelling',
  MULTI_DWELLING = 'multi-dwelling',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
}

// Walkthrough IDs enum
export enum EnumWalkthroughIds {
  _9_9_9 = '9-9-9',
  _9_10_14 = '9-10-14',
  _9_10_15 = '9-10-15',
}

export interface WalkthroughInfo {
  title: string;
  description: string;
  subtitle: string;
}

export interface WalkthroughData {
  info: WalkthroughInfo;
}

export type WalkthroughsByBuildingType = {
  [key in EnumWalkthroughIds]?: WalkthroughData;
};

export type WalkthroughJSONDataType = {
  [key in EnumBuildingTypes]?: WalkthroughsByBuildingType;
};

/**
 * Mock walkthrough data for testing purposes
 */
export const WalkthroughJSONData: WalkthroughJSONDataType = {
  [EnumBuildingTypes.SINGLE_DWELLING]: {
    [EnumWalkthroughIds._9_9_9]: {
      info: {
        title: 'Smoke Alarms',
        description: 'Requirements for smoke alarms in single dwelling units',
        subtitle: 'Section 9.9.9',
      },
    },
    [EnumWalkthroughIds._9_10_14]: {
      info: {
        title: 'Carbon Monoxide Alarms',
        description: 'Requirements for carbon monoxide alarms',
        subtitle: 'Section 9.10.14',
      },
    },
    [EnumWalkthroughIds._9_10_15]: {
      info: {
        title: 'Fire Extinguishers',
        description: 'Requirements for fire extinguishers',
        subtitle: 'Section 9.10.15',
      },
    },
  },
};

/**
 * Hook to access walkthrough data
 */
export function useWalkthroughsData() {
  return {
    data: WalkthroughJSONData,
    isLoading: false,
    error: null,
  };
}
