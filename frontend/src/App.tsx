import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/Home';
import { EventDetailsPage } from './pages/EventDetails';
import { CheckoutPage } from './pages/Checkout';
import { SuccessPage } from './pages/Success';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/event/:id" element={<EventDetailsPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/success" element={<SuccessPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;