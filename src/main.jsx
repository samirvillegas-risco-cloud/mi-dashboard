import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./home";
import App from "./App";
import Modulo1 from "./Modulo1"
import Modulo2 from "./Modulo2"



createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tarifas" element={<App />} />
         <Route path="/Modulo1" element={<Modulo1 />} />
         <Route path="/Modulo2" element={<Modulo2 />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);