import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, X } from "lucide-react";
import { useState } from "react";
import { SiX } from "react-icons/si";
import { toast } from "sonner";

interface AboutShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The address this app is served from (the frontend canister URL).
const APP_URL = `${window.location.origin}/`;

export default function AboutShareModal({
  open,
  onOpenChange,
}: AboutShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleFollowX = () => {
    window.open("https://x.com/suportus", "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md about-modal-glass border-about-modal">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">
            Savings Plan
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6 px-4">
          <p className="text-center text-muted-foreground max-w-sm leading-relaxed">
            Your personal financial assistant for tracking virtual saving
            buckets. Securely built and hosted on the Internet Computer
            blockchain.
          </p>

          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <p className="text-sm text-center text-muted-foreground break-all px-2 font-mono">
              {APP_URL}
            </p>

            <Button
              onClick={handleCopyLink}
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>

          <Button
            onClick={handleFollowX}
            variant="outline"
            size="lg"
            className="w-full max-w-sm border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white font-medium transition-colors"
          >
            <SiX className="w-4 h-4 mr-2" />
            Follow me on X
          </Button>

          <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border w-full mt-2">
            © 2026. Built with ❤️ using{" "}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-600 transition-colors underline-offset-2 hover:underline"
            >
              caffeine.ai
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
