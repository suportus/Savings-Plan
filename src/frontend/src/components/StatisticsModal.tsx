import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, TrendingUp, Target, Award, DollarSign, RotateCcw } from 'lucide-react';
import { useGetAllSavingGoals } from '../hooks/useQueries';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState, useEffect } from 'react';

interface StatisticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LifetimeStats {
  lifetimeGoalsCreated: number;
  lifetimeGoalsCompleted: number;
  lifetimeAmountSaved: number;
  biggestAchievement: number;
}

const STORAGE_KEY = 'savings-plan-lifetime-stats';

function getLifetimeStats(): LifetimeStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load lifetime stats:', error);
  }
  return {
    lifetimeGoalsCreated: 0,
    lifetimeGoalsCompleted: 0,
    lifetimeAmountSaved: 0,
    biggestAchievement: 0,
  };
}

function saveLifetimeStats(stats: LifetimeStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to save lifetime stats:', error);
  }
}

export function updateLifetimeStatsOnGoalCreated(): void {
  const stats = getLifetimeStats();
  stats.lifetimeGoalsCreated += 1;
  saveLifetimeStats(stats);
}

export function updateLifetimeStatsOnGoalCompleted(targetAmount: number): void {
  const stats = getLifetimeStats();
  stats.lifetimeGoalsCompleted += 1;
  stats.lifetimeAmountSaved += targetAmount;
  stats.biggestAchievement = Math.max(stats.biggestAchievement, targetAmount);
  saveLifetimeStats(stats);
}

export default function StatisticsModal({ open, onOpenChange }: StatisticsModalProps) {
  const { data: goals, isLoading } = useGetAllSavingGoals();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats>(getLifetimeStats());

  // Refresh stats when modal opens
  useEffect(() => {
    if (open) {
      setLifetimeStats(getLifetimeStats());
    }
  }, [open]);

  const handleResetStats = () => {
    const resetStats: LifetimeStats = {
      lifetimeGoalsCreated: 0,
      lifetimeGoalsCompleted: 0,
      lifetimeAmountSaved: 0,
      biggestAchievement: 0,
    };
    saveLifetimeStats(resetStats);
    setLifetimeStats(resetStats);
    setShowResetDialog(false);
  };

  const totalGoals = lifetimeStats.lifetimeGoalsCreated;
  const completedGoals = lifetimeStats.lifetimeGoalsCompleted;
  const successRate = totalGoals > 0 ? ((completedGoals / totalGoals) * 100).toFixed(1) : '0.0';
  const totalSaved = lifetimeStats.lifetimeAmountSaved;
  const biggestAchievement = lifetimeStats.biggestAchievement;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl statistics-modal-glass border border-white/20">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:pointer-events-none z-50"
          >
            <X className="h-5 w-5 text-foreground" />
            <span className="sr-only">Close</span>
          </button>

          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center mb-2 text-foreground">
              Statistics Center
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6 px-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Total Goals Created - Blue */}
                  <div className="stat-card-glass rounded-xl p-5 transition-all duration-300 hover:scale-105">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-lg stat-icon-blue flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-7 h-7 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground mb-1 font-medium">Total Goals Created</p>
                        <p className="text-4xl font-bold text-foreground">{totalGoals}</p>
                      </div>
                    </div>
                  </div>

                  {/* Completed Goals - Green */}
                  <div className="stat-card-glass rounded-xl p-5 transition-all duration-300 hover:scale-105">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-lg stat-icon-green flex items-center justify-center flex-shrink-0">
                        <Target className="w-7 h-7 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground mb-1 font-medium">Completed Goals</p>
                        <p className="text-4xl font-bold text-foreground">{completedGoals}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ({completedGoals}/{totalGoals} - {successRate}%)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Total Saved Amount - Purple */}
                  <div className="stat-card-glass rounded-xl p-5 transition-all duration-300 hover:scale-105">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-lg stat-icon-purple flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-7 h-7 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground mb-1 font-medium">Total Saved Amount</p>
                        <p className="text-3xl font-bold text-foreground break-words">
                          {totalSaved.toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          From completed goals
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Biggest Achievement - Orange */}
                  <div className="stat-card-glass rounded-xl p-5 transition-all duration-300 hover:scale-105">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-lg stat-icon-orange flex items-center justify-center flex-shrink-0">
                        <Award className="w-7 h-7 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground mb-1 font-medium">Biggest Achievement</p>
                        <p className="text-3xl font-bold text-foreground break-words">
                          {biggestAchievement.toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Largest completed goal
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reset Stats Button */}
                <div className="pt-4 border-t border-white/10">
                  <Button
                    onClick={() => setShowResetDialog(true)}
                    variant="outline"
                    className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Stats
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Statistics?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset all statistics? This will clear all your achievement data and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetStats}
              className="bg-destructive hover:bg-destructive/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
