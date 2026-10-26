import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Fuel, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Variant_frontend_backend } from "../backend";
import {
  useClaimCycles,
  useGetCycleBalance,
  useGetFrontendCycleBalance,
  useGetWalletCycles,
} from "../hooks/useQueries";
import { getCanisterEnv } from "../lib/canisterEnv";
import { PrincipalDisplay } from "./PrincipalDisplay";

interface CyclesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Below this balance the dialog shows a warning (1 T cycles).
export const LOW_CYCLES_THRESHOLD = 1_000_000_000_000n;

// Fee the cycles ledger charges for each withdraw (100 M cycles).
const CYCLES_LEDGER_FEE = 100_000_000n;

function formatTrillions(cycles: bigint): string {
  const trillions = Number(cycles) / 1e12;
  return `${trillions.toLocaleString(undefined, { maximumFractionDigits: 3 })} T`;
}

// One balance line in the balance card. `null` means the balance can't be read.
function BalanceRow({
  label,
  balance,
  isLoading,
  isError,
  unavailableText,
}: {
  label: string;
  balance: bigint | null | undefined;
  isLoading: boolean;
  isError: boolean;
  unavailableText?: string;
}) {
  const isLow =
    balance !== undefined && balance !== null && balance < LOW_CYCLES_THRESHOLD;
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1 font-medium">{label}</p>
      {isLoading ? (
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      ) : isError || balance === undefined ? (
        <p className="text-sm text-destructive">Could not load the balance.</p>
      ) : balance === null ? (
        <p className="text-sm text-muted-foreground">{unavailableText}</p>
      ) : (
        <>
          <p
            className={`text-3xl font-bold ${isLow ? "text-destructive" : "text-foreground"}`}
          >
            {formatTrillions(balance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 break-all">
            {balance.toLocaleString()} cycles
          </p>
        </>
      )}
    </div>
  );
}

export default function CyclesModal({ open, onOpenChange }: CyclesModalProps) {
  const {
    data: balance,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGetCycleBalance(open);
  const {
    data: frontendBalance,
    isLoading: isLoadingFrontend,
    isError: isFrontendError,
    refetch: refetchFrontend,
    isFetching: isFetchingFrontend,
  } = useGetFrontendCycleBalance(open);
  const {
    data: walletCycles,
    isLoading: isLoadingWallet,
    isError: isWalletError,
    refetch: refetchWallet,
    isFetching: isFetchingWallet,
  } = useGetWalletCycles(open);
  const claimCycles = useClaimCycles();
  const { backendId, frontendId } = getCanisterEnv();
  const lowCanisters = [
    balance !== undefined && balance < LOW_CYCLES_THRESHOLD && "backend",
    frontendBalance != null &&
      frontendBalance < LOW_CYCLES_THRESHOLD &&
      "frontend",
  ].filter(Boolean);
  const canClaim =
    walletCycles !== undefined &&
    walletCycles > CYCLES_LEDGER_FEE &&
    !claimCycles.isPending;

  const handleClaim = async (target: Variant_frontend_backend) => {
    try {
      const moved = await claimCycles.mutateAsync(target);
      toast.success(`Moved ${formatTrillions(moved)} cycles to the ${target}`);
    } catch (error) {
      toast.error(`Move failed: ${String(error)}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg statistics-modal-glass border border-white/20 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Cycles
          </DialogTitle>
          <DialogDescription>
            Cycles are the fuel that keeps the app running. They are used up
            slowly by every action and by storing your data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="stat-card-glass rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg stat-icon-green flex items-center justify-center flex-shrink-0">
                <Fuel className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0 space-y-4">
                <BalanceRow
                  label="Backend balance"
                  balance={balance}
                  isLoading={isLoading}
                  isError={isError}
                />
                <BalanceRow
                  label="Frontend balance"
                  balance={frontendBalance}
                  isLoading={isLoadingFrontend}
                  isError={isFrontendError}
                  unavailableText="Not available: the backend is not a controller of the frontend."
                />
              </div>
              <Button
                onClick={() => {
                  refetch();
                  refetchFrontend();
                }}
                variant="ghost"
                size="icon"
                disabled={isFetching || isFetchingFrontend}
                aria-label="Refresh"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isFetching || isFetchingFrontend ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {lowCanisters.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>
                Low on cycles ({lowCanisters.join(" and ")})
              </AlertTitle>
              <AlertDescription>
                The balance is below {formatTrillions(LOW_CYCLES_THRESHOLD)}.
                When it runs out, the app stops working, and if it stays empty
                too long, it is deleted together with all data. Top it up soon.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Canister IDs</p>
            <div className="bg-muted/50 rounded-lg px-3 py-2 space-y-1">
              {backendId ? (
                <PrincipalDisplay principal={backendId} label="Backend" />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Backend: unknown
                </p>
              )}
              {frontendId ? (
                <PrincipalDisplay principal={frontendId} label="Frontend" />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Frontend: unknown
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/10 text-sm">
            <p className="font-medium">Top up from your wallet (Oisy)</p>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                1. In your wallet, send the <strong>Cycles</strong> token to the
                backend ID above.
              </p>
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>Send only Cycles, never ICP</AlertTitle>
                <AlertDescription>
                  ICP sent to this ID is locked and the app can't use it.
                </AlertDescription>
              </Alert>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                2. Cycles waiting to be moved:
              </p>
              <div className="flex items-center gap-2">
                {isLoadingWallet ? (
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                ) : isWalletError || walletCycles === undefined ? (
                  <p className="text-destructive">Could not load.</p>
                ) : (
                  <p className="text-xl font-bold text-foreground">
                    {formatTrillions(walletCycles)}
                  </p>
                )}
                <Button
                  onClick={() => refetchWallet()}
                  variant="ghost"
                  size="icon"
                  disabled={isFetchingWallet}
                  aria-label="Refresh"
                  title="Refresh"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isFetchingWallet ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                3. Move them onto a canister:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleClaim(Variant_frontend_backend.backend)}
                  disabled={!canClaim}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Move to backend
                </Button>
                <Button
                  onClick={() => handleClaim(Variant_frontend_backend.frontend)}
                  disabled={!canClaim}
                  variant="outline"
                >
                  Move to frontend
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Each move costs a small ledger fee (0.0001 T) and moves
                everything that is waiting.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
