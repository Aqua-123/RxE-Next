import { ImageAdd01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/components/ui/alert-dialog";
import { Button } from "@/ui/components/ui/button";

export type SendRoute = "gold" | "host";

interface DialogState {
  file: File | null;
  route: SendRoute;
  sending: boolean;
  error: string | null;
}

export const imageDialog = createStore<DialogState>(() => ({
  file: null,
  route: "host",
  sending: false,
  error: null,
}));

export function openImageDialog(file: File, route: SendRoute): void {
  imageDialog.setState({ file, route, sending: false, error: null });
}

const close = () => imageDialog.setState({ file: null, sending: false, error: null });

export function AttachButton({ onFile }: { onFile(file: File): void }) {
  const picker = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Send an image"
        title="Send an image"
        onClick={() => picker.current?.click()}
        className="shrink-0 self-center text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={ImageAdd01Icon} />
      </Button>
      <input
        ref={picker}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </>
  );
}

function Preview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <img
      src={url}
      alt="What you are about to send"
      className="max-h-72 w-full rounded-lg bg-muted object-contain"
    />
  );
}

interface ImageDialogProps {
  onSend(file: File, route: SendRoute): Promise<void>;
  uploadsLeft(): number;
}

export function ImageDialog({ onSend, uploadsLeft }: ImageDialogProps) {
  const { file, route, sending, error } = useStore(imageDialog);
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (file) setLeft(uploadsLeft());
  }, [file, uploadsLeft]);

  const send = async () => {
    if (!file) return;
    imageDialog.setState({ sending: true, error: null });
    try {
      await onSend(file, route);
      close();
    } catch (reason) {
      imageDialog.setState({
        sending: false,
        error: reason instanceof Error ? reason.message : String(reason),
      });
    }
  };

  return (
    <AlertDialog open={file !== null} onOpenChange={(open) => !open && !sending && close()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Send image</AlertDialogTitle>
          <AlertDialogDescription>
            {route === "gold"
              ? "Sends with your Gold upload, so everyone in the chat sees the image."
              : "RxE users see the image. Everyone else gets a link they can paste into their browser. Anyone with the link can view it."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {file && <Preview file={file} />}
        {route === "host" && (
          <p className="text-muted-foreground text-xs">
            Location and camera details are removed before uploading. {left} of 50 uploads left in
            the next 3 hours.
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
          <Button onClick={send} disabled={sending || (route === "host" && left <= 0)}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
