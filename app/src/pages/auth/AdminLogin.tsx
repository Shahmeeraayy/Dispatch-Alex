import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  requestForgotPasswordOtp,
  resetPasswordWithOtp,
  verifyForgotPasswordOtp,
} from '@/lib/backend-api';
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
    'linear-gradient(135deg, #0a192f 0%, #112240 52%, #008080 100%)',
};

const brandingPatternStyle: CSSProperties = {
  backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)',
  backgroundSize: '30px 30px',
};

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@sm2dispatch.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [forgotEmail, setForgotEmail] = useState('admin@sm2dispatch.com');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  const from = (location.state as NavigationState | null)?.from;

  const resetForgotState = () => {
    setForgotStep('request');
    setForgotEmail(email || 'admin@sm2dispatch.com');
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotMessage(null);
    setForgotError(null);
    setIsForgotSubmitting(false);
  };

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

  const handleRequestOtp = async () => {
    setForgotError(null);
    setForgotMessage(null);
    setIsForgotSubmitting(true);
    try {
      const response = await requestForgotPasswordOtp({ email: forgotEmail });
      setForgotMessage(response.message);
      setForgotStep('verify');
    } catch (error) {
      setForgotError(error instanceof Error ? error.message : 'Unable to send reset code.');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setForgotError(null);
    setForgotMessage(null);
    setIsForgotSubmitting(true);
    try {
      const response = await verifyForgotPasswordOtp({ email: forgotEmail, otp });
      setResetToken(response.reset_token);
      setForgotMessage('OTP verified. You can now set a new password.');
      setForgotStep('reset');
    } catch (error) {
      setForgotError(error instanceof Error ? error.message : 'OTP verification failed.');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setForgotError(null);
    setForgotMessage(null);
    if (!newPassword || !confirmNewPassword) {
      setForgotError('Enter and confirm the new password.');
      return;
    }
    if (newPassword != confirmNewPassword) {
      setForgotError('New password and confirmation do not match.');
      return;
    }

    setIsForgotSubmitting(true);
    try {
      await resetPasswordWithOtp({
        reset_token: resetToken,
        new_password: newPassword,
      });
      setForgotMessage('Password reset successfully. Sign in with the new password.');
      setPassword('');
      setIsForgotPasswordOpen(false);
      resetForgotState();
    } catch (error) {
      setForgotError(error instanceof Error ? error.message : 'Unable to reset password.');
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
            <h1 className="mb-4 text-5xl font-bold tracking-tight">SM2 Dispatch</h1>
            <h2 className="mb-6 text-2xl font-medium text-teal-100">
              Technician Dispatch &amp; Service Management Platform
            </h2>
            <p className="max-w-xl text-lg leading-relaxed text-teal-50/80">
              Streamline your operations. Manage technicians, track jobs in real-time, handle invoices, and process approvals all in one unified platform.
            </p>
          </div>

          <div className="relative z-10 mt-12 flex items-center justify-center">
            <div className="flex aspect-video w-full max-w-lg items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm">
              <img
                alt="SM2 Dispatch Logistics Dashboard Preview"
                className="h-full w-full object-cover opacity-80"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDG35ncXB25BVPgSH6CugIxactx4gf8pZ_0lNO3gqkFSfUFqvekujRbL-UblCvoFP0bd-rHpZ6PVxpPNZFDuhhFO099kHPfJeNVi6wFHdLtP43RLqskAaTKKkBe4m5-BFLQPLm6p7-dqfKDyghQuP243Um8TKHeq-qyap6GEDhlj0g48Rs15qTFZUeC0YEMnDnlaECQZKipqbaT5pFoV00mux_xfCacWv6GTSMFjHkID5G88UMlmBGjp6-j65OQF2wkB7kg2dIv7MGP"
              />
            </div>
          </div>

          <div className="relative z-10 text-sm text-teal-200/50">
            &copy; 2023 SM2 Dispatch Inc. All rights reserved.
          </div>
        </section>

        <section className="flex items-center justify-center bg-white p-6 sm:p-12 lg:w-[40%]">
          <div className="w-full max-w-[520px] space-y-8">
            <div className="mb-10 text-center lg:hidden">
              <h1 className="text-3xl font-bold text-[#0a192f]">SM2 Dispatch</h1>
            </div>

            <header>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Admin Sign In</h2>
              <p className="mt-2 text-slate-500">Please enter your credentials to access the admin portal.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="block text-sm font-medium text-slate-700">
                  Email Address
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  placeholder="admin@sm2dispatch.com"
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base outline-none transition-all focus-visible:border-[#008080] focus-visible:ring-2 focus-visible:ring-[#008080]/20"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-password" className="block text-sm font-medium text-slate-700">
                    Password
                  </Label>
                  <Dialog
                    open={isForgotPasswordOpen}
                    onOpenChange={(open) => {
                      setIsForgotPasswordOpen(open);
                      if (open) {
                        resetForgotState();
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-sm font-medium text-[#008080] transition-colors hover:text-[#006666]"
                      >
                        Forgot password?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Forgot admin password</DialogTitle>
                        <DialogDescription>
                          Reset the admin password by email OTP.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="forgot-admin-email">Admin Email</Label>
                          <Input
                            id="forgot-admin-email"
                            type="email"
                            value={forgotEmail}
                            onChange={(event) => setForgotEmail(event.target.value)}
                            disabled={forgotStep !== 'request'}
                            autoComplete="email"
                          />
                        </div>

                        {forgotStep !== 'request' && (
                          <div className="space-y-2">
                            <Label htmlFor="forgot-admin-otp">OTP Code</Label>
                            <Input
                              id="forgot-admin-otp"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="6-digit OTP"
                              value={otp}
                              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                            />
                          </div>
                        )}

                        {forgotStep === 'reset' && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="forgot-admin-new-password">New Password</Label>
                              <Input
                                id="forgot-admin-new-password"
                                type="password"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                autoComplete="new-password"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="forgot-admin-confirm-password">Confirm Password</Label>
                              <Input
                                id="forgot-admin-confirm-password"
                                type="password"
                                value={confirmNewPassword}
                                onChange={(event) => setConfirmNewPassword(event.target.value)}
                                autoComplete="new-password"
                              />
                            </div>
                          </div>
                        )}

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
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsForgotPasswordOpen(false);
                            resetForgotState();
                          }}
                        >
                          Close
                        </Button>
                        {forgotStep === 'request' && (
                          <Button type="button" onClick={handleRequestOtp} disabled={isForgotSubmitting}>
                            {isForgotSubmitting ? 'Sending...' : 'Send OTP'}
                          </Button>
                        )}
                        {forgotStep === 'verify' && (
                          <Button type="button" onClick={handleVerifyOtp} disabled={isForgotSubmitting}>
                            {isForgotSubmitting ? 'Verifying...' : 'Verify OTP'}
                          </Button>
                        )}
                        {forgotStep === 'reset' && (
                          <Button type="button" onClick={handleResetPassword} disabled={isForgotSubmitting}>
                            {isForgotSubmitting ? 'Updating...' : 'Reset Password'}
                          </Button>
                        )}
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 pr-12 text-base outline-none transition-all focus-visible:border-[#008080] focus-visible:ring-2 focus-visible:ring-[#008080]/20"
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
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(event) => setRememberSession(event.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
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
                className="w-full rounded-lg bg-[#008080] px-4 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-[#006666] hover:shadow-md active:scale-[0.98]"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in as Admin'}
              </Button>
            </form>

            <footer className="border-t border-slate-100 pt-6 text-center">
              <p className="text-sm text-slate-600">
                Technician account?{' '}
                <Link
                  to="/tech/login"
                  className="ml-1 font-semibold text-[#008080] transition-colors hover:text-[#006666]"
                >
                  Go to technician login →
                </Link>
              </p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
