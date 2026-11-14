import { TextStyle } from 'react-native';

const base: TextStyle = {
  fontFamily: 'Inter_400Regular',
};

export const Typography = {
  display: {
    ...base,
    fontSize: 30,
    lineHeight: 38,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  } as TextStyle,

  screenTitle: {
    ...base,
    fontSize: 24,
    lineHeight: 32,
    fontFamily: 'Inter_700Bold',
  } as TextStyle,

  sectionTitle: {
    ...base,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: 'Inter_600SemiBold',
  } as TextStyle,

  body: {
    ...base,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  } as TextStyle,

  bodyMedium: {
    ...base,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_500Medium',
  } as TextStyle,

  caption: {
    ...base,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter_500Medium',
  } as TextStyle,

  captionSmall: {
    ...base,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Inter_400Regular',
  } as TextStyle,

  metric: {
    ...base,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  } as TextStyle,

  metricLarge: {
    ...base,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  } as TextStyle,

  button: {
    ...base,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Inter_600SemiBold',
  } as TextStyle,

  tabLabel: {
    ...base,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Inter_500Medium',
  } as TextStyle,
} as const;
