import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TeamChatModal } from '../Modals/TeamChatModal';
import { PageView } from '../../types/crm';

interface AppLayoutProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  leadCount: number;
  globalSearch: string;
  onGlobalSearchChange: (val: string) => void;
  onOpenNewTransaction: () => void;
  onOpenSettingsModal: (tab: 'support' | 'settings') => void;
  onOpenProfileSettings?: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onNavigate,
  leadCount,
  globalSearch,
  onGlobalSearchChange,
  onOpenNewTransaction,
  onOpenSettingsModal,
  onOpenProfileSettings,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)]">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        leadCount={leadCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenSettingsModal={onOpenSettingsModal}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          globalSearch={globalSearch}
          onGlobalSearchChange={onGlobalSearchChange}
          onOpenNewTransaction={onOpenNewTransaction}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenProfileSettings={onOpenProfileSettings}
          onOpenChat={() => setIsChatOpen(true)}
        />
        <main className="flex-1 pt-16 overflow-y-auto bg-[var(--bg-main)] text-[var(--text-main)]">
          {children}
        </main>
      </div>
      <TeamChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};
