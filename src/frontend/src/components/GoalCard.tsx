import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Calendar, Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SavingGoal } from "../backend";
import { Currency } from "../backend";
import {
  useAddToCurrentSavedAmount,
  useDeleteSavingGoal,
  useGetCallerUserProfile,
} from "../hooks/useQueries";
import { formatDateByCurrency } from "../lib/dateUtils";
import { calculateMonthlyTarget } from "../utils/monthlyTarget";
import EditGoalDialog from "./EditGoalDialog";
import { updateLifetimeStatsOnGoalCompleted } from "./StatisticsModal";

interface GoalCardProps {
  goal: SavingGoal;
}

// Load canvas-confetti from CDN
declare global {
  interface Window {
    confetti?: any;
  }
}

export default function GoalCard({ goal }: GoalCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
  const [quickAddAmount, setQuickAddAmount] = useState("");
  const [confettiLoaded, setConfettiLoaded] = useState(false);

  const { data: userProfile } = useGetCallerUserProfile();

  // Track previous progress to detect threshold crossing
  const previousProgressRef = useRef<number | null>(null);
  // Track if we're in the middle of a user-triggered update
  const isUserActionRef = useRef(false);

  const { mutate: deleteGoal, isPending: isDeleting } = useDeleteSavingGoal();
  const { mutate: addAmount, isPending: isAdding } =
    useAddToCurrentSavedAmount();

  const progress = (goal.currentSavedAmount / goal.targetAmount) * 100;
  const isComplete = progress >= 100;

  // Use global currency from user profile
  const globalCurrency = userProfile?.defaultCurrency || Currency.usd;
  const currencySymbol = globalCurrency === Currency.eur ? "€" : "$";

  const hasDeadline = !!goal.deadline;

  // Calculate deadline-related values only if deadline exists
  let deadline: Date | null = null;
  let formattedDeadline = "";
  let isExpired = false;
  let daysRemaining = 0;
  let remainingAmount = Math.max(
    0,
    goal.targetAmount - goal.currentSavedAmount,
  );
  let isUrgent = false;

  // Use shared utility for monthly target calculation
  const monthlyTarget = calculateMonthlyTarget(goal);

  if (hasDeadline) {
    deadline = new Date(Number(goal.deadline) / 1000000);
    formattedDeadline = formatDateByCurrency(deadline, globalCurrency);
    const now = new Date();
    // Red Progress Bar Logic: currentDate >= deadlineDate and progress < 100%
    // Green Progress Bar Logic: progress >= 100% regardless of deadline
    isExpired = deadline <= now && !isComplete;
    daysRemaining = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Check urgency: deadline < 30 days and progress < 90% (only if not expired)
    isUrgent =
      daysRemaining < 30 && daysRemaining > 0 && progress < 90 && !isExpired;
  }

  // Load canvas-confetti library
  useEffect(() => {
    if (typeof window !== "undefined" && !window.confetti) {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js";
      script.async = true;
      script.onload = () => setConfettiLoaded(true);
      document.head.appendChild(script);
    } else if (window.confetti) {
      setConfettiLoaded(true);
    }
  }, []);

  // Detect progress threshold crossing and trigger confetti only on user action
  useEffect(() => {
    // Initialize previous progress on first render (don't trigger confetti)
    if (previousProgressRef.current === null) {
      previousProgressRef.current = progress;
      return;
    }

    // Check if progress crossed 100% threshold during a user action
    const crossedThreshold =
      previousProgressRef.current < 100 && progress >= 100;

    if (
      crossedThreshold &&
      isUserActionRef.current &&
      confettiLoaded &&
      window.confetti
    ) {
      // Update lifetime statistics
      updateLifetimeStatsOnGoalCompleted(goal.targetAmount);

      // Trigger confetti celebration
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        window.confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        window.confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      // Reset user action flag after triggering
      isUserActionRef.current = false;
    }

    // Update previous progress
    previousProgressRef.current = progress;
  }, [progress, confettiLoaded, goal.targetAmount]);

  const handleDelete = () => {
    deleteGoal(goal.id);
    setShowDeleteDialog(false);
  };

  const handleQuickAdd = () => {
    const amount = Number.parseFloat(quickAddAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      return;
    }

    // Mark that a user action is happening
    isUserActionRef.current = true;

    addAmount(
      { id: goal.id, amount },
      {
        onSuccess: () => {
          setShowQuickAddDialog(false);
          setQuickAddAmount("");
        },
        onError: () => {
          // Reset flag if action fails
          isUserActionRef.current = false;
        },
      },
    );
  };

  return (
    <>
      <Card className="card-premium border border-border hover:border-emerald-500/50 transition-all duration-300 group flex flex-col h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl text-main-title group-hover:text-emerald-500 transition-colors">
              {goal.name}
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setShowQuickAddDialog(true)}
                title="Quick add amount"
              >
                <Plus className="h-4 w-4 text-emerald-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2 flex-1 flex flex-col justify-start gap-2">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-emerald-500">
                {progress.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={progress}
              className={`progress-bar ${isExpired ? "expired" : ""}`}
            />
          </div>

          {/* Amount display - simplified when complete */}
          {isComplete ? (
            <div className="flex flex-col items-center justify-center py-2">
              <p className="text-xs text-muted-foreground mb-1">Target</p>
              <p className="text-3xl font-bold text-target-amount">
                {currencySymbol}
                {goal.targetAmount.toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 py-2">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Saved</p>
                <p className="text-base font-bold text-saved-amount">
                  {currencySymbol}
                  {goal.currentSavedAmount.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">To Go</p>
                <p className="text-base font-bold text-to-go-amount">
                  {currencySymbol}
                  {remainingAmount.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Target</p>
                <p className="text-base font-bold text-target-amount">
                  {currencySymbol}
                  {goal.targetAmount.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Monthly Target or Target Reached - only show if monthly target exists */}
          {monthlyTarget !== null && (
            <div className="pt-2 border-t border-border flex items-center justify-center">
              <div className="flex items-center justify-between text-sm w-full">
                <span className="text-muted-foreground">Monthly Target</span>
                <span className="font-semibold text-monthly-target">
                  {currencySymbol}
                  {monthlyTarget.toFixed(2)}/month
                </span>
              </div>
            </div>
          )}

          {/* Target Reached - show when complete and has deadline but not expired */}
          {hasDeadline && !isExpired && isComplete && (
            <div className="pt-2 border-t border-border flex items-center justify-center">
              <div className="text-center py-1">
                <span className="text-lg font-bold text-emerald-500">
                  TARGET REACHED! 🏆
                </span>
              </div>
            </div>
          )}

          {/* Target Reached for goals without deadline */}
          {!hasDeadline && isComplete && (
            <div className="pt-2 border-t border-border flex items-center justify-center">
              <div className="text-center py-1">
                <span className="text-lg font-bold text-emerald-500">
                  TARGET REACHED! 🏆
                </span>
              </div>
            </div>
          )}

          {/* Deadline info - only show if deadline exists - pushed to bottom with margin-top: auto */}
          {hasDeadline && (
            <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {isExpired ? (
                  <span className="text-destructive font-semibold">
                    DEADLINE EXCEEDED! ⚠️
                  </span>
                ) : (
                  <span
                    className={
                      isUrgent
                        ? "text-orange-500 font-semibold"
                        : "text-muted-foreground"
                    }
                  >
                    {daysRemaining} days left
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {formattedDeadline}
              </div>
            </div>
          )}

          {/* No deadline indicator - only show when not complete - pushed to bottom */}
          {!hasDeadline && !isComplete && (
            <div className="flex items-center justify-center pt-2 border-t border-border mt-auto">
              <span className="text-sm text-muted-foreground italic">
                No time limit
              </span>
            </div>
          )}

          {/* Spacer for consistent height when no deadline and complete - pushed to bottom */}
          {!hasDeadline && isComplete && (
            <div className="pt-2 border-t border-border opacity-0 pointer-events-none mt-auto">
              <span className="text-sm">Spacer</span>
            </div>
          )}
        </CardContent>
      </Card>

      <EditGoalDialog
        goal={goal}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Saving Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{goal.name}"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showQuickAddDialog} onOpenChange={setShowQuickAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Add to {goal.name}</DialogTitle>
            <DialogDescription>
              Add an amount to your current savings. Remaining: {currencySymbol}
              {remainingAmount.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quickAddAmount">Amount to Add</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  id="quickAddAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingAmount}
                  value={quickAddAmount}
                  onChange={(e) => setQuickAddAmount(e.target.value)}
                  className="pl-8"
                  placeholder="0.00"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleQuickAdd();
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowQuickAddDialog(false);
                setQuickAddAmount("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickAdd}
              disabled={
                isAdding ||
                !quickAddAmount ||
                Number.parseFloat(quickAddAmount) <= 0
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isAdding ? "Adding..." : "Add Amount"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
