import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import LogoImg from '../components/Logo.png';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tokenFromUrl) setError('Invalid or missing reset link.');
  }, [tokenFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!API_URL) {
      setError('App is not configured for password reset.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenFromUrl, newPassword: password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to reset password.');
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200">
          <CardHeader className="text-center">
            <div className="flex justify-center">
              <img src={LogoImg} alt="Craftric Interior" className="h-16 w-auto object-contain" />
            </div>
            <CardTitle className="text-xl">Password reset</CardTitle>
            <p className="text-sm text-muted-foreground">Your password has been updated. You can now sign in.</p>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="text-center">
          <div className="flex justify-center">
            <img src={LogoImg} alt="Craftric Interior" className="h-16 w-auto object-contain" />
          </div>
          <CardTitle className="text-xl">Set new password</CardTitle>
          <p className="text-sm text-muted-foreground">Enter your new password below.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                disabled={!tokenFromUrl || loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                disabled={!tokenFromUrl || loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={!tokenFromUrl || loading}>
              {loading ? 'Updating…' : 'Reset password'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            <Link to="/login" className="text-blue-600 hover:underline">Back to sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
