import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Dashboard />
      </main>
    </div>
  );
}
