"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      closeButton
      richColors
      position="top-right"
      duration={3500}
      toastOptions={{
        classNames: {
          toast: "font-sans",
        },
      }}
    />
  );
}
