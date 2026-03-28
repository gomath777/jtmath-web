export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="admin-root"
      style={{
        // Override dark-mode CSS variables for admin (light theme)
        ['--foreground' as string]: '222 47% 11%',       // slate-900
        ['--card-foreground' as string]: '222 47% 11%',
        ['--popover-foreground' as string]: '222 47% 11%',
        ['--background' as string]: '210 20% 98%',       // #F8F9FA
        ['--card' as string]: '0 0% 100%',               // white
        ['--popover' as string]: '0 0% 100%',
        ['--input' as string]: '214 32% 91%',            // slate-200
        ['--border' as string]: '214 32% 91%',
        ['--muted-foreground' as string]: '215 16% 47%', // slate-500
        color: '#0f172a',
      }}
    >
      {children}
    </div>
  );
}
