export interface ColorTokens {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  ink: string;
  inkMuted: string;
  line: string;

  // Gym — Orange
  orange: string;
  orangeDark: string;
  orangeSoft: string;

  // Academics — Green
  green: string;
  greenDark: string;
  greenSoft: string;

  // Status
  success: string;
  warning: string;
  danger: string;

  // Chart
  skillsChart: string;
  habitsChart: string;
  chartGrid: string;
  chartAxis: string;
}

export const LightColors: ColorTokens = {
  canvas: '#FFF8EF',
  surface: '#FFFFFF',
  surfaceMuted: '#F3E8DA',
  ink: '#202A3B',
  inkMuted: '#73716D',
  line: '#E8DDD0',

  // Gym — Orange
  orange: '#E87935',
  orangeDark: '#B94F16',
  orangeSoft: '#FCE7D6',

  // Academics — Green
  green: '#2F855A',
  greenDark: '#17633D',
  greenSoft: '#E1F1E5',

  // Status
  success: '#2F855A',
  warning: '#C58A28',
  danger: '#C64B43',

  // Chart
  skillsChart: '#54718C',
  habitsChart: '#C58A28',
  chartGrid: '#E8DDD0',
  chartAxis: '#73716D',
};

export const DarkColors: ColorTokens = {
  canvas: '#151A22',
  surface: '#202734',
  surfaceMuted: '#293344',
  ink: '#F7F3EC',
  inkMuted: '#B5B7BA',
  line: '#354052',

  // Gym — Orange (vivid for dark)
  orange: '#F28A45',
  orangeDark: '#E87935',
  orangeSoft: '#3D2A1A',

  // Academics — Green (vivid for dark)
  green: '#65B982',
  greenDark: '#2F855A',
  greenSoft: '#1A2E22',

  // Status
  success: '#65B982',
  warning: '#D4A84B',
  danger: '#E06B63',

  // Chart
  skillsChart: '#7A9AB8',
  habitsChart: '#D4A84B',
  chartGrid: '#354052',
  chartAxis: '#B5B7BA',
};
