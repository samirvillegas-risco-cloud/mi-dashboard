import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./home";
import App from "./App";
import Modulo1 from "./Modulo1"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tarifas" element={<App />} />
         <Route path="/Modulo1" element={<Modulo1 />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);