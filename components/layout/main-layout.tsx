'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calculator } from 'lucide-react';
import Link from 'next/link';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
  headerActions?: ReactNode;
}

export function MainLayout({
  children,
  title = "Trading Plans",
  subtitle,
  showBackButton = false,
  backHref = "/",
  backLabel = "Back to Plans",
  headerActions
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Logo/Brand and Navigation */}
            <div className="flex items-center gap-1 sm:gap-4">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground cursor-pointer p-1 sm:p-2"
                >
                  <Link href={backHref}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">{backLabel}</span>
                  </Link>
                </Button>
              )}
              
              <div className="flex items-center gap-1 sm:gap-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  <span className="font-semibold text-sm sm:text-lg hidden md:inline">Binance Futures Calculator</span>
                  <span className="font-semibold text-sm sm:text-lg md:hidden">Calculator</span>
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {headerActions}
            </div>
          </div>
        </div>
      </header>

      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6">
          <div className="flex flex-col gap-1 sm:gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground text-xs sm:text-sm md:text-base">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-3 sm:py-6">
        {children}
      </main>
    </div>
  );
}