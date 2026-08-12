import { useEffect, useMemo, useState } from "react";
import { Download, Share } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

export const PWAInstallPrompt = () => {
  const { user, isLoading } = useAuth();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const isIOS = useMemo(
    () => /iphone|ipad|ipod/i.test(window.navigator.userAgent),
    [],
  );

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (isLoading || !user || isStandalone()) {
      setOpen(false);
      return;
    }

    const dismissedKey = `carboscan:pwa-install-dismissed:${user.id}`;
    if (sessionStorage.getItem(dismissedKey)) return;

    // iOS ne fournit pas beforeinstallprompt : les instructions sont donc
    // affichées dès la connexion. Les autres navigateurs attendent de nous
    // signaler que l'application est effectivement installable.
    if (isIOS || installEvent) setOpen(true);
  }, [installEvent, isIOS, isLoading, user]);

  const closePrompt = () => {
    if (user) {
      sessionStorage.setItem(`carboscan:pwa-install-dismissed:${user.id}`, "1");
    }
    setOpen(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallEvent(null);
      setOpen(false);
    } else {
      closePrompt();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closePrompt()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl p-5 sm:p-6">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 sm:mx-0">
            <Download className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <DialogTitle>Installer CarboScan</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Accédez plus rapidement à votre tableau de bord depuis l’écran d’accueil de votre téléphone.
          </DialogDescription>
        </DialogHeader>

        {isIOS ? (
          <div className="rounded-lg border bg-muted/50 p-4 text-sm leading-relaxed">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <Share className="h-4 w-4 text-primary" aria-hidden="true" />
              Sur iPhone ou iPad
            </p>
            <p className="mt-2 text-muted-foreground">
              Appuyez sur <strong>Partager</strong>, puis sur <strong>Sur l’écran d’accueil</strong>.
            </p>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button variant="outline" onClick={closePrompt}>
            Plus tard
          </Button>
          {!isIOS && installEvent ? (
            <Button onClick={install}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Installer maintenant
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
