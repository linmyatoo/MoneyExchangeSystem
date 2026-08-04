'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import {
  Loader2, LayoutDashboard, Users, LogOut, Settings, Wallet, ArrowLeftRight, CreditCard, DollarSign, LineChart, FileText, Lock, ShieldAlert, Menu
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { label: 'Users', href: '/dashboard/users', icon: Users, roles: ['admin'] },
  { label: 'Wallets', href: '/dashboard/wallets', icon: Wallet, roles: ['admin'] },
  { label: 'Transactions', href: '/dashboard/wallet-transactions', icon: ArrowLeftRight, roles: ['admin', 'staff'] },
  { label: 'Credits', href: '/dashboard/credits', icon: CreditCard, roles: ['admin', 'staff'] },
  { label: 'THB Exchange', href: '/dashboard/thb-exchange', icon: DollarSign, roles: ['admin', 'staff'] },
  { label: 'Exchange Rates', href: '/dashboard/exchange-rates', icon: LineChart, roles: ['admin', 'staff'] },
  { label: 'Reports', href: '/dashboard/reports', icon: FileText, roles: ['admin'] },
  { label: 'Cash Register', href: '/dashboard/cash-register', icon: Lock, roles: ['admin'] },
  { label: 'Audit Log', href: '/dashboard/audit-logs', icon: ShieldAlert, roles: ['admin'] },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['admin'] },
];

export default function ProtectedLayout({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role.name)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 px-4">
        <h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-gray-600 text-center">
          You do not have the required permissions to view this page.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role.name));

  const SidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <span className="text-xl font-bold text-blue-600">EMS</span>
        <span className="ml-2 text-xs font-medium text-gray-400 uppercase">Dashboard</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-700">
              {user.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
            <p className="text-xs text-gray-500 truncate">{user.role.name}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-gray-400 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
        {SidebarContent}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 gap-4">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 flex flex-col">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              {SidebarContent}
            </SheetContent>
          </Sheet>
          <h2 className="text-lg font-semibold text-gray-800 truncate">
            {filteredNav.find((n) => n.href === pathname)?.label || 'Dashboard'}
          </h2>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
