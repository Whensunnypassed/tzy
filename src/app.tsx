import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import BaZiAnalyzerPage from "@/pages/BaZiAnalyzerPage/BaZiAnalyzerPage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<BaZiAnalyzerPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
