import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import Index from "./pages/Index.tsx";
import Courses from "./pages/Courses.tsx";
import CoursePage from "./pages/CoursePage.tsx";
import Team from "./pages/Team.tsx";
import Privacy from "./pages/Privacy.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Tools from "./pages/Tools.tsx";
import NotFound from "./pages/NotFound.tsx";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";

// Holds the lesson components and visualizers, which only lesson pages need.
const LessonPage = lazy(() => import("./pages/LessonPage.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" attribute="class">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/">
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:courseSlug" element={<CoursePage />} />
            <Route path="/courses/:courseSlug/:lessonSlug" element={
                <ChunkErrorBoundary>
                  <Suspense fallback={<div className="min-h-screen bg-background" />}>
                    <LessonPage />
                  </Suspense>
                </ChunkErrorBoundary>
              } />
            <Route path="/tools" element={<Tools />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/team" element={<Team />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
