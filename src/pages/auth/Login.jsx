import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { roleHome } from '../../constants';
import { useAuth } from '../../context/AuthContext';

const quickUsers = [
  ['Admin', 'admin@test.com', '12345678'],
  ['Front Desk', 'frontdesk@test.com', '12345678'],
  ['Nurse', 'nurse@test.com', '12345678'],
  ['Technician', 'tech@test.com', '12345678'],
  ['Biller', 'biller@test.com', '12345678'],
  ['Social Worker', 'social@test.com', '12345678'],
  ['Insurance Person', 'insurance@test.com', 'Insurance12345'],
  ['Doctor', 'doctor@test.com', '12345678'],
  ['Patient', 'patient@test.com', '12345678'],
];

export default function Login() {
  const [form, setForm] = useState({ email: 'admin@test.com', password: '12345678' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { user } = await login(form);
      const redirectTo = location.state?.from?.pathname || roleHome[user.role] || '/';
      toast.success('Login successful');
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <form onSubmit={submit} className="card space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold">Dialysis Management Login</h1>
          <p className="text-sm text-slate-500">Use any role account created from backend.</p>
        </div>

        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            autoComplete="current-password"
            required
          />
        </div>

        <button disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>

      <div className="card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick email fill</p>
        <div className="grid grid-cols-2 gap-2">
          {quickUsers.map(([label, email, password]) => (
            <button
              key={email}
              type="button"
              className="rounded-xl bg-slate-100 px-3 py-2 text-left text-xs hover:bg-slate-200"
              onClick={() => setForm({ email, password })}
            >
              <span className="font-medium">{label}</span>
              <br />
              <span className="text-slate-500">{email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
