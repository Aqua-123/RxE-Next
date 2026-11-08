import { Delete02Icon, Download04Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef, useState } from "react";
import { exportBackup, importBackup, resetEverything } from "@/core/backup";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/ui/components/ui/alert-dialog";
import { Button } from "@/ui/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { FieldError } from "@/ui/components/ui/field";
import { downloadText } from "@/ui/files";

export function BackupTab() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const download = async () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadText(`rxe-backup-${date}.json`, await exportBackup());
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      await importBackup(await file.text());
      setMessage({ kind: "ok", text: "Backup restored." });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Restore failed",
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>
            Your feature toggles, settings and custom themes, including uploaded wallpapers.
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={() => void download()}>
              <HugeiconsIcon icon={Download04Icon} data-icon="inline-start" />
              Download backup
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Restore</CardTitle>
          <CardDescription>Replaces your current RxE settings with a backup file.</CardDescription>
          <CardAction>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => void restore(event.currentTarget.files?.[0])}
            />
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <HugeiconsIcon icon={Upload04Icon} data-icon="inline-start" />
              Choose file
            </Button>
          </CardAction>
        </CardHeader>
      </Card>
      {message?.kind === "error" && <FieldError>{message.text}</FieldError>}
      {message?.kind === "ok" && <p className="text-sm text-success">{message.text}</p>}

      <Card size="sm">
        <CardHeader>
          <CardTitle>Reset</CardTitle>
          <CardDescription>
            Removes everything RxE stored in this browser and reloads the page.
          </CardDescription>
          <CardAction>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
                <HugeiconsIcon icon={Delete02Icon} data-icon="inline-start" />
                Reset RxE
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset RxE?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All RxE settings and custom themes in this browser will be deleted. Download a
                    backup first if you want to keep them.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => {
                      resetEverything();
                      location.reload();
                    }}
                  >
                    Reset and reload
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}
