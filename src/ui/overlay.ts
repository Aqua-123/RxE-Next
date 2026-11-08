import type { ReactNode } from "react";
import type { Scope } from "@/core/scope";
import { mount } from "./mount";

/** Mounts page-level RxE UI (dialogs, panels, toasts) once `<body>` exists. */
export function scopedOverlay(scope: Scope): (node: ReactNode) => void {
  return (node) => {
    const attach = () => scope.add(mount(node, document.body, "append"));
    if (document.body) {
      attach();
      return;
    }
    const onReady = () => attach();
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
    scope.add(() => document.removeEventListener("DOMContentLoaded", onReady));
  };
}
