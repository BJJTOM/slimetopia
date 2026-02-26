import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="web-page">
      <Header />
      <main className="relative z-10">{children}</main>
      <Footer />
    </div>
  );
}
