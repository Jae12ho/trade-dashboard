import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <div className="min-h-screen gradient-bg">
      <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        <Dashboard />
      </main>
    </div>
  );
}
