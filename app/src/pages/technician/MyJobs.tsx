import { useState, useEffect } from 'react';
import {
    Calendar,
    Clock,
    User,
    Briefcase,
    MapPin,
    Play,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    X,
    RefreshCw,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
    completeTechnicianMyJob,
    delayTechnicianMyJob,
    fetchAdminTechnicianJobsFeed,
    fetchTechnicianJobsFeed,
    getStoredAdminToken,
    getStoredTechnicianToken,
    refuseTechnicianMyJob,
    startTechnicianMyJob,
    type BackendTechnicianJobFeedItem,
} from '@/lib/backend-api';
import { DISPATCH_JOB_STATUS, normalizeDispatchJobStatus } from '@/lib/job-status';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// --- Types ---

type JobStatus = 'scheduled' | 'in_progress' | 'delayed' | 'completed' | 'unknown';
type Urgency = 'low' | 'normal' | 'high' | 'critical';

interface MyJob {
    job_id: string;
    job_code: string;
    dealership_name: string;
    service_name: string;
    job_status: JobStatus;
    urgency?: Urgency;
    scheduled_time?: string;
    zone: string;
    allowed_actions: ('start' | 'done' | 'delay' | 'refuse')[];
}

const mapBackendFeedItemToMyJob = (item: BackendTechnicianJobFeedItem): MyJob | null => {
    const status = normalizeDispatchJobStatus(item.status);
    if (
        status === DISPATCH_JOB_STATUS.CANCELLED
        || status === DISPATCH_JOB_STATUS.ADMIN_PREVIEW
        || status === DISPATCH_JOB_STATUS.PENDING_ADMIN_CONFIRMATION
        || status === DISPATCH_JOB_STATUS.PENDING_REVIEW
        || status === DISPATCH_JOB_STATUS.READY_FOR_TECH
    ) {
        return null;
    }

    const mappedStatus: JobStatus =
        status === DISPATCH_JOB_STATUS.SCHEDULED ? 'scheduled'
            : status === DISPATCH_JOB_STATUS.IN_PROGRESS ? 'in_progress'
                : status === DISPATCH_JOB_STATUS.DELAYED ? 'delayed'
                    : status === DISPATCH_JOB_STATUS.COMPLETED ? 'completed'
                        : 'unknown';

    const allowedActions: MyJob['allowed_actions'] =
        mappedStatus === 'in_progress'
            ? ['done', 'delay']
            : mappedStatus === 'delayed'
                ? ['start', 'refuse']
                : mappedStatus === 'completed'
                    ? []
                    : mappedStatus === 'unknown'
                        ? []
                        : ['start', 'delay', 'refuse'];

    const scheduledTime = item.requested_service_date
        ? `${item.requested_service_date}T${(item.requested_service_time || '09:00:00').slice(0, 8)}`
        : undefined;

    return {
        job_id: item.id,
        job_code: item.job_code,
        dealership_name: item.dealership_name || 'Unknown Dealership',
        service_name: item.service_name || 'Service Request',
        job_status: mappedStatus,
        urgency: 'normal',
        scheduled_time: scheduledTime,
        zone: item.zone_name || 'Unspecified',
        allowed_actions: allowedActions,
    };
};

// --- Components ---

function StatusBadge({ status }: { status: JobStatus }) {
    const styles: Record<JobStatus, string> = {
        scheduled: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
        in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
        delayed: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700',
        completed: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600',
        unknown: 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
    };

    const labels: Record<JobStatus, string> = {
        scheduled: 'Scheduled',
        in_progress: 'In Progress',
        delayed: 'Delayed',
        completed: 'Completed',
        unknown: 'Unknown',
    };

    return (
        <Badge variant="outline" className={cn('font-semibold text-xs px-2.5 py-0.5 border', styles[status])}>
            {labels[status]}
        </Badge>
    );
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
    const styles: Record<Urgency, string> = {
        critical: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
        high: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700',
        normal: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
        low: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600',
    };

    const labels: Record<Urgency, string> = {
        critical: 'Critical',
        high: 'High',
        normal: 'Normal',
        low: 'Low',
    };

    return (
        <Badge
            variant="outline"
            className={cn(
                'font-semibold text-xs px-2.5 py-0.5 border',
                styles[urgency],
                urgency === 'critical' && 'animate-pulse'
            )}
        >
            {labels[urgency]}
        </Badge>
    );
}

