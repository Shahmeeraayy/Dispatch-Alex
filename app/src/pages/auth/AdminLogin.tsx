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
    'radial-gradient(circle at 14% 18%, rgba(45, 212, 191, 0.16), transparent 22%), radial-gradient(circle at 84% 18%, rgba(56, 189, 248, 0.18), transparent 24%), linear-gradient(135deg, #04131f 0%, #071f32 48%, #06263b 100%)',
};

const meshPatternStyle: CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
  backgroundSize: '120px 120px',
  backgroundPosition: '-1px -1px',
};

const spotlightStyle: CSSProperties = {
  background:
    'radial-gradient(circle at top, rgba(255,255,255,0.18), rgba(255,255,255,0) 58%)',
};

const heroFeatures = [
  {
    title: 'Live job visibility',
    detail: 'Track jobs, technicians, and escalations in one stream.',
    icon: LayoutDashboard,
  },
  {
    title: 'Approval flow',
    detail: 'Move invoice reviews and admin decisions with less friction.',
    icon: CheckCircle2,
  },
  {
    title: 'Access control',
    detail: 'Manage technician logins, resets, and permissions cleanly.',
    icon: ShieldCheck,
  },
] as const;

const boardRows = [
  { label: 'Dispatch feed', width: '86%', tint: 'from-cyan-300 to-sky-400' },
  { label: 'Technician readiness', width: '74%', tint: 'from-emerald-300 to-emerald-500' },
  { label: 'Approval cadence', width: '67%', tint: 'from-teal-300 to-cyan-500' },
] as const;

const heroSignals = [
  { label: 'Command center', value: 'Active', tone: 'bg-emerald-400' },
  { label: 'Queue clarity', value: 'High', tone: 'bg-cyan-400' },
  { label: 'Access hygiene', value: 'Protected', tone: 'bg-amber-300' },
] as const;

const portalChecks = [
  {
    title: 'Designed to impress',
    detail: 'A cleaner, more premium admin entry that feels intentional instead of generic.',
    icon: Sparkles,
  },
  {
    title: 'Built for every screen',
    detail: 'Readable on mobile and balanced on laptop without the layout falling apart.',
    icon: ShieldCheck,
  },
] as const;

const capabilityPills = ['Dispatch control', 'Tech accounts', 'Approvals'] as const;

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
      className="relative min-h-[100svh] overflow-x-hidden bg-[#04131f] text-white antialiased"
      style={shellBackgroundStyle}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30" style={meshPatternStyle} />
      <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-teal-300/10 blur-3xl" />

      <main className="relative mx-auto flex min-h-[100svh] max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:grid lg:min-h-[100svh] lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.92fr)] lg:gap-5 lg:px-6 lg:py-5">
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_26px_110px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7 lg:flex lg:min-h-0 lg:flex-col lg:justify-between lg:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-65" style={spotlightStyle} />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100 sm:text-xs">
              <Sparkles className="h-4 w-4" />
              Dispatch Command Center
            </div>

            <div className="mt-6 max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.34em] text-cyan-100/70 sm:text-sm">
                SM2 Electronics
              </p>
              <h1 className="mt-4 max-w-3xl text-[clamp(2.6rem,4vw,4.9rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-white">
                Own dispatch without the chaos.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200/78 sm:text-base">
                One sharp admin command layer for field operations, technician access, and approvals that should feel premium on both phone and laptop.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {heroSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-100 sm:text-sm"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${signal.tone} animate-pulse`} />
                  <span className="text-slate-300/75">{signal.label}</span>
                  <span className="font-semibold text-white">{signal.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {heroFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-[24px] border border-white/10 bg-slate-950/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold tracking-tight text-white">{feature.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300/76">{feature.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/28 p-5 shadow-[0_18px_60px_rgba(2,8,20,0.24)] backdrop-blur-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100/68">
                    Operations Surface
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Admin Board</h2>
                </div>
                <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
                  Live operator view
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {boardRows.map((row) => (
                  <div key={row.label}>
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-300/80">
                      <span>{row.label}</span>
                      <span>{row.width}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/8">
                      <div
                        className={`h-2.5 rounded-full bg-gradient-to-r ${row.tint}`}
                        style={{ width: row.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300/65">Dispatch</p>
                  <p className="mt-2 text-sm font-semibold text-white">Realtime visibility</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300/65">Approvals</p>
                  <p className="mt-2 text-sm font-semibold text-white">Cleaner flow</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300/65">Access</p>
                  <p className="mt-2 text-sm font-semibold text-white">Controlled</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-cyan-300/14 to-transparent p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-cyan-100">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300/70">Queue Watch</p>
                    <p className="mt-1 text-lg font-semibold text-white">Priority handoffs stay visible</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-300/78">
                  Password resets, technician approvals, and blocked invoices stay clear without turning the page into a spreadsheet.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-300/12 text-emerald-100">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300/70">Operator Notes</p>
                    <p className="mt-1 text-lg font-semibold text-white">Built to read fast</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2.5">
                  <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-3 text-sm text-slate-200">
                    <span>Tech management</span>
                    <span className="font-semibold text-cyan-100">Centralized</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-3 text-sm text-slate-200">
                    <span>Approvals</span>
                    <span className="font-semibold text-emerald-100">Streamlined</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-3 text-sm text-slate-200">
                    <span>Screen fit</span>
                    <span className="font-semibold text-teal-100">Balanced</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-6 flex flex-col gap-2 border-t border-white/10 pt-4 text-sm text-slate-300/76 sm:flex-row sm:items-center sm:justify-between">
            <p>Administrative workspace for dispatch coordination, technician access, and approvals.</p>
            <p className="text-cyan-100/70">&copy; {new Date().getFullYear()} SM2 Electronics</p>
          </div>
        </section>

        <section className="relative flex items-center justify-center">
          <div className="relative w-full max-w-[540px]">
            <div className="absolute inset-3 rounded-[34px] bg-gradient-to-br from-cyan-300/26 via-white/10 to-teal-400/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-[34px] border border-white/12 bg-[#f6f8fb]/95 p-5 text-slate-900 shadow-[0_30px_120px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-7">
              <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.22),rgba(255,255,255,0)_72%)]" />

              <div className="relative">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/72 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 shadow-sm">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#008c88]" />
                      Admin Portal
                    </div>
                    <h2 className="mt-4 max-w-md text-[clamp(2rem,3vw,3rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-slate-950">
                      Sign in to the admin control layer.
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-[15px]">
                      Access dispatch oversight, technician management, reporting, invoicing, and settings from one protected workspace.
                    </p>
                  </div>

                  <div className="rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm font-medium text-emerald-700 shadow-sm">
                    Protected access
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {capabilityPills.map((capability) => (
                    <span
                      key={capability}
                      className="rounded-full border border-slate-200 bg-white/78 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                    >
                      {capability}
                    </span>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] sm:p-6">
                    <div className="space-y-4">
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
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200/90 bg-slate-50/92 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
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

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
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

                <div className="mt-5 rounded-[26px] border border-slate-200 bg-gradient-to-r from-slate-950 to-slate-900 px-5 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)]">
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
