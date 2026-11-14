/**
 * DAYCRAFT Consistency & Progress Calculation Utilities
 * Strictly implements the truthful mathematical formulas defined in the design specification.
 */

export interface HabitOccurrence {
  habitId: string;
  isPaused: boolean;
  status: 'done' | 'partial' | 'missed' | 'pending';
}

/**
 * Habit completion rate:
 * Completed eligible scheduled habits ÷ Total eligible scheduled habits × 100
 * Paused habits and dates before habit creation are excluded.
 */
export function calculateHabitCompletionRate(occurrences: HabitOccurrence[]): number {
  const eligible = occurrences.filter((o) => !o.isPaused);
  if (eligible.length === 0) return 0;

  const completed = eligible.filter((o) => o.status === 'done').length;
  return Math.round((completed / eligible.length) * 100);
}

/**
 * Gym consistency:
 * Completed planned workouts ÷ Planned workout sessions × 100
 * Rest days do not count as missed.
 */
export function calculateGymConsistency(completedWorkouts: number, plannedWorkouts: number): number {
  if (plannedWorkouts <= 0) return 0;
  return Math.round((completedWorkouts / plannedWorkouts) * 100);
}

/**
 * Academic consistency:
 * Days with a qualifying study session ÷ Days with a planned study target × 100
 */
export function calculateAcademicConsistency(studyDaysCount: number, plannedStudyDays: number): number {
  if (plannedStudyDays <= 0) return 0;
  return Math.round((studyDaysCount / plannedStudyDays) * 100);
}

/**
 * Overall consistency:
 * Completed eligible commitments ÷ Total eligible commitments × 100
 * Never silently removes missed days; never rewards trivial habits.
 */
export function calculateOverallConsistency(
  completedCommitments: number,
  totalEligibleCommitments: number
): number {
  if (totalEligibleCommitments <= 0) return 0;
  return Math.round((completedCommitments / totalEligibleCommitments) * 100);
}

/**
 * Streak calculation for habits:
 * Calculates consecutive active days meeting the target schedule.
 * Paused days do not break a streak.
 */
export function calculateStreak(dailyStatuses: Array<{ date: string; completed: boolean; isRestOrPaused: boolean }>): number {
  let streak = 0;
  // Iterate backwards from most recent
  for (let i = dailyStatuses.length - 1; i >= 0; i--) {
    const item = dailyStatuses[i];
    if (item.completed) {
      streak++;
    } else if (item.isRestOrPaused) {
      // Resting or paused day: streak is maintained, not broken
      continue;
    } else {
      // Missed active day: streak breaks
      break;
    }
  }
  return streak;
}
