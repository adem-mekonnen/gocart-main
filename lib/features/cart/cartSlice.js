import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

// THUNK: Upload Cart
export const uploadCart = createAsyncThunk('cart/uploadCart', async ({ getToken }, thunkAPI) => {
    try {
        const token = await getToken();
        // Extract ONLY the cartItems object (e.g. { "id": 2 })
        const cartItemsOnly = thunkAPI.getState().cart.cartItems; 
        
        await axios.post('/api/cart', { cart: cartItemsOnly }, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return cartItemsOnly;
    } catch (error) {
        return thunkAPI.rejectWithValue('Failed to upload');
    }
});

// THUNK: Fetch Cart
export const fetchCart = createAsyncThunk('cart/fetchCart', async ({ getToken }, thunkAPI) => {
    try {
        const token = await getToken();
        const { data } = await axios.get('/api/cart', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return data; // This returns the JSON object from the DB
    } catch (error) {
        return thunkAPI.rejectWithValue('Failed to fetch cart');
    }
});

const cartSlice = createSlice({
    name: 'cart',
    initialState: {
        total: 0,
        cartItems: {},
    },
    reducers: {
        addToCart: (state, action) => {
            const { productId } = action.payload;
            state.cartItems[productId] = (state.cartItems[productId] || 0) + 1;
            state.total += 1;
        },
        removeFromCart: (state, action) => {
            const { productId } = action.payload;
            if (state.cartItems[productId] > 0) {
                state.cartItems[productId]--;
                if (state.cartItems[productId] === 0) delete state.cartItems[productId];
                state.total -= 1;
            }
        },
        deleteItemFromCart: (state, action) => {
            const { productId } = action.payload;
            state.total -= (state.cartItems[productId] || 0);
            delete state.cartItems[productId];
        },
        clearCart: (state) => {
            state.cartItems = {};
            state.total = 0;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchCart.fulfilled, (state, action) => {
            // Restore state from DB structure
            state.cartItems = action.payload.cartItems || {};
            state.total = action.payload.total || 0;
        });
    }
});

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart } = cartSlice.actions;
export default cartSlice.reducer;