
import type { Metadata, Viewport } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from 'next-themes';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-pt-sans',
});

export const metadata: Metadata = {
  title: 'BudgetFlow - Smart Expense Tracking & Financial Insights',
  description: 'Effortlessly manage your personal finances with BudgetFlow. Track expenses, set budgets, get AI-powered financial tips, and gain insights into your spending habits. Take control of your money today!',
  keywords: 'budgeting, expense tracker, personal finance, money management, financial planning, savings, AI finance, smart budget, budget app',
  manifest: '/manifest.json', // Added manifest link for PWA
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F0F4F7' }, // Light theme background
    { media: '(prefers-color-scheme: dark)', color: '#26292B' },  // Dark theme background (example)
  ],
  // Ensure other PWA-related viewport settings are appropriate
  initialScale: 1,
  width: 'device-width',
  // minimumScale: 1, // Usually not needed unless specific zooming behavior is desired
  // maximumScale: 1, // Can restrict user zooming, use with caution
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={ptSans.variable}>
      <head>
        {/* PWA specific meta tags for Apple devices */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BudgetFlow" />
        {/* The theme-color meta tag is often handled by next-pwa or derived from viewport config */}
        {/* <link rel="manifest" href="/manifest.json" /> /> Not needed here if specified in Metadata */}
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
