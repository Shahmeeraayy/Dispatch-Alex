import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import {
    Search,
    Download,
    RefreshCw,
    Send,
    FileText,
    Building2,
    Calendar,
    ArrowUpRight,
    CheckCircle2,
    AlertTriangle,
    Clock3,
    Link2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { exportArrayData, selectColumnsForExport, type ExportFormat } from '@/lib/export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ColumnExportDialog from '@/components/modals/ColumnExportDialog';
import { fetchInvoices, getStoredAdminToken, syncInvoiceToQuickBooks, type BackendInvoice } from '@/lib/backend-api';

const INVOICE_HISTORY_EXPORT_COLUMNS = [
    'InvoiceID',
    'JobCode',
    'Dealership',
    'Technician',
    'Amount',
    'ApprovedAt',
    'ApprovedBy',
    'Status',
];

type InvoiceStatusFilter = 'all' | 'draft' | 'sent' | 'sync_failed' | 'paid' | 'overdue' | 'cancelled';
type InvoicePeriodFilter = 'all' | 'today' | '7d' | '30d' | '90d' | 'year';
type InvoiceDisplayStatus = Exclude<InvoiceStatusFilter, 'all'>;

const toNumber = (value: string | number | null | undefined): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const formatTermsLabel = (terms?: string, customDays?: number | null) => {
    if (!terms) return 'Net 15';
    if (terms === 'NET_15') return 'Net 15';
    if (terms === 'NET_30') return 'Net 30';
    if (terms === 'CUSTOM') return `Custom (${customDays ?? 0} days)`;
    return terms;
};

const extractJobCodeFromInvoice = (invoice: BackendInvoice): string => {
    if (invoice.job_code && invoice.job_code.trim()) {
        return invoice.job_code.trim();
    }
    const regex = /SM2-\d{4}-\d+/i;
    for (const line of invoice.line_items || []) {
        const text = `${line.description || ''} ${line.product_service || ''}`;
        const match = text.match(regex);
        if (match) return match[0].toUpperCase();
    }
    return '-';
};

const resolveTechnician = (invoice: BackendInvoice): string => invoice.technician_name?.trim() || '-';

const resolveInvoiceDisplayStatus = (
    invoice: BackendInvoice,
): {
    value: InvoiceDisplayStatus;
    label: string;
    badgeClassName: string;
} => {
    if (invoice.qb_sync_status === 'failed') {
        return {
            value: 'sync_failed',
            label: 'Sync Failed',
            badgeClassName: 'bg-red-500/10 text-red-500 border-red-500/20',
        };
    }
    if (invoice.status === 'paid') {
        return {
            value: 'paid',
            label: 'Paid',
            badgeClassName: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        };
    }
    if (invoice.status === 'sent') {
        return {
            value: 'sent',
            label: 'Sent',
            badgeClassName: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        };
    }
    if (invoice.status === 'overdue') {
        return {
            value: 'overdue',
            label: 'Overdue',
            badgeClassName: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        };
    }
    if (invoice.status === 'cancelled') {
        return {
            value: 'cancelled',
            label: 'Cancelled',
            badgeClassName: 'bg-red-500/10 text-red-500 border-red-500/20',
        };
    }
    return {
        value: 'draft',
        label: 'Draft',
        badgeClassName: 'bg-gray-500/10 text-muted-foreground border-border',
    };
};

const resolveQuickBooksSyncPresentation = (invoice: BackendInvoice) => {
    const syncStatus = invoice.qb_sync_status || 'pending';
    if (syncStatus === 'synced') {
        return {
            className: 'text-emerald-500',
            icon: CheckCircle2,
            label: invoice.qb_invoice_id ? `Synced to QuickBooks (${invoice.qb_invoice_id})` : 'Synced to QuickBooks',
        };
    }
    if (syncStatus === 'failed') {
        return {
            className: 'text-red-400',
            icon: AlertTriangle,
            label: 'QuickBooks sync failed',
        };
    }
    return {
        className: 'text-amber-400',
        icon: Clock3,
        label: 'QuickBooks sync pending',
    };
};

const toAddressLines = (party?: {
    name?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
}) => {
    if (!party) return [];
    const lines: string[] = [];
    if (party.name) lines.push(party.name);
    if (party.street) lines.push(party.street);
    const cityStateZip = [party.city, party.state, party.zip_code].filter(Boolean).join(', ').replace(', ,', ',');
    if (cityStateZip) lines.push(cityStateZip);
    return lines;
};

export default function InvoiceHistoryPage() {
    const [history, setHistory] = useState<BackendInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<InvoiceStatusFilter>('all');
    const [filterPeriod, setFilterPeriod] = useState<InvoicePeriodFilter>('all');
    const [selectedInvoice, setSelectedInvoice] = useState<BackendInvoice | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [retryingInvoiceId, setRetryingInvoiceId] = useState<string | null>(null);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const adminToken = getStoredAdminToken();
            if (!adminToken) {
                setHistory([]);
                return;
            }
            const rows = await fetchInvoices(adminToken);
            setHistory(rows);
        } catch (error) {
            console.error(error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchHistory();
    }, []);

    const filteredHistory = useMemo(() => history.filter((inv) => {
        const query = searchQuery.toLowerCase().trim();
        const approvedDate = new Date(inv.created_at);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const jobCode = extractJobCodeFromInvoice(inv).toLowerCase();
        const dealership = (inv.dealership_name || inv.bill_to?.name || '').toLowerCase();
        const technician = resolveTechnician(inv).toLowerCase();

        const matchesSearch =
            query.length === 0 ||
            jobCode.includes(query) ||
            dealership.includes(query) ||
            technician.includes(query) ||
            inv.invoice_number.toLowerCase().includes(query);

        const displayStatus = resolveInvoiceDisplayStatus(inv);
        const matchesStatus = filterStatus === 'all' || displayStatus.value === filterStatus;

        let matchesPeriod = true;
        if (filterPeriod !== 'all') {
            if (Number.isNaN(approvedDate.getTime())) {
                matchesPeriod = false;
            } else {
                const now = new Date();
                switch (filterPeriod) {
                    case 'today':
                        matchesPeriod = approvedDate >= todayStart;
                        break;
                    case '7d': {
                        const start = new Date(now);
                        start.setDate(now.getDate() - 7);
                        matchesPeriod = approvedDate >= start;
                        break;
                    }
                    case '30d': {
                        const start = new Date(now);
                        start.setDate(now.getDate() - 30);
                        matchesPeriod = approvedDate >= start;
                        break;
                    }
                    case '90d': {
                        const start = new Date(now);
                        start.setDate(now.getDate() - 90);
                        matchesPeriod = approvedDate >= start;
                        break;
                    }
                    case 'year': {
                        const start = new Date(now.getFullYear(), 0, 1);
                        matchesPeriod = approvedDate >= start;
                        break;
                    }
                    default:
                        matchesPeriod = true;
                }
            }
        }

        return matchesSearch && matchesStatus && matchesPeriod;
    }), [filterPeriod, filterStatus, history, searchQuery]);

    const handleViewInvoice = (invoice: BackendInvoice) => {
        setSelectedInvoice(invoice);
        setDrawerOpen(true);
    };

    const handleResendToQuickBooks = async (invoice: BackendInvoice) => {
        const adminToken = getStoredAdminToken();
        if (!adminToken) return;

        setRetryingInvoiceId(invoice.id);
        try {
            const updated = await syncInvoiceToQuickBooks(adminToken, invoice.id);
            setHistory((current) => current.map((row) => (row.id === updated.id ? updated : row)));
            setSelectedInvoice((current) => (current?.id === updated.id ? updated : current));
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'QuickBooks resend failed';
            alert(message);
        } finally {
            setRetryingInvoiceId(null);
        }
    };

    const getInvoiceHistoryExportRows = () => filteredHistory.map((invoice) => ({
        InvoiceID: invoice.invoice_number,
        JobCode: extractJobCodeFromInvoice(invoice),
        Dealership: invoice.dealership_name || invoice.bill_to?.name || '-',
        Technician: resolveTechnician(invoice),
        Amount: toNumber(invoice.total),
        ApprovedAt: invoice.created_at,
        ApprovedBy: 'System',
        Status: resolveInvoiceDisplayStatus(invoice).label,
    }));

    const handleExport = (selectedColumns: string[], format: ExportFormat = 'csv') => {
        const exportData = selectColumnsForExport(getInvoiceHistoryExportRows(), selectedColumns);
        exportArrayData(exportData, 'invoice_history_export', format);
    };

    const handleDownloadPdf = (invoice: BackendInvoice) => {
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const left = 48;
        const pageWidth = doc.internal.pageSize.getWidth();
        const rowHeight = 22;

        const lineItems = invoice.line_items.map((item) => ({
            product_service: item.product_service || 'Service',
            description: item.description || '',
            qty: toNumber(item.qty ?? item.quantity),
            rate: toNumber(item.rate),
            amount: toNumber(item.amount),
        }));

        const subtotal = toNumber(invoice.subtotal);
        const salesTax = toNumber(invoice.sales_tax_total ?? invoice.sales_tax);
        const shipping = toNumber(invoice.shipping);
        const total = toNumber(invoice.total);

        const company = invoice.company_info || {
            logo_url: '',
            name: '',
            street_address: '',
            city: '',
            state: '',
            zip_code: '',
            phone: '',
            email: '',
            website: '',
        };

        const invoiceDate = new Date(invoice.invoice_date);
        const dueDate = new Date(invoice.due_date);

        let y = 52;

        if (company.logo_url) {
            doc.setDrawColor(200, 200, 200);
            doc.rect(left, y - 8, 54, 30);
            doc.setFontSize(8);
            doc.setTextColor(110, 110, 110);
            doc.text('Logo', left + 20, y + 10);
            doc.setTextColor(0, 0, 0);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(company.name || '', left + 64, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(company.street_address || '', left + 64, y + 14);
        doc.text(`${company.city || ''}, ${company.state || ''} ${company.zip_code || ''}`.trim(), left + 64, y + 27);
        doc.text(`${company.phone || ''}  |  ${company.email || ''}`.trim(), left + 64, y + 40);
        doc.text(company.website || '', left + 64, y + 53);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('INVOICE', pageWidth - left, y, { align: 'right' });

        y += 76;
        doc.setDrawColor(220, 220, 220);
        doc.line(left, y, pageWidth - left, y);
        y += 22;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('BILL TO', left, y);
        doc.text('SHIP TO', left + 240, y);
        y += 14;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const billToLines = toAddressLines(invoice.bill_to || undefined);
        const shipToLines = toAddressLines(invoice.ship_to || undefined);
        const maxAddressLines = Math.max(billToLines.length, shipToLines.length, 1);
        for (let i = 0; i < maxAddressLines; i += 1) {
            doc.text(billToLines[i] || '', left, y);
            doc.text(shipToLines[i] || '', left + 240, y);
            y += 14;
        }

        const panelTop = y - maxAddressLines * 14 - 14;
        const panelX = pageWidth - 220;
        const panelWidth = 172;
        doc.setDrawColor(220, 220, 220);
        doc.rect(panelX, panelTop - 4, panelWidth, 82);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Invoice #', panelX + 8, panelTop + 10);
        doc.text('Invoice Date', panelX + 8, panelTop + 26);
        doc.text('Terms', panelX + 8, panelTop + 42);
        doc.text('Due Date', panelX + 8, panelTop + 58);

        doc.setFont('helvetica', 'normal');
        doc.text(invoice.invoice_number, panelX + panelWidth - 8, panelTop + 10, { align: 'right' });
        doc.text(Number.isNaN(invoiceDate.getTime()) ? '-' : format(invoiceDate, 'yyyy-MM-dd'), panelX + panelWidth - 8, panelTop + 26, { align: 'right' });
        doc.text(formatTermsLabel(invoice.terms, invoice.custom_term_days), panelX + panelWidth - 8, panelTop + 42, { align: 'right' });
        doc.text(Number.isNaN(dueDate.getTime()) ? '-' : format(dueDate, 'yyyy-MM-dd'), panelX + panelWidth - 8, panelTop + 58, { align: 'right' });

        y += 20;
        doc.setDrawColor(220, 220, 220);
        doc.line(left, y, pageWidth - left, y);
        y += 18;

        const colProduct = left;
        const colDescription = left + 150;
        const colQty = pageWidth - 230;
        const colRate = pageWidth - 150;
        const colAmount = pageWidth - left;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Product/Service', colProduct, y);
        doc.text('Description', colDescription, y);
        doc.text('Qty/Hrs', colQty, y, { align: 'right' });
        doc.text('Rate', colRate, y, { align: 'right' });
        doc.text('Amount', colAmount, y, { align: 'right' });
        y += 10;
        doc.line(left, y, pageWidth - left, y);
        y += 14;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        lineItems.forEach((item) => {
            if (y > doc.internal.pageSize.getHeight() - 160) {
                doc.addPage();
                y = 56;
            }
            doc.text(item.product_service.slice(0, 26), colProduct, y);
            doc.text(item.description.slice(0, 32), colDescription, y);
            doc.text(item.qty.toFixed(2), colQty, y, { align: 'right' });
            doc.text(`$${item.rate.toFixed(2)}`, colRate, y, { align: 'right' });
            doc.text(`$${item.amount.toFixed(2)}`, colAmount, y, { align: 'right' });
            y += rowHeight;
        });

        y += 4;
        doc.line(left, y, pageWidth - left, y);
        y += 18;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Subtotal', colRate - 40, y, { align: 'right' });
        doc.text(`$${subtotal.toFixed(2)}`, colAmount, y, { align: 'right' });
        y += 16;
        doc.text('Sales Tax', colRate - 40, y, { align: 'right' });
        doc.text(`$${salesTax.toFixed(2)}`, colAmount, y, { align: 'right' });
        y += 16;
        doc.text('Shipping', colRate - 40, y, { align: 'right' });
        doc.text(`$${shipping.toFixed(2)}`, colAmount, y, { align: 'right' });
        y += 18;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Total', colRate - 40, y, { align: 'right' });
        doc.text(`$${total.toFixed(2)}`, colAmount, y, { align: 'right' });

        if (invoice.customer_message?.trim()) {
            y += 28;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Customer Message', left, y);
            y += 14;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const lines = doc.splitTextToSize(invoice.customer_message, pageWidth - (left * 2));
            doc.text(lines, left, y);
        }

        doc.save(`${invoice.invoice_number}.pdf`);
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Invoice History</h1>
                    <p className="text-sm text-muted-foreground font-medium">Archive of all approved and processed invoices</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <Button variant="outline" size="sm" onClick={() => void fetchHistory()} className="h-9 gap-2">
                        <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setExportModalOpen(true)}>
                        <Download className="w-4 h-4" /> Export Archive
                    </Button>
                </div>
            </div>

            <ColumnExportDialog
                open={exportModalOpen}
                onOpenChange={setExportModalOpen}
                title="Export Invoice History"
                description="Select the invoice history columns you want in your CSV."
                availableColumns={INVOICE_HISTORY_EXPORT_COLUMNS}
                onConfirm={handleExport}
            />

            <Card className="p-4 border-border shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by invoice, job code, dealership..."
                            className="pl-9 bg-muted/30 border-border focus:bg-background transition-all h-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as InvoiceStatusFilter)}>
                            <SelectTrigger className="w-[150px] h-10">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="sync_failed">Sync Failed</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterPeriod} onValueChange={(value) => setFilterPeriod(value as InvoicePeriodFilter)}>
                            <SelectTrigger className="w-[150px] h-10">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <SelectValue placeholder="Period" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Periods</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="7d">Last 7 days</SelectItem>
                                <SelectItem value="30d">Last 30 days</SelectItem>
                                <SelectItem value="90d">Last 90 days</SelectItem>
                                <SelectItem value="year">This year</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[500px]">
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-medium text-foreground">No invoices found</p>
                        <p className="text-sm">Try adjusting your search filters</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6">Invoice / Job</TableHead>
                                <TableHead>Dealership</TableHead>
                                <TableHead>Technician</TableHead>
                                <TableHead>Created Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="w-[80px] pr-6"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredHistory.map((inv) => (
                                (() => {
                                    const displayStatus = resolveInvoiceDisplayStatus(inv);
                                    return (
                                <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => handleViewInvoice(inv)}>
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground text-sm">{inv.invoice_number}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{extractJobCodeFromInvoice(inv)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-foreground font-medium text-sm">{inv.dealership_name || inv.bill_to?.name || '-'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-[#2F8E92]/10 flex items-center justify-center text-[10px] font-bold text-[#2F8E92]">
                                                {resolveTechnician(inv).substring(0, 2)}
                                            </div>
                                            <span className="text-foreground text-sm">{resolveTechnician(inv)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-muted-foreground text-xs">{format(new Date(inv.created_at), 'MMM dd, yyyy - HH:mm')}</span>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-foreground">
                                        ${toNumber(inv.total).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge
                                            variant="outline"
                                            className={cn('text-[10px] px-2 py-0.5', displayStatus.badgeClassName)}
                                        >
                                            {displayStatus.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="pr-6 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowUpRight className="w-4 h-4 text-[#2F8E92]" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                    );
                                })()
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent className="sm:max-w-xl w-full flex flex-col p-0">
                    {selectedInvoice && (
                        (() => {
                            const displayStatus = resolveInvoiceDisplayStatus(selectedInvoice);
                            return (
                        <>
                            <div className="p-6 bg-muted/30 border-b border-border">
                                <SheetHeader>
                                    <div className="flex items-center justify-between mb-4">
                                        <Badge className={cn('border', displayStatus.badgeClassName)}>
                                            {displayStatus.value === 'sync_failed' ? (
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                            ) : (
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                            )}
                                            {displayStatus.label}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">Source: Backend</span>
                                    </div>
                                    <SheetTitle className="text-2xl font-bold text-foreground">{selectedInvoice.invoice_number}</SheetTitle>
                                    <SheetDescription>Invoice details for job {extractJobCodeFromInvoice(selectedInvoice)}</SheetDescription>
                                </SheetHeader>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-8">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Dealership</label>
                                            <p className="text-foreground font-semibold">{selectedInvoice.dealership_name || selectedInvoice.bill_to?.name || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Technician</label>
                                            <p className="text-foreground font-semibold">{resolveTechnician(selectedInvoice)}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Created At</label>
                                            <p className="text-foreground text-sm">{format(new Date(selectedInvoice.created_at), 'PPPP - HH:mm')}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">QB Sync Status</label>
                                            {(() => {
                                                const syncPresentation = resolveQuickBooksSyncPresentation(selectedInvoice);
                                                const SyncIcon = syncPresentation.icon;
                                                return (
                                                    <div className="space-y-1">
                                                        <p className={cn('text-sm font-medium flex items-center gap-1', syncPresentation.className)}>
                                                            <SyncIcon className="w-3 h-3" /> {syncPresentation.label}
                                                        </p>
                                                        {selectedInvoice.qb_sync_error ? (
                                                            <p className="text-xs text-red-400">
                                                                {selectedInvoice.qb_sync_error}
                                                            </p>
                                                        ) : null}
                                                        {selectedInvoice.qb_customer_id ? (
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Link2 className="w-3 h-3" />
                                                                Customer ID: {selectedInvoice.qb_customer_id}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-border overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="text-[10px] uppercase font-bold">Line Description</TableHead>
                                                    <TableHead className="text-[10px] uppercase font-bold text-center w-[60px]">Qty</TableHead>
                                                    <TableHead className="text-[10px] uppercase font-bold text-right w-[100px]">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedInvoice.line_items.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="text-sm text-foreground py-3">{item.description || item.product_service}</TableCell>
                                                        <TableCell className="text-sm text-center py-3">{toNumber(item.qty ?? item.quantity).toFixed(2)}</TableCell>
                                                        <TableCell className="text-sm text-right font-mono py-3">${toNumber(item.amount).toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <div className="p-4 bg-muted/20 border-t border-border flex justify-between items-center">
                                            <span className="text-sm font-bold text-foreground">Invoice Total</span>
                                            <span className="text-xl font-bold text-[#2F8E92] font-mono">${toNumber(selectedInvoice.total).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        {selectedInvoice.qb_sync_status === 'failed' ? (
                                            <Button
                                                className="w-full gap-2"
                                                onClick={() => void handleResendToQuickBooks(selectedInvoice)}
                                                disabled={retryingInvoiceId === selectedInvoice.id}
                                            >
                                                <Send className="w-4 h-4" />
                                                {retryingInvoiceId === selectedInvoice.id ? 'Resending...' : 'Resend to QuickBooks'}
                                            </Button>
                                        ) : null}
                                        <Button className="w-full gap-2" variant="outline" onClick={() => handleDownloadPdf(selectedInvoice)}>
                                            <Download className="w-4 h-4" /> Download PDF
                                        </Button>
                                    </div>
                                </div>
                            </ScrollArea>
                        </>
                            );
                        })()
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
