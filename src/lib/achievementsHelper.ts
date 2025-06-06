
'use server'; // Can be called from server actions or client components that handle server interactions

import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { Profile, UserAchievement, AchievementKey } from '@/types';
import { ACHIEVEMENTS_CONFIG } from '@/config/achievements';
import type { useToast } from '@/hooks/use-toast';
import { format, parseISO, isSameDay, subDays, startOfMonth } from 'date-fns';

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
  profile: Profile, // The profile object that was fetched or created by the caller
  toast: ToastFn
): Promise<Profile | null> { // Returns the potentially updated profile or null on critical failure
  if (!user || !profile) {
    console.warn("checkAndAwardLoginStreak called with null user or profile.");
    return null;
  }

  const today = new Date();
  const lastLoginDate = profile.last_login_at ? parseISO(profile.last_login_at) : null;
  let currentStreak = profile.login_streak_days || 0;
  let newStreak = currentStreak;

  if (lastLoginDate) {
    if (isSameDay(lastLoginDate, today)) {
      // Already logged in today, no change to streak
    } else if (isSameDay(lastLoginDate, subDays(today,1))) {
      newStreak = currentStreak + 1;
    } else { 
      newStreak = 1; // Reset streak due to gap
    }
  } else { 
    newStreak = 1; // First login or last_login_at was null
  }

  const { data: updatedProfileResult, error: profileUpdateDbError } = await supabase
    .from('profiles')
    .update({ 
      login_streak_days: newStreak, 
      last_login_at: format(today, "yyyy-MM-dd'T'HH:mm:ssXXX")
    })
    .eq('id', user.id) // Ensure we're targeting the correct profile ID based on the authenticated user
    .select()         // Select all columns from the updated row
    .maybeSingle();   // Use maybeSingle to handle cases where 0 rows are updated

  if (profileUpdateDbError) {
    // This catches actual database errors (permissions, network, etc.),
    // not "0 rows found" which maybeSingle handles by returning null.
    console.error(`Error updating profile for login streak (user ID: ${user.id}, profile ID: ${profile.id}). DB/Network issue:`, profileUpdateDbError);
    return null; // Indicates a fundamental failure to update.
  }

  if (!updatedProfileResult) {
    // This means the update statement ran successfully but found 0 rows matching user.id.
    // This indicates an inconsistency: the profile we thought existed was not found in the DB for update.
    if (user.id !== profile.id) {
        console.error(`CRITICAL: User ID (${user.id}) and Profile ID (${profile.id}) mismatch in checkAndAwardLoginStreak.`);
        return null; // Critical inconsistency, cannot proceed.
    }
    console.warn(`Profile with ID ${user.id} not found for login streak update, though profile object was passed. Data inconsistency? Returning original profile.`);
    // The DB state doesn't match the expected state (profile passed in).
    // The original 'profile' object is returned as it's the last known state from the caller, but it's not updated.
    return profile; 
  }

  // If we reach here, updatedProfileResult is the successfully updated profile data.
  const effectivelyUpdatedProfile = updatedProfileResult as Profile;

  if (effectivelyUpdatedProfile.login_streak_days && effectivelyUpdatedProfile.login_streak_days >= 7) {
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
  return effectivelyUpdatedProfile; // Return the *actually* updated profile from the DB.
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

  if (!isPastMonth(selectedMonth, selectedYear)) {
    return;
  }
  
  const achievementKey: AchievementKey = 'UNDER_BUDGET_ONE_MONTH';
  const alreadyUnlocked = (await getUnlockedAchievements(user.id)).includes(achievementKey);

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

