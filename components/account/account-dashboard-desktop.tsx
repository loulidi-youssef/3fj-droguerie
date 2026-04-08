"use client";

import {
  type AccountMenuKey,
  type LanguageCode,
} from "@/components/account/account-config";
import { AccountMenuDesktop } from "@/components/account/account-menu";
import { RecentHistoryList } from "@/components/account/recent-history-list";

type AccountDashboardDesktopProps = {
  email: string | null;
  activeKey: AccountMenuKey;
  selectedLanguage: LanguageCode;
  selectedLanguageLabel: string;
  onLanguageChange: (code: LanguageCode) => void;
  onLogout: () => void;
  isLoggingOut: boolean;
};

export const AccountDashboardDesktop = ({
  email,
  activeKey,
  selectedLanguage,
  selectedLanguageLabel,
  onLanguageChange,
  onLogout,
  isLoggingOut,
}: AccountDashboardDesktopProps) => {
  return (
    <div className="grid grid-cols-[minmax(0,44%)_minmax(0,56%)] gap-6 xl:gap-8">
      <RecentHistoryList />
      <AccountMenuDesktop
        email={email}
        activeKey={activeKey}
        selectedLanguage={selectedLanguage}
        selectedLanguageLabel={selectedLanguageLabel}
        onLanguageChange={onLanguageChange}
        onLogout={onLogout}
        isLoggingOut={isLoggingOut}
      />
    </div>
  );
};

