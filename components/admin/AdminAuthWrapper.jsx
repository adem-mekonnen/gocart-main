// components/admin/AdminAuthWrapper.jsx (THIS IS A CLIENT COMPONENT)
'use client';

import { useUser, SignIn } from "@clerk/nextjs";

export default function AdminAuthWrapper({ children }) {
    const { isSignedIn, isLoaded } = useUser();

    if (!isLoaded) return null;

    if (!isSignedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <SignIn fallbackRedirectUrl="/admin" routing="hash" />
            </div>
        );
    }

    return <>{children}</>;
}