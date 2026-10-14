import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import BaZiAnalyzerPage from "@/pages/BaZiAnalyzerPage/BaZiAnalyzerPage";
import MemorialPage from "@/pages/MemorialPage/MemorialPage";
import MemorialMaoPage from "@/pages/MemorialMaoPage/MemorialMaoPage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<BaZiAnalyzerPage />} />
      </Route>
      <Route path="/memorial" element={<MemorialPage />} />
      <Route path="/memorial/mao" element={<MemorialMaoPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
