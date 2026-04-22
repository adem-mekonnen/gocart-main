'use client'
import { assets } from "@/assets/assets"
import { useEffect, useState, useCallback } from "react" 
import Image from "next/image"
import toast from "react-hot-toast"
import Loading from "@/components/Loading"
import { useUser, useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import axios from "axios"

export default function CreateStore() {
    const { user, isLoaded: userLoaded } = useUser()
    const router = useRouter()
    
    const { getToken, isLoaded: authLoaded } = useAuth()

    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const[status, setStatus] = useState("")
    const [loading, setLoading] = useState(true)
    const[message, setMessage] = useState("")
    
    // State for the image preview URL to prevent memory leaks
    const [previewUrl, setPreviewUrl] = useState(null) 

    const[storeInfo, setStoreInfo] = useState({
        name: "",
        username: "",
        description: "",
        email: "",
        contact: "",
        address: "",
        image: null 
    })

    const onChangeHandler = (e) => {
        setStoreInfo({ ...storeInfo, [e.target.name]: e.target.value })
    }

    // Handle Image Change & Image Preview securely
    const onImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setStoreInfo({ ...storeInfo, image: file });
            // Create a preview URL and clean up the old one to save memory
            if (previewUrl) URL.revokeObjectURL(previewUrl); 
            setPreviewUrl(URL.createObjectURL(file));
        }
    }

    // Wrapped in useCallback to prevent infinite loops in useEffect
    const fetchSellerStatus = useCallback(async () => {
        if (typeof getToken !== "function") return;

        try {
            const token = await getToken();
            const { data } = await axios.get("/api/store/create", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (data.status) {
                setStatus(data.status);
                setAlreadySubmitted(true);
                
                switch (data.status) {
                    case "approved":
                        setMessage("Congratulations! Your store is approved. Redirecting...");
                        setTimeout(() => router.push("/store"), 5000);
                        break;
                    case "rejected":
                        setMessage("Unfortunately, your store application was rejected.");
                        break;
                    case "pending":
                    default:
                        setMessage("Your store application is currently under review.");
                        break;
                }
            }
        } catch (error) {
            if (error.response?.status !== 404) {
                console.error("Error fetching status:", error);
            }
            setAlreadySubmitted(false);
        } finally {
            setLoading(false)
        }
    }, [getToken, router]); 

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        if (!user) return toast.error("Please sign in.")
        if (typeof getToken !== "function") return toast.error("Authentication not ready.");
        
        try {
            const token = await getToken();
            const formData = new FormData();
            
            Object.entries(storeInfo).forEach(([key, value]) => {
                if (value !== null) formData.append(key, value);
            });

            const loadingToast = toast.loading("Submitting your store...");

            await axios.post("/api/store/create", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            
            toast.dismiss(loadingToast);
            toast.success("Store submitted successfully!");
            await fetchSellerStatus(); 
        } catch (error) {
            console.error("Error submitting store:", error);
            toast.dismiss(); // Ensure loading toast goes away on error
            toast.error(error.response?.data?.error || "Failed to submit.");
        }
    }

    useEffect(() => {
        if (userLoaded && authLoaded) {
            if (user) {
                fetchSellerStatus();
            } else {
                setLoading(false);
            }
        }
    },[userLoaded, authLoaded, user, fetchSellerStatus]) 

    // Cleanup object URL on component unmount
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    if (!userLoaded || !authLoaded || loading) return <Loading />;
    
    if (!user) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center text-slate-400">
                <h1 className="text-2xl font-semibold">Please login to continue</h1>
            </div>
        )
    }

    return (
        <div className="mx-6 min-h-[70vh] my-16">
            {!alreadySubmitted ? (
                <form onSubmit={onSubmitHandler} className="max-w-7xl mx-auto flex flex-col items-start gap-3 text-slate-500">
                    <div>
                        <h1 className="text-3xl">Add Your <span className="text-slate-800 font-medium">Store</span></h1>
                        <p className="max-w-lg">Submit your store details for review.</p>
                    </div>

                    <label className="mt-10 cursor-pointer">
                        Store Logo
                        <Image 
                            src={previewUrl ? previewUrl : assets.upload_area} 
                            className="rounded-lg mt-2 h-16 w-16 object-cover" 
                            alt="Logo" width={150} height={150} 
                        />
                        <input type="file" accept="image/*" onChange={onImageChange} hidden />
                    </label>

                    <input name="username" required onChange={onChangeHandler} value={storeInfo.username} type="text" placeholder="Username" className="border w-full max-w-lg p-2 rounded outline-none" />
                    <input name="name" required onChange={onChangeHandler} value={storeInfo.name} type="text" placeholder="Store Name" className="border w-full max-w-lg p-2 rounded outline-none" />
                    <textarea name="description" required onChange={onChangeHandler} value={storeInfo.description} rows={5} placeholder="Description" className="border w-full max-w-lg p-2 rounded outline-none" />
                    <input name="email" required onChange={onChangeHandler} value={storeInfo.email} type="email" placeholder="Email" className="border w-full max-w-lg p-2 rounded outline-none" />
                    <input name="contact" required onChange={onChangeHandler} value={storeInfo.contact} type="text" placeholder="Contact Number" className="border w-full max-w-lg p-2 rounded outline-none" />
                    <textarea name="address" required onChange={onChangeHandler} value={storeInfo.address} rows={5} placeholder="Store Address" className="border w-full max-w-lg p-2 rounded outline-none" />

                    <button type="submit" className="bg-slate-800 text-white px-12 py-2 rounded mt-10 hover:bg-black transition-all">Submit Application</button>
                </form>
            ) : (
                <div className="min-h-[80vh] flex flex-col items-center justify-center">
                    <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
                         <p className="sm:text-2xl text-slate-700 font-medium mb-2">Status: {status.toUpperCase()}</p>
                         <p className="text-slate-500">{message}</p>
                    </div>
                </div>
            )}
        </div>
    )
}