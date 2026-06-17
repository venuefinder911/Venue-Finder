import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: JSON.parse(localStorage.getItem("user")) || null,
  role: localStorage.getItem("role") || null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload.user;
      state.role = action.payload.role;

      localStorage.setItem("user", JSON.stringify(action.payload.user));
      localStorage.setItem("role", action.payload.role);
    },
    logout: (state) => {
      state.user = null;
      state.role = null;

      localStorage.removeItem("user");
      localStorage.removeItem("role");
    },
  },
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;
