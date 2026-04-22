import { addressDummyData } from '@/assets/assets'
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'



export const fetchAddress = createAsyncThunk(
    'address/fetchAddress', 
    async (getToken, thunkAPI) => {
        try {
            const token = await getToken();
            const { data } = await axios.get('/api/address', {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            // ✅ FIX 3: Your backend returns `data.addresses`, not `data.address`
            return data.addresses ? data.addresses :[];
            
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data || "Failed to fetch");
        }
    }
);

const addressSlice = createSlice({
    name: 'address',
    initialState: {
        list: [],
    },
    reducers: {
        addAddress: (state, action) => {
            state.list.push(action.payload)
        },
    },
      extraReducers: (builder) => {
            builder.addCase(fetchAddress.fulfilled, (state, action) => {
                // Restore state from DB structure
                state.list = action.payload
            });
        }

})

export const { addAddress } = addressSlice.actions

export default addressSlice.reducer