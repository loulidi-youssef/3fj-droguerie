"use client";

import { useEffect } from "react";
import { useToast } from "@/components/toast-provider";

type AdminProductActionNotificationsProps = {
  successMessage: string;
  errorMessage: string;
};

export const AdminProductActionNotifications = ({
  successMessage,
  errorMessage,
}: AdminProductActionNotificationsProps) => {
  const { showToast } = useToast();

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    showToast(successMessage);
  }, [showToast, successMessage]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    showToast(errorMessage, { durationMs: 4200 });
  }, [errorMessage, showToast]);

  return null;
};
