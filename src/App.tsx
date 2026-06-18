import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import StationsPage from "@/pages/StationsPage";
import ChemicalsPage from "@/pages/ChemicalsPage";
import DispatchPage from "@/pages/DispatchPage";
import WastePage from "@/pages/WastePage";
import { useAppStore } from "@/store";

export default function App() {
  const initMockData = useAppStore((s) => s.initMockData);

  useEffect(() => {
    initMockData();
  }, [initMockData]);

  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stations" element={<StationsPage />} />
          <Route path="/chemicals" element={<ChemicalsPage />} />
          <Route path="/dispatch" element={<DispatchPage />} />
          <Route path="/waste" element={<WastePage />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}
