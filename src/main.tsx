import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/logrocket' // This will run LogRocket.init() immediately

createRoot(document.getElementById("root")!).render(<App />);
