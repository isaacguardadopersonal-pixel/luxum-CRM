import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { LanguageProvider } from "./contexts/LanguageContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId="849668044673-avsj96b3doik6thp4vfc393nr614al92.apps.googleusercontent.com">
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </GoogleOAuthProvider>
);
