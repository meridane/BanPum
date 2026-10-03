import AdminNavbar from "@/components/admin/AdminNavbar";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AdminNavbar />
      {children}
    </>
  );
}
