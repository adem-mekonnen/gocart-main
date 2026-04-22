import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useState } from 'react';
import AddressModal from './AddressModal';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {  useAuth, useUser } from "@clerk/nextjs";
import axios from 'axios';
import { fetchAddress } from '@/lib/features/address/addressSlice';
import { fetchCart, clearCart } from '@/lib/features/cart/cartSlice';
const OrderSummary = ({ totalPrice, items }) => {
     const { user } = useUser();
     const{getToken} = useAuth()
     const dispatch = useDispatch()
  
    const isPlus = user?.publicMetadata?.plan === "Plus";
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
    const router = useRouter();

    // FIX 1: Add a fallback empty array to prevent .length errors
    const addressList = useSelector(state => state.address.list) || [];

    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');

    const handleCouponCode = async (event) => {
        event.preventDefault();
        // Coupon logic here
    


    try {
            
    if (!user) {
        toast.error("Please login to apply coupon");
        return;
    }
        const token = await getToken();
        // Ensure this URL matches your file path (e.g., /api/coupon)
        const response = await axios.post('/api/coupon', 
            { code: couponCodeInput },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setCoupon(response.data.coupon);
        toast.success(response.data.message || "Coupon Applied!");
        console.log("coupon data is ", response.data.coupon)
        setCouponCodeInput('');
    } catch (error) {
        // This will now show the REAL error (e.g. "Expired" or "First order only")
        const serverMsg = error.response?.data?.error || "Invalid Coupon";
        toast.error(serverMsg);
    }
    };

const handlePlaceOrder = async (e) => {
    e.preventDefault();
    
    try {
        if (!user) {
            toast.error("Please login to place an order");
            return;
        }
        if (!selectedAddress) {
            toast.error("Please select a shipping address");
            return;
        }

        const token = await getToken();

        // Ensure items is formatted correctly for the backend
        // It should look like: [{ id: "...", quantity: 1 }]
        const orderData = {
            addressId: selectedAddress.id,
            items: items, 
            paymentMethod: paymentMethod, 
            couponCode: coupon?.code || null // Using optional chaining safely
        };

        const { data } = await axios.post('/api/orders', orderData, { 
            headers: { Authorization: `Bearer ${token}` } 
        });

        if (paymentMethod === 'STRIPE') {
            if (data.session?.url) {
                window.location.href = data.session.url;
            } else {
                toast.error("Stripe session failed");
            }
        } else {
            toast.success(data.message);
             dispatch(clearCart()); 
            // Re-fetch cart to clear Redux state
            dispatch(fetchCart({ getToken })); 
            router.push('/orders');
        }
        
    } catch (error) {
        // Show specific backend errors like "Invalid coupon"
        const serverMsg = error.response?.data?.error || "Server Error";
        toast.error(serverMsg);
    }
};

    return (
        <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
            <h2 className='text-xl font-medium text-slate-600'>Payment Summary</h2>
            <p className='text-slate-400 text-xs my-4'>Payment Method</p>
            <div className='flex gap-2 items-center'>
                <input type="radio" id="COD" onChange={() => setPaymentMethod('COD')} checked={paymentMethod === 'COD'} className='accent-gray-500' />
                <label htmlFor="COD" className='cursor-pointer'>COD</label>
            </div>
            <div className='flex gap-2 items-center mt-1'>
                <input type="radio" id="STRIPE" name='payment' onChange={() => setPaymentMethod('STRIPE')} checked={paymentMethod === 'STRIPE'} className='accent-gray-500' />
                <label htmlFor="STRIPE" className='cursor-pointer'>Stripe Payment</label>
            </div>

            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                <p>Address</p>
                {
                    selectedAddress ? (
                        <div className='flex gap-2 items-center'>
                            {/* FIX 2: Use optional chaining (?.) for extra safety */}
                            <p>{selectedAddress?.name}, {selectedAddress?.city}, {selectedAddress?.state}, {selectedAddress?.zip}</p>
                            <SquarePenIcon onClick={() => setSelectedAddress(null)} className='cursor-pointer' size={18} />
                        </div>
                    ) : (
                        <div>
                            {
                                addressList.length > 0 && (
                                    <select 
                                        className='border border-slate-400 p-2 w-full my-3 outline-none rounded' 
                                        onChange={(e) => {
                                            const index = e.target.value;
                                            // FIX 3: Correctly handle the "Select Address" placeholder
                                            if (index !== "") {
                                                setSelectedAddress(addressList[index]);
                                            } else {
                                                setSelectedAddress(null);
                                            }
                                        }} 
                                    >
                                        <option value="">Select Address</option>
                                        {
                                            // FIX 4: Filter out any null/undefined entries before mapping
                                            addressList
                                                .filter(address => address !== null && address !== undefined)
                                                .map((address, index) => (
                                                    <option key={index} value={index}>
                                                        {address.name}, {address.city}, {address.state}, {address.zip}
                                                    </option>
                                                ))
                                        }
                                    </select>
                                )
                            }
                            <button className='flex items-center gap-1 text-slate-600 mt-1' onClick={() => setShowAddressModal(true)} >
                                Add Address <PlusIcon size={18} />
                            </button>
                        </div>
                    )
                }
            </div>

            <div className='pb-4 border-b border-slate-200'>
                <div className='flex justify-between'>
                    <div className='flex flex-col gap-1 text-slate-400'>
                        <p>Subtotal:</p>
                        <p>Shipping:</p>
                        {coupon && <p>Coupon:</p>}
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p>{currency}{totalPrice.toLocaleString()}</p>
                        <p>
                         {user?.publicMetadata?.plan === "plus"
                           ? "Free"
                           : `${currency}5`}
                        </p>
                      
                        
                        
                        {coupon && <p>{`-${currency}${(coupon.discount / 100 * totalPrice).toFixed(2)}`}</p>}
                    </div>
                </div>
                {
                    !coupon ? (
                        <form onSubmit={e => toast.promise(handleCouponCode(e), { loading: 'Checking Coupon...' })} className='flex justify-center gap-3 mt-3'>
                            <input onChange={(e) => setCouponCodeInput(e.target.value)} value={couponCodeInput} type="text" placeholder='Coupon Code' className='border border-slate-400 p-1.5 rounded w-full outline-none' />
                            <button className='bg-slate-600 text-white px-3 rounded hover:bg-slate-800 active:scale-95 transition-all'>Apply</button>
                        </form>
                    ) : (
                        <div className='w-full flex items-center justify-center gap-2 text-xs mt-2'>
                            <p>Code: <span className='font-semibold ml-1'>{coupon.code.toUpperCase()}</span></p>
                            <p>{coupon.description}</p>
                            <XIcon size={18} onClick={() => setCoupon('')} className='hover:text-red-700 transition cursor-pointer' />
                        </div>
                    )
                }
            </div>

            <div className='flex justify-between py-4'>
                <p>Total:</p>
             <p className="font-medium text-right">
            {isPlus
               ? "Free"
                : `${currency}${
               coupon
             ? (totalPrice + 5 - (coupon.discount / 100 * totalPrice)).toFixed(2)
             : (totalPrice + 5).toLocaleString()
               }`}
                </p>
            </div>

            <button onClick={e => toast.promise(handlePlaceOrder(e), { loading: 'placing Order...' })} className='w-full bg-slate-700 text-white py-2.5 rounded hover:bg-slate-900 active:scale-95 transition-all'>
                Place Order
            </button>

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}
        </div>
    );
};

export default OrderSummary;