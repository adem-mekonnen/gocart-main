import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'; // Fixed import
import axios from 'axios'; // Added missing axios import

// Removed productDummyData if you aren't using it in this file

// 1. Use createAsyncThunk
// 2. Added `= {}` so it doesn't crash if called without arguments
export const fetchProduct = createAsyncThunk(
    'product/fetchProduct', 
    async ({ storeId } = {}, thunkAPI) => { 
        try {
            // 3. Using Axios `params` is cleaner than string concatenation
           const response = await axios.get('/api/products', {
              params: storeId ? { storeId: storeId } : {}
            });
            
            // ✅ FIX 2: Axios responses are always inside `.data`
            return response.data.products;
        } catch (error) {
            console.error("Error fetching products:", error);
            // Better error handling: try to return the actual backend error message
            const message = error.response?.data?.message || "Failed to fetch products";
            return thunkAPI.rejectWithValue(message);
        }
    }
);

const productSlice = createSlice({
    name: 'product',
    initialState: {
        list: [],
        isLoading: false, // Added loading state
        error: null       // Added error state
    },
    reducers: {
        setProduct: (state, action) => {
            state.list = action.payload;
        },
        clearProduct: (state) => {
            state.list = [];
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProduct.pending, (state) => {
                state.isLoading = true; // Set loading to true
                state.error = null;     // Clear previous errors
            })
            .addCase(fetchProduct.fulfilled, (state, action) => {
                state.isLoading = false;
                state.list = action.payload;
            })
            .addCase(fetchProduct.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload; // Store the error message
            });
    }
});

export const { setProduct, clearProduct } = productSlice.actions;

export default productSlice.reducer;