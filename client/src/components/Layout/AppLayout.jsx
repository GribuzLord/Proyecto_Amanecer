import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <main className="p-6 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
