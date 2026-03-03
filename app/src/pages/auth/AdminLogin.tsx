import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type NavigationState = {
  from?: string;
};

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@sm2dispatch.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as NavigationState | null)?.from;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(email, password, 'admin');
      const destination = from && from.startsWith('/admin') ? from : '/admin';
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(47,142,146,0.18),_transparent_28%),linear-gradient(135deg,#eff7f8_0%,#f8fbff_52%,#edf3fb_100%)] p-4 sm:p-6 flex items-center justify-center">
      <Card className="w-full max-w-[440px] overflow-hidden border-white/70 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
        <CardHeader className="space-y-4 border-b border-slate-100 bg-[linear-gradient(180deg,rgba(4,16,43,0.98)_0%,rgba(10,34,71,0.98)_100%)] px-6 py-7 text-white sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3aa7ac] to-[#2F8E92] shadow-lg shadow-cyan-950/30">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Admin Portal
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight text-white">Admin Sign In</CardTitle>
            <CardDescription className="max-w-sm text-sm leading-6 text-slate-300">
              Sign in to manage dispatch operations, technician activity, jobs, approvals, and platform settings.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-6 sm:px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-sm font-semibold text-slate-800">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className="h-11 border-slate-200 bg-slate-50 pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-[#2F8E92] focus-visible:ring-[#2F8E92]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="admin-password" className="text-sm font-semibold text-slate-800">Password</Label>
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-sm font-medium text-[#2F8E92] transition hover:text-[#256f73] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Forgot admin password</DialogTitle>
                      <DialogDescription>
                        Admin password reset is not self-service on the sign-in screen yet.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>If you still have access to the admin account, sign in and change it from Admin Settings.</p>
                      <p>If you are locked out, contact the system owner or developer to reset the admin password securely.</p>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" asChild>
                        <Link to="/tech/login">Back</Link>
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-11 border-slate-200 bg-slate-50 pl-10 pr-11 text-slate-900 placeholder:text-slate-400 focus-visible:border-[#2F8E92] focus-visible:ring-[#2F8E92]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-[#2F8E92] text-sm font-semibold shadow-sm transition hover:bg-[#27797d]"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in as Admin'}
            </Button>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-600 text-center">
                Technician account? <Link to="/tech/login" className="font-medium text-[#2F8E92] hover:underline">Go to technician login</Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
