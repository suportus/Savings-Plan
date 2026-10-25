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
import { ChevronDown, Eye, EyeOff, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Currency } from "../backend";
import {
  useGetCallerUserProfile,
  useGetEmergencyFund,
  useUpdateEmergencyFund,
} from "../hooks/useQueries";

export default function EmergencyFundCard() {
  const { data: emergencyFund } = useGetEmergencyFund();
  const { data: userProfile } = useGetCallerUserProfile();
  const { mutate: updateEmergencyFund, isPending } = useUpdateEmergencyFund();

  const [isVisible, setIsVisible] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [adjustType, setAdjustType] = useState<"add" | "subtract">("add");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustTarget, setAdjustTarget] = useState<"bank" | "cash">("bank");

  const totalAmount =
    (emergencyFund?.bankAmount || 0) + (emergencyFund?.cashAmount || 0);

  // Use global currency from user profile
  const globalCurrency = userProfile?.defaultCurrency || Currency.usd;
  const currencySymbol = globalCurrency === Currency.eur ? "€" : "$";

  const handleAdjust = (type: "add" | "subtract") => {
    setAdjustType(type);
    setAdjustAmount("");
    setShowAdjustDialog(true);
  };

  const handleSubmitAdjustment = () => {
    const amount = Number.parseFloat(adjustAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      return;
    }

    if (!emergencyFund) return;

    const finalAmount = adjustType === "subtract" ? -amount : amount;

    let newBank = emergencyFund.bankAmount;
    let newCash = emergencyFund.cashAmount;

    if (adjustTarget === "bank") {
      newBank = Math.max(0, emergencyFund.bankAmount + finalAmount);
    } else {
      newCash = Math.max(0, emergencyFund.cashAmount + finalAmount);
    }

    updateEmergencyFund(
      { bank: newBank, cash: newCash },
      {
        onSuccess: () => {
          setShowAdjustDialog(false);
          setAdjustAmount("");
        },
      },
    );
  };

  return (
    <>
      <div className="card-premium border border-border rounded-lg p-6 transition-all duration-300">
        {/* Top row: icon + text content + visibility toggle */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="Emergency Fund"
              role="img"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">Emergency Fund</p>
            <p className="text-2xl font-bold text-main-title">
              {isVisible
                ? `${currencySymbol}${totalAmount.toLocaleString()}`
                : "****"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(!isVisible)}
            className="h-8 w-8 flex-shrink-0"
          >
            {isVisible ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Controls row: +/- buttons on left, chevron on right - aligned with text content */}
        <div className="flex items-center justify-between ml-[52px]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAdjust("add")}
              disabled={isPending}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-50"
              title="Add funds"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleAdjust("subtract")}
              disabled={isPending}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-50"
              title="Subtract funds"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Chevron toggle - same row, right-aligned */}
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-accent transition-all"
            title="Toggle breakdown"
          >
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showBreakdown ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Breakdown section - only rendered when expanded, appears below controls */}
        {showBreakdown && isVisible && (
          <div className="ml-[52px] mt-3 pt-3 border-t border-border">
            <div className="space-y-1 text-sm pr-8">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank:</span>
                <span className="font-medium">
                  {currencySymbol}
                  {(emergencyFund?.bankAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash:</span>
                <span className="font-medium">
                  {currencySymbol}
                  {(emergencyFund?.cashAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustType === "add" ? "Add to" : "Subtract from"} Emergency Fund
            </DialogTitle>
            <DialogDescription>
              Enter the amount to{" "}
              {adjustType === "add" ? "add to" : "subtract from"} your emergency
              fund.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={adjustTarget === "bank" ? "default" : "outline"}
                  onClick={() => setAdjustTarget("bank")}
                  className="flex-1"
                >
                  Bank
                </Button>
                <Button
                  type="button"
                  variant={adjustTarget === "cash" ? "default" : "outline"}
                  onClick={() => setAdjustTarget("cash")}
                  className="flex-1"
                >
                  Cash
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({currencySymbol})</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdjustDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAdjustment}
              disabled={
                !adjustAmount ||
                Number.parseFloat(adjustAmount) <= 0 ||
                isPending
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
