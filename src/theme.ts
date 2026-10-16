export const C = {
  bg: '#F4F5FB',
  card: '#FFFFFF',
  text: '#1B1E2B',
  sub: '#6B7088',
  faint: '#9AA0B8',
  line: '#E4E6F1',
  primary: '#4F46E5',
  primarySoft: '#E8E7FD',
  green: '#16A34A',
  greenSoft: '#DCFCE7',
  red: '#DC2626',
  redSoft: '#FEE2E2',
  amber: '#D97706',
  amberSoft: '#FEF3C7',
  blueSoft: '#DBEAFE',
  blue: '#2563EB',
};

export const SECTION_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export function colorFor(index: number): string {
  return SECTION_COLORS[Math.abs(index) % SECTION_COLORS.length];
}
