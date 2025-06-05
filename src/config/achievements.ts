
import type { Achievement, AchievementKey } from '@/types';
import { Award, Target } from 'lucide-react'; // Or other appropriate icons

export const ACHIEVEMENTS_CONFIG: Record<AchievementKey, Achievement> = {
  LOGIN_STREAK_7_DAYS: {
    key: 'LOGIN_STREAK_7_DAYS',
    name: 'Dedicated User',
    description: 'Logged in 7 days in a row.',
    icon: Award,
  },
  UNDER_BUDGET_ONE_MONTH: {
    key: 'UNDER_BUDGET_ONE_MONTH',
    name: 'Budget Master',
    description: 'Stayed under budget for a full month.',
    icon: Target,
  },
  // Add more achievements here
};
