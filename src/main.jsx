import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "leaflet/dist/leaflet.css";
import App from "./App.jsx";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { FavoritesProvider } from "./context/FavoritesContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <Provider store={store}>
        <FavoritesProvider>
          <App />
          <ToastContainer theme="colored" />
        </FavoritesProvider>
      </Provider>
    </ThemeProvider>
  </StrictMode>,
);
