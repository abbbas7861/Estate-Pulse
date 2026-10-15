import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageView } from '../../types/crm';

interface AppLayoutProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  leadCount: number;
  globalSearch: string;
  onGlobalSearchChange: (val: string) => void;
  onOpenNewTransaction: () => void;
  onOpenSettingsModal: (tab: 'support' | 'settings') => void;
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
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        leadCount={leadCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenSettingsModal={onOpenSettingsModal}
      />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          globalSearch={globalSearch}
          onGlobalSearchChange={onGlobalSearchChange}
          onOpenNewTransaction={onOpenNewTransaction}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="relative pt-16 flex-1 bg-[#f8f9ff]">
          <div className="w-full max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