function JobCard({
    job,
    onStart,
    onDone,
    onDelay,
    onRefuse,
}: {
    job: MyJob;
    onStart: (jobId: string) => void;
    onDone: (jobId: string) => void;
    onDelay: (jobId: string) => void;
    onRefuse: (jobId: string) => void;
}) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const handleAction = async (action: string, handler: (jobId: string) => void) => {
        setActionLoading(action);
        await new Promise(resolve => setTimeout(resolve, 600));
        handler(job.job_id);
        setActionLoading(null);
    };

    const formatScheduledDateTime = (isoString: string): string => {
        const date = new Date(isoString);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
        return `${formattedDate} • ${formattedTime}`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-5 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                            {job.job_code}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-0.5">
                            {job.service_name}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge status={job.job_status} />
                        {job.urgency && <UrgencyBadge urgency={job.urgency} />}
                    </div>
                </div>

                {/* Dealership */}
                <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {job.dealership_name}
                    </span>
                </div>

                {/* Zone & Scheduled Time */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4 text-[#2F8E92] dark:text-teal-400" />
                        <span className="font-medium">{job.zone}</span>
                    </div>
                    {job.scheduled_time && (
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">{formatScheduledDateTime(job.scheduled_time)}</span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {job.allowed_actions.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2">
                        {job.allowed_actions.includes('start') && (
                            <Button
                                onClick={() => handleAction('start', onStart)}
                                disabled={!!actionLoading}
                                className={cn(
                                    "flex-1 h-11 text-sm font-semibold rounded-xl",
                                    "bg-[#2F8E92] hover:bg-[#267276] text-white",
                                    "disabled:opacity-50"
                                )}
                            >
                                {actionLoading === 'start' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4 mr-2" />
                                )}
                                START
                            </Button>
                        )}

                        {job.allowed_actions.includes('done') && (
                            <Button
                                onClick={() => handleAction('done', onDone)}
                                disabled={!!actionLoading}
                                className={cn(
                                    "flex-1 h-11 text-sm font-semibold rounded-xl",
                                    "bg-emerald-600 hover:bg-emerald-700 text-white",
                                    "disabled:opacity-50"
                                )}
                            >
                                {actionLoading === 'done' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                )}
                                DONE
                            </Button>
                        )}

                        {job.allowed_actions.includes('delay') && (
                            <Button
                                onClick={() => handleAction('delay', onDelay)}
                                disabled={!!actionLoading}
                                variant="outline"
                                className={cn(
                                    "flex-1 h-11 text-sm font-semibold rounded-xl",
                                    "border-2 border-orange-500 text-orange-600 hover:bg-orange-50",
                                    "dark:border-orange-600 dark:text-orange-500 dark:hover:bg-orange-900/20",
                                    "disabled:opacity-50"
                                )}
                            >
                                {actionLoading === 'delay' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                )}
                                DELAY
                            </Button>
                        )}

                        {job.allowed_actions.includes('refuse') && (
                            <Button
                                onClick={() => handleAction('refuse', onRefuse)}
                                disabled={!!actionLoading}
                                variant="outline"
                                className={cn(
                                    "flex-1 h-11 text-sm font-semibold rounded-xl",
                                    "border-2 border-red-500 text-red-600 hover:bg-red-50",
                                    "dark:border-red-600 dark:text-red-500 dark:hover:bg-red-900/20",
                                    "disabled:opacity-50"
                                )}
                            >
                                {actionLoading === 'refuse' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-2" />
                                )}
                                REFUSE
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function BottomNav({
    activeTab,
    routeBase,
}: {
    activeTab: 'jobs' | 'current-job' | 'history' | 'profile';
    routeBase: string;
}) {
    const navigate = useNavigate();

    const tabs = [
        { id: 'jobs', label: 'Jobs', icon: Briefcase, path: `${routeBase}/jobs` },
        { id: 'current-job', label: 'Current Job', icon: Calendar, path: `${routeBase}/current-job` },
        { id: 'history', label: 'History', icon: Clock, path: `${routeBase}/history` },
        { id: 'profile', label: 'Profile', icon: User, path: `${routeBase}/profile` },
    ] as const;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl z-50 safe-area-bottom">
            <div className="max-w-2xl mx-auto px-2 py-2">
                <div className="flex items-center justify-around gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => navigate(tab.path)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 px-4 py-2.5 rounded-xl transition-all duration-200 flex-1",
                                    isActive
                                        ? "bg-[#2F8E92]/10 dark:bg-[#2F8E92]/20 text-[#2F8E92] dark:text-teal-400"
                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
                                <span className={cn("text-xs font-semibold", isActive && "font-bold")}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// --- Main Component ---

export default function MyJobsPage({
    viewMode = 'current',
}: {
    viewMode?: 'current' | 'history';
}) {
    const { techId: previewTechId } = useParams();
    const routeBase = previewTechId ? `/admin/tech-preview/${previewTechId}` : '/tech';
    const { user } = useAuth();
    const [jobs, setJobs] = useState<MyJob[]>([]);
    const [loading, setLoading] = useState(true);
    const isHistoryMode = viewMode === 'history';

    // Modals
    const [delayModalOpen, setDelayModalOpen] = useState(false);
    const [refuseModalOpen, setRefuseModalOpen] = useState(false);
    const [doneModalOpen, setDoneModalOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

    // Delay Modal State
    const [delayMinutes, setDelayMinutes] = useState<string>('15');
    const [delayCustomMinutes, setDelayCustomMinutes] = useState('');
    const [delayNote, setDelayNote] = useState('');

    // Refuse Modal State
    const [refuseReason, setRefuseReason] = useState('');
    const [refuseComment, setRefuseComment] = useState('');

    // Action Loading
    const [confirmLoading, setConfirmLoading] = useState(false);

    useEffect(() => {
        void fetchJobs();
    }, [previewTechId, user?.id, user?.role]);

    useEffect(() => {
        if (previewTechId) return;
        const intervalId = setInterval(() => {
            void fetchJobs();
        }, 10000);
        const onFocus = () => { void fetchJobs(); };
        window.addEventListener('focus', onFocus);
        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', onFocus);
        };
    }, [previewTechId, user?.id, user?.role]);

    const fetchJobs = async () => {
        setLoading(true);
        if (previewTechId) {
            const adminToken = getStoredAdminToken();
            if (!adminToken) {
                setJobs([]);
                setLoading(false);
                return;
            }
            try {
                const feed = await fetchAdminTechnicianJobsFeed(adminToken, previewTechId);
                const mapped = feed.my_jobs
                    .map(mapBackendFeedItemToMyJob)
                    .filter((job): job is MyJob => job !== null);
                setJobs(mapped);
            } catch {
                setJobs([]);
            }
            setLoading(false);
            return;
        }

        const token = getStoredTechnicianToken();
        if (!token || user?.role !== 'technician') {
            setJobs([]);
            setLoading(false);
            return;
        }

        try {
            const feed = await fetchTechnicianJobsFeed(token);
            const mapped = feed.my_jobs
                .map(mapBackendFeedItemToMyJob)
                .filter((job): job is MyJob => job !== null);
            setJobs(mapped);
        } catch {
            setJobs([]);
        }
        setLoading(false);
    };

    const activeJobs = jobs.filter(j => ['scheduled', 'in_progress', 'delayed', 'unknown'].includes(j.job_status));
    const completedJobs = jobs.filter(j => j.job_status === 'completed');

    // Handlers
    const handleStart = async (jobId: string) => {
        if (previewTechId) {
            setJobs(prev => prev.map(j =>
                j.job_id === jobId
                    ? { ...j, job_status: 'in_progress' as JobStatus, allowed_actions: ['done', 'delay'] }
                    : j
            ));
            return;
        }

        const token = getStoredTechnicianToken();
        if (!token || user?.role !== 'technician') return;

        try {
            await startTechnicianMyJob(token, jobId);
            await fetchJobs();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to start job.';
            toast.error(message);
        }
    };

    const handleDone = (jobId: string) => {
        setSelectedJobId(jobId);
        setDoneModalOpen(true);
    };

    const confirmDone = async () => {
        if (!selectedJobId) return;

        setConfirmLoading(true);
        if (previewTechId) {
            await new Promise(resolve => setTimeout(resolve, 800));
            setJobs(prev => prev.map(j =>
                j.job_id === selectedJobId
                    ? { ...j, job_status: 'completed' as JobStatus, allowed_actions: [] }
                    : j
            ));
        } else {
            const token = getStoredTechnicianToken();
            if (token && user?.role === 'technician') {
                try {
                    await completeTechnicianMyJob(token, selectedJobId);
                    await fetchJobs();
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Failed to complete job.';
                    toast.error(message);
                }
            }
        }

        setConfirmLoading(false);
        setDoneModalOpen(false);
        setSelectedJobId(null);
    };

    const handleDelay = (jobId: string) => {
        setSelectedJobId(jobId);
        setDelayModalOpen(true);
    };

    const confirmDelay = async () => {
        if (!selectedJobId) return;

        const minutes = delayMinutes === 'custom'
            ? parseInt(delayCustomMinutes)
            : parseInt(delayMinutes);

        if (!minutes || minutes <= 0) return;

        setConfirmLoading(true);
        if (previewTechId) {
            await new Promise(resolve => setTimeout(resolve, 800));
            setJobs(prev => prev.map(j =>
                j.job_id === selectedJobId
                    ? { ...j, job_status: 'delayed' as JobStatus }
                    : j
            ));
        } else {
            const token = getStoredTechnicianToken();
            if (token && user?.role === 'technician') {
                try {
                    await delayTechnicianMyJob(token, selectedJobId, {
                        minutes,
                        note: delayNote || undefined,
                    });
                    await fetchJobs();
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Failed to delay job.';
                    toast.error(message);
                }
            }
        }

        // Reset form
        setDelayMinutes('15');
        setDelayCustomMinutes('');
        setDelayNote('');
        setConfirmLoading(false);
        setDelayModalOpen(false);
        setSelectedJobId(null);
    };

    const handleRefuse = (jobId: string) => {
        setSelectedJobId(jobId);
        setRefuseModalOpen(true);
    };

    const confirmRefuse = async () => {
        if (!selectedJobId || !refuseReason) return;

        setConfirmLoading(true);
        if (previewTechId) {
            await new Promise(resolve => setTimeout(resolve, 800));
            setJobs(prev => prev.filter(j => j.job_id !== selectedJobId));
        } else {
            const token = getStoredTechnicianToken();
            if (token && user?.role === 'technician') {
                try {
                    await refuseTechnicianMyJob(token, selectedJobId, {
                        reason: refuseReason,
                        comment: refuseComment || undefined,
                    });
                    await fetchJobs();
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Failed to refuse job.';
                    toast.error(message);
                }
            }
        }

        // Reset form
        setRefuseReason('');
        setRefuseComment('');
        setConfirmLoading(false);
        setRefuseModalOpen(false);
        setSelectedJobId(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                            {isHistoryMode ? 'Job History' : 'Current Job'}
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {isHistoryMode ? `${completedJobs.length} completed` : `${activeJobs.length} active`}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void fetchJobs()}
                        className="h-9 gap-2 border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                        disabled={loading}
                    >
                        <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Job List */}
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">
                {loading ? (
                    // Loading State
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse"
                            >
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
                                <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {isHistoryMode ? (
                            <>
                                {completedJobs.length > 0 ? (
                                    <div className="space-y-3">
                                        {completedJobs.map((job) => (
                                            <JobCard
                                                key={job.job_id}
                                                job={job}
                                                onStart={handleStart}
                                                onDone={handleDone}
                                                onDelay={handleDelay}
                                                onRefuse={handleRefuse}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-5">
                                            <Clock className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                            No Job History Yet
                                        </h3>
                                        <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                                            Completed jobs will appear here after you finish them.
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Active Jobs */}
                                {activeJobs.length > 0 && (
                                    <div className="space-y-3">
                                        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                                            Active
                                        </h2>
                                        {activeJobs.map((job) => (
                                            <JobCard
                                                key={job.job_id}
                                                job={job}
                                                onStart={handleStart}
                                                onDone={handleDone}
                                                onDelay={handleDelay}
                                                onRefuse={handleRefuse}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Empty State */}
                                {activeJobs.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-5">
                                            <Calendar className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                            No Current Jobs
                                        </h3>
                                        <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                                            New confirmed jobs from admin will appear in the Jobs tab.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Delay Modal */}
            <Dialog open={delayModalOpen} onOpenChange={setDelayModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delay Job</DialogTitle>
                        <DialogDescription>
                            Select delay duration and add an optional note
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="delay-minutes">Delay Duration</Label>
                            <Select value={delayMinutes} onValueChange={setDelayMinutes}>
                                <SelectTrigger id="delay-minutes">
                                    <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="15">15 minutes</SelectItem>
                                    <SelectItem value="30">30 minutes</SelectItem>
                                    <SelectItem value="60">60 minutes</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {delayMinutes === 'custom' && (
                            <div className="space-y-2">
                                <Label htmlFor="custom-minutes">Custom Minutes</Label>
                                <Input
                                    id="custom-minutes"
                                    type="number"
                                    placeholder="Enter minutes"
                                    value={delayCustomMinutes}
                                    onChange={(e) => setDelayCustomMinutes(e.target.value)}
                                    min="1"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="delay-note">Note (Optional)</Label>
                            <Textarea
                                id="delay-note"
                                placeholder="Add a note about the delay..."
                                value={delayNote}
                                onChange={(e) => setDelayNote(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDelayModalOpen(false);
                                setDelayMinutes('15');
                                setDelayCustomMinutes('');
                                setDelayNote('');
                            }}
                            disabled={confirmLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmDelay}
                            disabled={confirmLoading || (delayMinutes === 'custom' && !delayCustomMinutes)}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {confirmLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm Delay
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Refuse Modal */}
            <Dialog open={refuseModalOpen} onOpenChange={setRefuseModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Refuse Job</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for refusing this job
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="refuse-reason">Reason *</Label>
                            <Select value={refuseReason} onValueChange={setRefuseReason}>
                                <SelectTrigger id="refuse-reason">
                                    <SelectValue placeholder="Select a reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="too_far">Too far from location</SelectItem>
                                    <SelectItem value="no_equipment">Don't have required equipment</SelectItem>
                                    <SelectItem value="schedule_conflict">Schedule conflict</SelectItem>
                                    <SelectItem value="vehicle_issue">Vehicle issue</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="refuse-comment">Additional Comment (Optional)</Label>
                            <Textarea
                                id="refuse-comment"
                                placeholder="Add any additional details..."
                                value={refuseComment}
                                onChange={(e) => setRefuseComment(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRefuseModalOpen(false);
                                setRefuseReason('');
                                setRefuseComment('');
                            }}
                            disabled={confirmLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmRefuse}
                            disabled={confirmLoading || !refuseReason}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {confirmLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm Refuse
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Done Confirmation Modal */}
            <Dialog open={doneModalOpen} onOpenChange={setDoneModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Complete Job</DialogTitle>
                        <DialogDescription>
                            Mark this job as completed?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            This action will mark the job as completed and move it to your completed jobs list.
                        </p>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDoneModalOpen(false)}
                            disabled={confirmLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmDone}
                            disabled={confirmLoading}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {confirmLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm Complete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bottom Navigation */}
            <BottomNav activeTab={isHistoryMode ? 'history' : 'current-job'} routeBase={routeBase} />
        </div>
    );
}


