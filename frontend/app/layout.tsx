import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSync } from "@/components/auth-sync";
import { ELI5Provider } from "@/components/eli5/eli5-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoMLens — Human-Assisted AutoML Platform",
  description: "Transparent, leakage-safe automated machine learning with audit logging and SHAP explainability.",
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('automlens-theme');
    var isDark = stored === 'dark' || (!stored || stored === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${GeistSans.variable} ${GeistMono.variable}`}
        suppressHydrationWarning
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className="bg-canvas text-text-primary flex min-h-screen font-sans antialiased selection:bg-cyan-500/25 selection:text-cyan-200">
          <ThemeProvider>
            <ELI5Provider>
              <AuthSync />
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className="flex-1 p-4 sm:p-5 lg:p-6 overflow-y-auto">{children}</main>
              </div>
            </ELI5Provider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
