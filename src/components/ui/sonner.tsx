"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      richColors
      closeButton
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "font-sans",
        },
      }}
      {...props}
    />
  );
}
