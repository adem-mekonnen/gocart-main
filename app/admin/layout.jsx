// app/admin/layout.jsx (THIS IS A SERVER COMPONENT)
import AdminLayout from "@/components/admin/AdminLayout";
import AdminAuthWrapper from "@/components/admin/AdminAuthWrapper";

export const metadata = {
    title: "GoCart. - Admin",
    description: "GoCart. - Admin",
};

export default function RootAdminLayout({ children }) {
    return (
        <AdminAuthWrapper>
            <AdminLayout>
                {children}
            </AdminLayout>
        </AdminAuthWrapper>
    );
}