import type { SavingGoal } from '../backend';

/**
 * Calculates the monthly target amount for a goal using the same logic as GoalCard.
 * Returns null if the goal should not display a monthly target (no deadline, expired, or complete).
 */
export function calculateMonthlyTarget(goal: SavingGoal): number | null {
  const progress = (goal.currentSavedAmount / goal.targetAmount) * 100;
  const isComplete = progress >= 100;
  const hasDeadline = !!goal.deadline;

  // No monthly target if no deadline or already complete
  if (!hasDeadline || isComplete) {
    return null;
  }

  const deadline = new Date(Number(goal.deadline) / 1000000);
  const now = new Date();
  const isExpired = deadline <= now;

  // No monthly target if expired
  if (isExpired) {
    return null;
  }

  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentSavedAmount);
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const monthsRemaining = daysRemaining / 30.44; // Average days per month

  // Monthly target correction: if less than 1 month remaining, set to remaining amount
  if (monthsRemaining < 1 && monthsRemaining > 0) {
    return remainingAmount;
  } else if (monthsRemaining > 0) {
    return remainingAmount / monthsRemaining;
  } else {
    return 0;
  }
}

/**
 * Calculates the total monthly target across all goals that would display a monthly target.
 */
export function calculateTotalMonthlyTarget(goals: SavingGoal[]): number {
  return goals.reduce((sum, goal) => {
    const monthlyTarget = calculateMonthlyTarget(goal);
    return sum + (monthlyTarget ?? 0);
  }, 0);
}
