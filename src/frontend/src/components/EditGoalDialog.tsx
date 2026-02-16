import { useState, useEffect } from 'react';
import type { SavingGoal } from '../backend';
import { useUpdateSavingGoal } from '../hooks/useQueries';
import { Currency } from '../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EditGoalDialogProps {
  goal: SavingGoal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditGoalDialog({ goal, open, onOpenChange }: EditGoalDialogProps) {
  const [name, setName] = useState(goal.name);
  const [currency, setCurrency] = useState<'eur' | 'usd'>(goal.currency === Currency.eur ? 'eur' : 'usd');
  const [targetAmount, setTargetAmount] = useState(goal.targetAmount.toString());
  const [currentSavedAmount, setCurrentSavedAmount] = useState(goal.currentSavedAmount.toString());
  const [deadline, setDeadline] = useState('');
  const [noTimeLimit, setNoTimeLimit] = useState(!goal.deadline);

  const { mutate: updateGoal, isPending } = useUpdateSavingGoal();

  useEffect(() => {
    if (goal.deadline) {
      const deadlineDate = new Date(Number(goal.deadline) / 1000000);
      setDeadline(deadlineDate.toISOString().split('T')[0]);
      setNoTimeLimit(false);
    } else {
      setDeadline('');
      setNoTimeLimit(true);
    }
  }, [goal.deadline]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let deadlineNanoseconds: bigint | undefined = undefined;
    
    if (!noTimeLimit && deadline) {
      const deadlineDate = new Date(deadline);
      deadlineNanoseconds = BigInt(deadlineDate.getTime()) * BigInt(1000000);
    }

    updateGoal(
      {
        id: goal.id,
        data: {
          name,
          currency: currency === 'eur' ? Currency.eur : Currency.usd,
          targetAmount: parseFloat(targetAmount),
          currentSavedAmount: parseFloat(currentSavedAmount),
          deadline: deadlineNanoseconds,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Saving Goal</DialogTitle>
          <DialogDescription>
            Update your saving goal details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Goal Name *</Label>
            <Input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-currency">Currency *</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as 'eur' | 'usd')} disabled={isPending}>
                <SelectTrigger id="edit-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD ($)</SelectItem>
                  <SelectItem value="eur">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-deadline">Deadline {!noTimeLimit && '*'}</Label>
              <Input
                id="edit-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={minDate}
                required={!noTimeLimit}
                disabled={isPending || noTimeLimit}
                className="disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="edit-noTimeLimit"
              checked={noTimeLimit}
              onCheckedChange={setNoTimeLimit}
              disabled={isPending}
            />
            <Label htmlFor="edit-noTimeLimit" className="cursor-pointer">
              No time limit
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-targetAmount">Target Amount *</Label>
              <Input
                id="edit-targetAmount"
                type="number"
                step="0.01"
                min="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-currentSavedAmount">Current Saved *</Label>
              <Input
                id="edit-currentSavedAmount"
                type="number"
                step="0.01"
                min="0"
                value={currentSavedAmount}
                onChange={(e) => setCurrentSavedAmount(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
