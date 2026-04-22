'use client'
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@clerk/nextjs";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { fetchProduct } from "@/lib/features/product/productSlice";
import { fetchCart, uploadCart } from "@/lib/features/cart/cartSlice";
import { fetchAddress } from "@/lib/features/address/addressSlice";

export default function PublicLayout({ children }) {
    const dispatch = useDispatch();
    const { isLoaded, userId, getToken } = useAuth();
    const cart = useSelector((state) => state.cart);

    // 1. Fetch products once on mount
    useEffect(() => {
        dispatch(fetchProduct({}));
    }, [dispatch]);

    // 2. Fetch cart from DB when user logs in
    useEffect(() => {
        if (isLoaded && userId) {
            dispatch(fetchCart({ getToken }));
            dispatch(fetchAddress({ getToken }));
        }
    }, [isLoaded, userId, dispatch]);

    // 3. Upload cart to DB whenever cart items or total changes
    useEffect(() => {
        if (isLoaded && userId) {
            const delayDebounceFn = setTimeout(() => {
                dispatch(uploadCart({ getToken }));
            }, 1000); // 1 second debounce to save Neon DB resources

            return () => clearTimeout(delayDebounceFn);
        }
    }, [cart, isLoaded, userId, dispatch]);
    return (
        <>
            <Banner />
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
