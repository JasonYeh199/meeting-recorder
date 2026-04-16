// Mobile-first layout — no desktop sidebar, full-screen safe area
export default function RecorderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-white">
      {children}
    </div>
  );
}
