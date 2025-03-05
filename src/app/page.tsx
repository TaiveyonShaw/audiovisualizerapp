// src/app/page.tsx
import DataVisualization from '@/components/DataVisualization';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Data Visualization</h1>
      <DataVisualization />
    </main>
  );
}