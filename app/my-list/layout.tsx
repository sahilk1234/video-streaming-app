import Navbar from "@/components/Navbar";

export default function MyListLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      {children}
    </div>
  );
}
