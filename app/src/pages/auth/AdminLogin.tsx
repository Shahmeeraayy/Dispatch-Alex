import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type NavigationState = {
  from?: string;
};

const pageBackgroundStyle: CSSProperties = {
  backgroundImage:
    'radial-gradient(circle at 18% 18%, rgba(45, 212, 191, 0.18), transparent 22%), radial-gradient(circle at 82% 14%, rgba(34, 211, 238, 0.16), transparent 24%), linear-gradient(145deg, #04131f 0%, #072136 52%, #06283d 100%)',
};

const gridOverlayStyle: CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
  backgroundSize: '120px 120px',
  backgroundPosition: '-1px -1px',
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
    <div
      className="relative min-h-[100svh] overflow-hidden bg-[#04131f] text-white antialiased"
      style={pageBackgroundStyle}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30" style={gridOverlayStyle} />
      <div className="pointer-events-none absolute left-[-6rem] top-[-5rem] h-72 w-72 rounded-full bg-cyan-400/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-8rem] right-[-5rem] h-80 w-80 rounded-full bg-teal-300/14 blur-3xl" />

      <main className="relative flex min-h-[100svh] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-[540px]">
          <div className="absolute inset-0" />

          <div className="relative overflow-hidden rounded-[34px] border border-white/12 bg-[#f6f8fb]/94 p-6 text-slate-900 shadow-[0_30px_120px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-8">
            <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),rgba(255,255,255,0)_72%)]" />

            <div className="relative">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/78 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-[#008c88]" />
                    SM2 Electronics
                  </div>
                  <h1 className="mt-5 text-[clamp(2.1rem,4vw,3.35rem)] font-semibold leading-[0.93] tracking-[-0.055em] text-slate-950">
                    Admin sign in
                  </h1>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-[15px]">
                    Access the dispatch admin portal from one clean, protected workspace.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm font-medium text-emerald-700 shadow-sm">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Protected access
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-slate-200 bg-white/84 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email" className="block text-sm font-semibold text-slate-700">
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
                      className="h-12 rounded-2xl border-slate-200 bg-white px-4 text-base shadow-sm transition-all focus-visible:border-[#008c88] focus-visible:ring-[#008c88]/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="admin-password" className="block text-sm font-semibold text-slate-700">
                        Password
                      </Label>
                      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                        Private session
                      </span>
                    </div>

                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                        required
                        placeholder="********"
                        className="h-12 rounded-2xl border-slate-200 bg-white px-4 pr-12 text-base shadow-sm transition-all focus-visible:border-[#008c88] focus-visible:ring-[#008c88]/20"
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

                  <div className="flex flex-col gap-3 rounded-[22px] border border-slate-200/90 bg-slate-50/92 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        checked={rememberSession}
                        onChange={(event) => setRememberSession(event.target.checked)}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#008c88] focus:ring-[#008c88]"
                      />
                      <span className="ml-3 block cursor-pointer text-sm font-medium text-slate-600">
                        Remember this browser
                      </span>
                    </label>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <ShieldCheck className="h-4 w-4 text-[#008c88]" />
                      Protected admin session
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMessage}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-14 w-full rounded-2xl bg-[#008c88] text-base font-semibold text-white shadow-[0_18px_40px_rgba(0,140,136,0.24)] transition-all hover:bg-[#00706d] hover:shadow-[0_22px_48px_rgba(0,140,136,0.3)] active:scale-[0.99]"
                    disabled={isSubmitting}
                  >
                    <span>{isSubmitting ? 'Signing in...' : 'Enter Admin Portal'}</span>
                    {!isSubmitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                  </Button>
                </form>
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/70">
                    Alternate Access
                  </p>
                  <p className="mt-2 text-sm text-slate-200/80">
                    Need field access instead of admin control?
                  </p>
                </div>
                <Link
                  to="/tech/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition-colors hover:text-white"
                >
                  Go to technician login
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
