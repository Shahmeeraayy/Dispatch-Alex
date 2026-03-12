import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type NavigationState = {
  from?: string;
};

const shellBackgroundStyle: CSSProperties = {
  backgroundImage:
    'radial-gradient(circle at 12% 18%, rgba(34, 211, 238, 0.2), transparent 24%), radial-gradient(circle at 84% 14%, rgba(45, 212, 191, 0.16), transparent 22%), radial-gradient(circle at 76% 78%, rgba(59, 130, 246, 0.12), transparent 20%), linear-gradient(135deg, #03131b 0%, #061a29 42%, #062235 100%)',
};

const meshPatternStyle: CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
  backgroundSize: '120px 120px',
  backgroundPosition: '-1px -1px',
};

const spotlightStyle: CSSProperties = {
  background:
    'radial-gradient(circle at top, rgba(255,255,255,0.22), rgba(255,255,255,0) 58%)',
};

const commandPillars = [
  {
    title: 'Live Oversight',
    detail: 'Technicians, jobs, approvals, and escalation paths aligned in one admin view.',
    icon: LayoutDashboard,
  },
  {
    title: 'Approval Flow',
    detail: 'Keep invoice review, dispatch timing, and technician access requests moving fast.',
    icon: CheckCircle2,
  },
  {
    title: 'Secure Control',
    detail: 'Run the command layer with centralized credentials and cleaner operator handoff.',
    icon: ShieldCheck,
  },
] as const;

const controlSignals = [
  { label: 'Dispatch rhythm', value: 'Stable', tone: 'bg-emerald-400' },
  { label: 'Portal visibility', value: 'Full stack', tone: 'bg-cyan-400' },
  { label: 'Approvals queue', value: 'Managed', tone: 'bg-amber-300' },
] as const;

const workloadBars = [
  { label: 'Job board', width: '88%', tint: 'from-cyan-300 to-cyan-500' },
  { label: 'Technician flow', width: '74%', tint: 'from-emerald-300 to-emerald-500' },
  { label: 'Invoice review', width: '61%', tint: 'from-sky-300 to-sky-500' },
  { label: 'Access control', width: '83%', tint: 'from-teal-300 to-teal-500' },
] as const;

