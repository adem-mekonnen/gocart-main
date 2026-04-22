import StoreLayout from "@/components/store/StoreLayout";
import StoreAuthWrapper from "@/components/store/StoreAuthWrapper";

export const metadata = {
    title: "GoCart. - Store Dashboard",
    description: "GoCart. - Store Dashboard",
};

export default function RootStoreLayout({ children }) {
    return (
        <StoreAuthWrapper>
            <StoreLayout>
                {children}
            </StoreLayout>
        </StoreAuthWrapper>
    );
}