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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { SavingGoal } from "../backend";
import { Currency } from "../backend";
import {
  useAddToCurrentSavedAmount,
  useDeleteSavingGoal,
  useGetCallerUserProfile,
} from "../hooks/useQueries";
import { formatDateByCurrency } from "../lib/dateUtils";
import EditGoalDialog from "./EditGoalDialog";

interface GoalTableProps {
  goals: SavingGoal[];
}

export default function GoalTable({ goals }: GoalTableProps) {
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<SavingGoal | null>(null);
  const [quickAddGoal, setQuickAddGoal] = useState<SavingGoal | null>(null);
  const [quickAddAmount, setQuickAddAmount] = useState("");

  const { data: userProfile } = useGetCallerUserProfile();
  const { mutate: deleteGoal, isPending: isDeleting } = useDeleteSavingGoal();
  const { mutate: addAmount, isPending: isAdding } =
    useAddToCurrentSavedAmount();

  // Use global currency from user profile
  const globalCurrency = userProfile?.defaultCurrency || Currency.usd;
  const currencySymbol = globalCurrency === Currency.eur ? "€" : "$";

  const handleDelete = () => {
    if (deletingGoal) {
      deleteGoal(deletingGoal.id);
      setDeletingGoal(null);
    }
  };

  const handleQuickAdd = () => {
    if (!quickAddGoal) return;

    const amount = Number.parseFloat(quickAddAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      return;
    }

    addAmount(
      { id: quickAddGoal.id, amount },
      {
        onSuccess: () => {
          setQuickAddGoal(null);
          setQuickAddAmount("");
        },
      },
    );
  };

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Goal Name</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Saved</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Deadline/Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goals.map((goal, index) => {
              const progress =
                (goal.currentSavedAmount / goal.targetAmount) * 100;
              const isComplete = progress >= 100;
              const hasDeadline = !!goal.deadline;
              const _remainingAmount =
                goal.targetAmount - goal.currentSavedAmount;

              let formattedDeadline = "";
              let isExpired = false;

              if (hasDeadline) {
                const deadline = new Date(Number(goal.deadline) / 1000000);
                formattedDeadline = formatDateByCurrency(
                  deadline,
                  globalCurrency,
                );
                // Red Progress Bar Logic: currentDate >= deadlineDate and progress < 100%
                // Green Progress Bar Logic: progress >= 100% regardless of deadline
                isExpired = deadline <= new Date() && !isComplete;
              }

              return (
                <TableRow
                  key={goal.id}
                  className="table-row-entrance"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <TableCell className="font-medium">{goal.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium">
                      {goal.currency === Currency.eur ? "EUR" : "USD"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-emerald-500">
                    {currencySymbol}
                    {goal.currentSavedAmount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {currencySymbol}
                    {goal.targetAmount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={progress}
                        className={`progress-bar ${isExpired ? "expired" : ""}`}
                      />
                      <span className="text-xs font-medium text-muted-foreground w-12 text-right">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isComplete ? (
                      <span className="font-bold text-emerald-500 text-sm">
                        TARGET REACHED! 🏆
                      </span>
                    ) : hasDeadline ? (
                      <span
                        className={
                          isExpired ? "text-destructive font-semibold" : ""
                        }
                      >
                        {isExpired ? "DEADLINE EXCEEDED! ⚠️" : formattedDeadline}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">
                        No limit
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuickAddGoal(goal)}
                        title="Quick add amount"
                      >
                        <Plus className="h-4 w-4 text-emerald-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingGoal(goal)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeletingGoal(goal)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editingGoal && (
        <EditGoalDialog
          goal={editingGoal}
          open={!!editingGoal}
          onOpenChange={(open) => !open && setEditingGoal(null)}
        />
      )}

      <AlertDialog
        open={!!deletingGoal}
        onOpenChange={(open) => !open && setDeletingGoal(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Saving Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGoal?.name}"? This
              action cannot be undone.
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

      {quickAddGoal && (
        <Dialog
          open={!!quickAddGoal}
          onOpenChange={(open) => !open && setQuickAddGoal(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Quick Add to {quickAddGoal.name}</DialogTitle>
              <DialogDescription>
                Add an amount to your current savings. Remaining:{" "}
                {currencySymbol}
                {(
                  quickAddGoal.targetAmount - quickAddGoal.currentSavedAmount
                ).toFixed(2)}
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
                    max={
                      quickAddGoal.targetAmount -
                      quickAddGoal.currentSavedAmount
                    }
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
                  setQuickAddGoal(null);
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
      )}
    </>
  );
}
