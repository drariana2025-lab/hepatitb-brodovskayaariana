import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { FilterProvider } from "@/contexts/FilterContext";
import MainDashboard from "@/pages/MainDashboard";
import VaccinationPage from "@/pages/VaccinationPage";
import HealthcarePage from "@/pages/HealthcarePage";
import RiskFactorsPage from "@/pages/RiskFactorsPage";
import TablesPage from "@/pages/TablesPage";
import ChartsPage from "@/pages/ChartsPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function SpaRedirectHandler() {
  const redirect = sessionStorage.getItem('redirect');
  if (redirect) {
    sessionStorage.removeItem('redirect');
    return <Navigate to={redirect} replace />;
  }
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FilterProvider>
        <BrowserRouter>
          <SpaRedirectHandler />
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <AppSidebar />
              <div className="flex-1 flex flex-col">
                <header className="h-12 flex items-center border-b bg-card px-2">
                  <SidebarTrigger />
                  <span className="ml-3 text-sm font-medium text-muted-foreground">Hepatitis B Analytics</span>
                </header>
                <main className="flex-1 p-6 overflow-auto">
                  <Routes>
                    <Route path="/" element={<MainDashboard />} />
                    <Route path="/vaccination" element={<VaccinationPage />} />
                    <Route path="/healthcare" element={<HealthcarePage />} />
                    <Route path="/risk-factors" element={<RiskFactorsPage />} />
                    <Route path="/tables" element={<TablesPage />} />
                    <Route path="/charts" element={<ChartsPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </FilterProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;