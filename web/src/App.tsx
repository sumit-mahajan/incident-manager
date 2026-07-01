import { Routes, Route } from 'react-router-dom';

export default function App() {
  return (
    <Routes>
      {/* Routes wired in Step 5 */}
      <Route
        path="*"
        element={<div className="p-8 text-foreground font-sans">IncidentHub — workspace ready</div>}
      />
    </Routes>
  );
}
