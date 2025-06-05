
'use server'; // Can be called from server actions or client components that handle server interactions

import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { Profile, UserAchievement, AchievementKey } from '@/types';
import { ACHIEVEMENTS_CONFIG } from '@/config/achievements';
import type { useToast } from '@/hooks/use-toast';
import { format, parseISO, isSameDay, isYesterday, subDays, startOfMonth, endOfMonth } from 'date-fns';

type ToastFn = ReturnType<typeof useToast>['toast'];

async function getUnlockedAchievements(userId: string): Promise<AchievementKey[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('achievement_key')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching unlocked achievements:', error);
    return [];
  }
  return data.map(a => a.achievement_key as AchievementKey);
}

async function awardAchievement(userId: string, achievementKey: AchievementKey, metadata?: Record<string, any>): Promise<boolean> {
  const { error } = await supabase
    .from('user_achievements')
    .insert([{ user_id: userId, achievement_key: achievementKey, metadata: metadata }]);

  if (error) {
    if (error.code === '23505') { // Unique violation, achievement already exists
      return false; // Not newly awarded
    }
    console.error(`Error awarding achievement ${achievementKey}:`, error);
    return false;
  }
  return true; // Newly awarded
}

export async function checkAndAwardLoginStreak(
  user: User,
  profile: Profile,
  toast: ToastFn
): Promise<Profile | null> {
  if (!user || !profile) return null;

  const today = new Date();
  const lastLoginDate = profile.last_login_at ? parseISO(profile.last_login_at) : null;
  let currentStreak = profile.login_streak_days || 0;
  let newStreak = currentStreak;

  if (lastLoginDate) {
    if (isSameDay(lastLoginDate, today)) {
      // Already logged in today, no change to streak from this specific login event
      // but we still update last_login_at to the current time if needed for other purposes
    } else if (isSameDay(lastLoginDate, subDays(today,1))) { // isYesterday deprecated, use subDays
      newStreak = currentStreak + 1;
    } else { // Gap in logins
      newStreak = 1; // Reset streak
    }
  } else { // First login ever or last_login_at was null
    newStreak = 1;
  }

  // Update profile with new streak and last login date
  const { data: updatedProfile, error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ 
      login_streak_days: newStreak, 
      last_login_at: format(today, "yyyy-MM-dd'T'HH:mm:ssXXX") // ISO 8601 format
    })
    .eq('id', user.id)
    .select()
    .single();
  
  if (profileUpdateError) {
    console.error('Error updating profile for login streak:', profileUpdateError);
    return null; // Or return the original profile
  }

  if (newStreak >= 7) {
    const achievementKey: AchievementKey = 'LOGIN_STREAK_7_DAYS';
    const alreadyUnlocked = (await getUnlockedAchievements(user.id)).includes(achievementKey);
    if (!alreadyUnlocked) {
      const awarded = await awardAchievement(user.id, achievementKey);
      if (awarded) {
        const achievementConfig = ACHIEVEMENTS_CONFIG[achievementKey];
        toast({
          title: '🏆 Achievement Unlocked!',
          description: `${achievementConfig.name}: ${achievementConfig.description}`,
        });
      }
    }
  }
  return updatedProfile as Profile || profile; // return updated or original on error
}


function isPastMonth(month: number, year: number): boolean {
  const currentDate = new Date();
  const firstDayOfSelectedMonth = new Date(year, month, 1);
  const firstDayOfCurrentMonth = startOfMonth(currentDate);
  return firstDayOfSelectedMonth < firstDayOfCurrentMonth;
}

export async function checkAndAwardUnderBudgetMonth(
  user: User,
  totalSpentForMonth: number,
  budgetThreshold: number | null,
  selectedMonth: number, // 0-indexed
  selectedYear: number,
  toast: ToastFn
) {
  if (!user || budgetThreshold === null || totalSpentForMonth >= budgetThreshold) {
    return;
  }

  // Check only for past, completed months
  if (!isPastMonth(selectedMonth, selectedYear)) {
    return;
  }
  
  const achievementKey: AchievementKey = 'UNDER_BUDGET_ONE_MONTH';
  const alreadyUnlocked = (await getUnlockedAchievements(user.id)).includes(achievementKey);

  // For this prototype, "UNDER_BUDGET_ONE_MONTH" is a one-time achievement.
  // A more advanced system might track metadata for month/year and allow multiple unlocks or tiered achievements.
  if (!alreadyUnlocked) {
      const awarded = await awardAchievement(user.id, achievementKey, { month: selectedMonth + 1, year: selectedYear });
      if (awarded) {
        const achievementConfig = ACHIEVEMENTS_CONFIG[achievementKey];
        toast({
          title: '🏆 Achievement Unlocked!',
          description: `${achievementConfig.name}: ${achievementConfig.description}`,
        });
      }
  }
}
