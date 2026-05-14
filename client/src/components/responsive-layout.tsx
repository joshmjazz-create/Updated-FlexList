import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLocation } from "wouter";
import logoImage from "@assets/file_00000000293061f5b6c62d71c7ed0c97_1754724182356.png";

interface ResponsiveLayoutProps {
  sidebar: (closeSidebar: () => void) => React.ReactNode;
  children: React.ReactNode;
}

export default function ResponsiveLayout({ sidebar, children }: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setLocation] = useLocation();

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex safe-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-80 md:flex-col shrink-0 border-r bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        {sidebar(() => {})}
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-white dark:bg-gray-900 shadow-lg transition-transform duration-300 md:hidden safe-top safe-bottom ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar(closeSidebar)}
      </aside>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col safe-screen">
        {/* Mobile Header */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 px-4 py-3 md:hidden safe-top">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 shrink-0"
            aria-label="Toggle collections"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center justify-between w-full min-w-0">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <img
                  src={logoImage}
                  alt="FlexList"
                  className="w-6 h-6 object-contain opacity-100"
                />
              </div>

              <h1
                className="text-lg font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                onClick={() => setLocation('/')}
              >
                FlexList
              </h1>
            </div>

            <div className="shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 pt-4 md:pt-8 safe-bottom">
          {children}
        </div>
      </main>
    </div>
  );
}