import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { DialogProvider } from "@/components/ui/DialogProvider"
import { BrowserRouter } from "react-router-dom"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <DialogProvider>
        <App />
      </DialogProvider>
    </BrowserRouter>
  </StrictMode>
)
