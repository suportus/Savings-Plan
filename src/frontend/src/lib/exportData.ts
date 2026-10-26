import type { Backend, SavingGoal } from "../backend";

// Readable date (YYYY-MM-DD) from a deadline in nanoseconds.
function deadlineToDate(deadline: bigint | undefined): string | null {
  if (deadline === undefined) return null;
  return new Date(Number(deadline / 1_000_000n)).toISOString().split("T")[0];
}

function goalToJson(goal: SavingGoal) {
  return {
    id: goal.id,
    name: goal.name,
    currency: goal.currency,
    targetAmount: goal.targetAmount,
    currentSavedAmount: goal.currentSavedAmount,
    deadline: deadlineToDate(goal.deadline),
  };
}

// Downloads all of the caller's data from the backend as a JSON file.
export async function downloadMyData(actor: Backend): Promise<void> {
  const [profile, goals, emergencyFund, statistics] = await Promise.all([
    actor.getCallerUserProfile(),
    actor.getAllSavingGoals(),
    actor.getEmergencyFund(),
    actor.getStatistics(),
  ]);

  const data = {
    app: "Savings Plan",
    exportedAt: new Date().toISOString(),
    profile,
    goals: goals.map(goalToJson),
    emergencyFund,
    statistics: statistics && {
      totalGoalsCreated: Number(statistics.totalGoalsCreated),
      completedGoals: Number(statistics.completedGoals),
      totalSavedAmount: statistics.totalSavedAmount,
      biggestAchievement: statistics.biggestAchievement,
    },
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `savings-plan-${new Date().toISOString().split("T")[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
