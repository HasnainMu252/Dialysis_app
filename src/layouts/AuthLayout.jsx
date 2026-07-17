import { Outlet } from 'react-router-dom';
// Full-bleed shell so the login screen can render a two-panel (slider + form) layout.
export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Outlet />
    </div>
  );
}
