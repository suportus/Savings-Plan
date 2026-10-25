import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Currency } from "../backend";
import {
  useCreateSavingGoal,
  useGetCallerUserProfile,
} from "../hooks/useQueries";
import { updateLifetimeStatsOnGoalCreated } from "./StatisticsModal";

interface CreateGoalFormProps {
  onClose: () => void;
}

export default function CreateGoalForm({ onClose }: CreateGoalFormProps) {
  const { data: userProfile } = useGetCallerUserProfile();
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentSavedAmount, setCurrentSavedAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [noTimeLimit, setNoTimeLimit] = useState(false);

  const { mutate: createGoal, isPending } = useCreateSavingGoal();

  // Get currency from user profile
  const currency =
    userProfile?.defaultCurrency === Currency.eur ? "eur" : "usd";
  const currencySymbol = currency === "eur" ? "€" : "$";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let deadlineNanoseconds: bigint | undefined = undefined;

    if (!noTimeLimit && deadline) {
      const deadlineDate = new Date(deadline);
      deadlineNanoseconds = BigInt(deadlineDate.getTime()) * BigInt(1000000);
    }

    createGoal(
      {
        name,
        currency: currency === "eur" ? Currency.eur : Currency.usd,
        targetAmount: Number.parseFloat(targetAmount),
        currentSavedAmount: Number.parseFloat(currentSavedAmount),
        deadline: deadlineNanoseconds,
      },
      {
        onSuccess: () => {
          // Update lifetime statistics
          updateLifetimeStatsOnGoalCreated();
          onClose();
        },
      },
    );
  };

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" onClick={onClose} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <Card className="border-emerald-500/20 shadow-sm transition-colors duration-300">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Saving Goal</CardTitle>
          <CardDescription>
            Set up a new financial goal to track your savings progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Goal Name (full width) */}
            <div className="space-y-2">
              <Label htmlFor="name">Goal Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Emergency Fund, Vacation, New Car"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isPending}
                className="border-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Row 2: Deadline (left) and No time limit toggle (right) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline {!noTimeLimit && "*"}</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={minDate}
                  required={!noTimeLimit}
                  disabled={isPending || noTimeLimit}
                  className="border-emerald-500/20 focus:border-emerald-500 disabled:opacity-50 h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="noTimeLimit" className="block">
                  No time limit
                </Label>
                <div className="flex items-center h-10">
                  <Switch
                    id="noTimeLimit"
                    checked={noTimeLimit}
                    onCheckedChange={setNoTimeLimit}
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Target Amount (left) and Current Saved Amount (right) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount">
                  Target Amount ({currencySymbol}) *
                </Label>
                <Input
                  id="targetAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="10000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  required
                  disabled={isPending}
                  className="border-emerald-500/20 focus:border-emerald-500 h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentSavedAmount">
                  Current Saved Amount ({currencySymbol}) *
                </Label>
                <Input
                  id="currentSavedAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={currentSavedAmount}
                  onChange={(e) => setCurrentSavedAmount(e.target.value)}
                  required
                  disabled={isPending}
                  className="border-emerald-500/20 focus:border-emerald-500 h-10"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Goal"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
