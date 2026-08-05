import Navbar from './Navbar';
import Sidebar from './Sidebar';

/**
 * Standard signed-in page frame: sidebar on desktop, navbar on mobile.
 * `width` is the max width of the content column.
 */
export default function AppShell({ children, width = 'max-w-5xl' }) {
  return (
    <div className="min-h-screen hero-bg flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <div className="md:hidden"><Navbar /></div>
        <main className={`${width} mx-auto px-4 py-10`}>{children}</main>
      </div>
    </div>
  );
}
