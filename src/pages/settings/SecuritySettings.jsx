import { useState } from 'react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';

export default function SecuritySettings() {
  const { user, refreshMe } = useAuth();
  const [setup, setSetup] = useState(null); // { secret, otpauthUrl }
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [mfaOn, setMfaOn] = useState(!!user?.mfaEnabled);

  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await authApi.mfaSetup();
      setSetup(res.data?.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not start MFA setup');
    } finally { setBusy(false); }
  };

  const enable = async () => {
    setBusy(true);
    try {
      await authApi.mfaEnable(token);
      toast.success('MFA enabled');
      setMfaOn(true); setSetup(null); setToken('');
      refreshMe?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Invalid code');
    } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await authApi.mfaDisable(token);
      toast.success('MFA disabled');
      setMfaOn(false); setToken('');
      refreshMe?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Invalid code');
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Security" subtitle="Manage multi-factor authentication for your account." />

      <div className="card space-y-4 p-6">
        <div className="flex items-center gap-3">
          {mfaOn ? <ShieldCheck className="text-green-600" /> : <ShieldAlert className="text-amber-500" />}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Multi-Factor Authentication</h2>
            <p className="text-sm text-slate-500">{mfaOn ? 'MFA is ON — a code is required at login.' : 'MFA is OFF — add a second factor for stronger protection.'}</p>
          </div>
        </div>

        {!mfaOn && !setup && (
          <button className="btn-primary" onClick={startSetup} disabled={busy}>Set up MFA</button>
        )}

        {!mfaOn && setup && (
          <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-sm text-slate-700">1. Scan this QR code with Google Authenticator, Authy, or Microsoft Authenticator:</p>
            <div className="flex justify-center">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <QRCodeSVG value={setup.otpauthUrl} size={180} level="M" includeMargin />
              </div>
            </div>
            <p className="text-center text-xs text-slate-500">Can't scan? Enter this key manually:</p>
            <div className="rounded-xl bg-white p-3 text-center font-mono text-sm font-bold tracking-wider text-slate-900 break-all">{setup.secret}</div>
            <p className="text-sm text-slate-700">2. Enter the 6-digit code it shows:</p>
            <div className="flex gap-2">
              <input className="input tracking-[0.4em]" inputMode="numeric" maxLength={6} placeholder="123456" value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))} />
              <button className="btn-primary whitespace-nowrap" onClick={enable} disabled={busy || token.length < 6}>Enable</button>
            </div>
          </div>
        )}

        {mfaOn && (
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <p className="text-sm text-slate-700">To turn MFA off, confirm a current code from your authenticator app:</p>
            <div className="flex gap-2">
              <input className="input tracking-[0.4em]" inputMode="numeric" maxLength={6} placeholder="123456" value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))} />
              <button className="btn-light whitespace-nowrap text-red-600" onClick={disable} disabled={busy || token.length < 6}>Disable MFA</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
