import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { requestTechnicianPasswordReset } from '@/lib/backend-api';
import { Button } from '@/components/ui/button';
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

const brandingGradientStyle: CSSProperties = {
  backgroundImage:
    'linear-gradient(135deg, #0f172a 0%, #1f2937 40%, #14532d 72%, #3b8d4f 100%)',
};

const brandingPatternStyle: CSSProperties = {
  backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',
  backgroundSize: '28px 28px',
};

export default function TechnicianLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  const from = (location.state as NavigationState | null)?.from;

  const resetForgotPasswordState = (nextEmail?: string) => {
    setForgotEmail((nextEmail ?? email).trim());
    setForgotMessage(null);
    setForgotError(null);
    setIsForgotSubmitting(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(email, password, 'technician');
      const destination = from && from.startsWith('/tech') ? from : '/tech/jobs';
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordRequest = async () => {
    setForgotError(null);
    setForgotMessage(null);

    const normalizedEmail = forgotEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setForgotError('Enter your technician email address.');
      return;
    }

    setIsForgotSubmitting(true);
    try {
      const response = await requestTechnicianPasswordReset({ email: normalizedEmail });
      setForgotEmail(normalizedEmail);
      setForgotMessage(response.message);
    } catch (error) {
      setForgotError(error instanceof Error ? error.message : 'Unable to send password reset request.');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      <main className="min-h-screen lg:flex">
        <section
          className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex lg:w-[60%]"
          style={brandingGradientStyle}
        >
          <div className="pointer-events-none absolute inset-0 opacity-20" style={brandingPatternStyle} />

          <div className="relative z-10 max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-emerald-50 backdrop-blur-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <Wrench className="h-4 w-4" />
              </span>
              SM2 Electronics Dispatch
            </div>
            <h1 className="mb-4 text-5xl font-bold tracking-tight">SM2 Electronics Dispatch</h1>
            <h2 className="mb-6 text-2xl font-medium text-emerald-100">
              Enterprise Field Service Platform for Technicians, Installers, and Mobile Service Teams
            </h2>
            <p className="max-w-xl text-lg leading-relaxed text-emerald-50/80">
              Efficiently manage assigned jobs, monitor active work orders, review service history, and stay aligned with dispatch and operational workflows through one centralized technician workspace.
            </p>
          </div>

          <div className="relative z-10 mt-12 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100/70">Jobs</p>
              <p className="mt-3 text-3xl font-bold text-white">Active Dispatch</p>
              <p className="mt-2 text-sm leading-6 text-emerald-50/75">Stay on top of incoming assignments and manage job progress smoothly from acceptance to completion.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100/70">Service</p>
              <p className="mt-3 text-3xl font-bold text-white">Field Service Excellence</p>
              <p className="mt-2 text-sm leading-6 text-emerald-50/75">Purpose-built for technicians delivering PPF, tint, glass, and electronic installation services on site.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100/70">Profile</p>
              <p className="mt-3 text-3xl font-bold text-white">Operational Readiness</p>
              <p className="mt-2 text-sm leading-6 text-emerald-50/75">Maintain accurate schedules, availability, and profile details to stay aligned with dispatch workflows.</p>
            </div>
          </div>

          <div className="relative z-10 text-sm text-emerald-200/55">
            &copy; {new Date().getFullYear()} SM2 electronics. All rights reserved.
          </div>
        </section>

        <section className="flex items-center justify-center bg-white p-6 sm:p-10 lg:w-[40%] lg:p-12">
          <div className="w-full max-w-[520px] space-y-8">
            <div className="mb-10 text-center lg:hidden">
              <h1 className="text-3xl font-bold text-[#0f172a]">SM2 electronics</h1>
              <p className="mt-2 text-sm text-slate-500">Technician operations portal</p>
            </div>

            <header>
              <div className="mb-4 inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#2f7641]">
                Technician Portal
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Technician Sign In</h2>
              <p className="mt-2 text-slate-500">
                Enter your technician credentials to access assigned jobs, service history, and your field profile.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tech-email" className="block text-sm font-medium text-slate-700">
                  Email Address
                </Label>
                <Input
                  id="tech-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  placeholder="tech@sm2dispatch.com"
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base outline-none transition-all focus-visible:border-[#3b8d4f] focus-visible:ring-2 focus-visible:ring-[#3b8d4f]/20"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tech-password" className="block text-sm font-medium text-slate-700">
                    Password
                  </Label>
                  <Dialog
                    open={isForgotPasswordOpen}
                    onOpenChange={(open) => {
                      setIsForgotPasswordOpen(open);
                      if (open) {
                        resetForgotPasswordState();
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-sm font-medium text-[#3b8d4f] transition-colors hover:text-[#2f7641]"
                      >
                        Forgot password?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Forgot technician password</DialogTitle>
                        <DialogDescription>
                          Send a password reset request to the admin team. They will see it in the technician account portal and can update your password there.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="forgot-tech-email">Technician Email</Label>
                          <Input
                            id="forgot-tech-email"
                            type="email"
                            value={forgotEmail}
                            onChange={(event) => setForgotEmail(event.target.value)}
                            autoComplete="email"
                            placeholder="tech@sm2dispatch.com"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Use the email tied to your technician account. If that account exists, the admin portal will receive your request immediately.
                        </p>
                        {forgotMessage && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                            {forgotMessage}
                          </div>
                        )}
                        {forgotError && (
                          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {forgotError}
                          </div>
                        )}
                      </div>
                      <DialogFooter className="sm:justify-between">
                        <Button type="button" variant="outline" asChild>
                          <Link to="/tech/signup">Create account</Link>
                        </Button>
                        <Button
                          type="button"
                          onClick={handleForgotPasswordRequest}
                          disabled={isForgotSubmitting}
                          className="bg-[#3b8d4f] hover:bg-[#2f7641]"
                        >
                          {isForgotSubmitting ? 'Sending...' : 'Notify admin'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="relative">
                  <Input
                    id="tech-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    placeholder="********"
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 pr-12 text-base outline-none transition-all focus-visible:border-[#3b8d4f] focus-visible:ring-2 focus-visible:ring-[#3b8d4f]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center">
                <input
                  id="remember-tech-session"
                  name="remember-tech-session"
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(event) => setRememberSession(event.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#3b8d4f] focus:ring-[#3b8d4f]"
                />
                <span className="ml-2 block cursor-pointer text-sm text-slate-600">Remember this session</span>
              </label>

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                className="w-full rounded-lg bg-[#3b8d4f] px-4 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-[#2f7641] hover:shadow-md active:scale-[0.98]"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in as Technician'}
              </Button>
            </form>

            <footer className="space-y-4 border-t border-slate-100 pt-6 text-center">
              <p className="text-sm text-slate-600">
                New technician?{' '}
                <Link
                  to="/tech/signup"
                  className="ml-1 font-semibold text-[#3b8d4f] transition-colors hover:text-[#2f7641]"
                >
                  Create account
                </Link>
              </p>
              <p className="text-sm text-slate-600">
                Admin account?{' '}
                <Link
                  to="/admin/login"
                  className="ml-1 font-semibold text-[#008080] transition-colors hover:text-[#006666]"
                >
                  Go to admin login {'->'}
                </Link>
              </p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
