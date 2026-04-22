'use client';

import { useAuth, SignIn } from "@clerk/nextjs";

export default function StoreAuthWrapper({ children }) {
    const { isLoaded, isSignedIn } = useAuth();

    // While loading, you might want to show a spinner or nothing
    if (!isLoaded) return null;

    return (
        <>
            {isSignedIn ? (
                children
            ) : (
                <div className="min-h-screen flex items-center justify-center">
                    <SignIn fallbackRedirectUrl="/store" routing="hash" />
                </div>
            )}
        </>
    );
}