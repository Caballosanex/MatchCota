import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/public/Home';
import RegisterTenant from './pages/public/RegisterTenant';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register-tenant" element={<RegisterTenant />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;