const portalChecks = [
  {
    title: 'Protected admin surface',
    detail: 'Role-aware access into dispatch, reporting, and settings.',
    icon: ShieldCheck,
  },
  {
    title: 'Clean technician handoff',
    detail: 'Jump into the technician portal without losing the control-center feel.',
    icon: ArrowRight,
  },
] as const;

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
    <div className="relative min-h-screen overflow-hidden bg-[#03131b] text-white antialiased" style={shellBackgroundStyle}>
      <div className="pointer-events-none absolute inset-0 opacity-30" style={meshPatternStyle} />
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-cyan-400/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-teal-300/12 blur-3xl" />

      <main className="relative mx-auto min-h-screen max-w-[1600px] px-4 py-4 sm:px-6 lg:flex lg:items-stretch lg:gap-6 lg:px-8 lg:py-6">
        <section className="relative flex flex-col justify-between overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8 lg:w-[58%] lg:p-10">
          <div className="pointer-events-none absolute inset-0 opacity-60" style={spotlightStyle} />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
              <Sparkles className="h-4 w-4" />
              Dispatch Command Center
            </div>

            <div className="mt-8 max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.32em] text-cyan-100/70">
                SM2 Electronics
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
                Run dispatch, approvals, and technician access like an actual control room.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200/78 sm:text-lg">
                One admin surface for live field operations, queue management, technician account handling, and back-office decisions that should feel fast instead of improvised.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {controlSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-100"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${signal.tone} animate-pulse`} />
                  <span className="text-slate-300/75">{signal.label}</span>
                  <span className="font-semibold text-white">{signal.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 xl:grid-cols-3">
              {commandPillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="rounded-[24px] border border-white/10 bg-slate-950/25 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-5 text-xl font-semibold tracking-tight text-white">{pillar.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300/78">{pillar.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-10 rounded-[30px] border border-white/10 bg-slate-950/35 p-4 shadow-[0_20px_80px_rgba(2,8,20,0.38)] backdrop-blur-lg sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 lg:w-[62%]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-100/70">
                      Operations Surface
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Command Board</h2>
                  </div>
                  <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
                    Live admin layer
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {workloadBars.map((bar) => (
                    <div key={bar.label}>
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-300/80">
                        <span>{bar.label}</span>
                        <span>{bar.width}</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/8">
                        <div
                          className={`h-3 rounded-full bg-gradient-to-r ${bar.tint}`}
                          style={{ width: bar.width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-300/65">Dispatch</p>
                    <p className="mt-3 text-lg font-semibold text-white">Realtime board</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-300/65">Approvals</p>
                    <p className="mt-3 text-lg font-semibold text-white">Fast review</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-300/65">Access</p>
                    <p className="mt-3 text-lg font-semibold text-white">Operator control</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:w-[38%]">
                <div className="rounded-[26px] border border-white/10 bg-gradient-to-br from-cyan-300/14 to-transparent p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-100">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-300/70">Queue Watch</p>
                      <p className="mt-1 text-lg font-semibold text-white">Priority handoffs stay visible</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-300/78">
                    Password reset requests, technician approvals, and invoice bottlenecks can be surfaced without the admin dashboard feeling flat or generic.
                  </p>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300/12 text-emerald-100">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-300/70">Operator Confidence</p>
                      <p className="mt-1 text-lg font-semibold text-white">Built for fast decisions</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-3 text-sm text-slate-200">
                      <span>Tech management</span>
                      <span className="font-semibold text-cyan-100">Centralized</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-3 text-sm text-slate-200">
                      <span>Invoice approvals</span>
                      <span className="font-semibold text-emerald-100">Streamlined</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-3 text-sm text-slate-200">
                      <span>Dispatch flow</span>
                      <span className="font-semibold text-teal-100">Visible</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 text-sm text-slate-300/78 sm:flex-row sm:items-center sm:justify-between">
              <p>Administrative workspace for SM2 field operations, technician access, and dispatch coordination.</p>
              <p className="text-cyan-100/70">&copy; {new Date().getFullYear()} SM2 Electronics</p>
            </div>
          </div>
        </section>

        <section className="mt-6 flex items-center justify-center lg:mt-0 lg:w-[42%]">
          <div className="relative w-full max-w-[560px]">
            <div className="absolute inset-3 rounded-[34px] bg-gradient-to-br from-cyan-300/30 via-white/10 to-teal-400/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-[34px] border border-white/12 bg-[#f6f8fb]/95 p-6 text-slate-900 shadow-[0_30px_120px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-8">
              <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.22),rgba(255,255,255,0)_72%)]" />

              <div className="relative">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 shadow-sm">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#008c88]" />
                      Admin Portal
                    </div>
                    <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.15rem]">
                      Sign in to the control layer.
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-[15px]">
                      Access dispatch oversight, technician management, reporting, invoicing, and settings from one protected workspace.
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-white/75 p-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                      Status
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      Protected access
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-6">
                    <div className="space-y-5">
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
                          className="h-14 rounded-2xl border-slate-200 bg-white px-4 text-base shadow-sm transition-all focus-visible:border-[#008c88] focus-visible:ring-[#008c88]/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="admin-password" className="block text-sm font-semibold text-slate-700">
                            Password
                          </Label>
                          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
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
                            className="h-14 rounded-2xl border-slate-200 bg-white px-4 pr-12 text-base shadow-sm transition-all focus-visible:border-[#008c88] focus-visible:ring-[#008c88]/20"
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
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
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
                    <p className="text-sm text-slate-500">Keep your control-room session ready on this device.</p>
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

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {portalChecks.map((check) => {
                    const Icon = check.icon;
                    return (
                      <div key={check.title} className="rounded-[24px] border border-slate-200 bg-white/80 p-4 shadow-sm">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-[#008c88]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <h3 className="mt-4 text-sm font-semibold text-slate-900">{check.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{check.detail}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-[26px] border border-slate-200 bg-gradient-to-r from-slate-950 to-slate-900 px-5 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          </div>
        </section>
      </main>
    </div>
  );
}
