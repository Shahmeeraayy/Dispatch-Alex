import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import jsPDF from 'jspdf';
import {
    CheckCircle2,
    Save,
    Plus,
    Trash2,
    Download,
    Filter,
    RefreshCw,
    Search,
    ShieldAlert,
    User,
    ChevronRight,
    DollarSign,
    AlertTriangle,
    Pencil,
    X,
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ColumnExportDialog from '@/components/modals/ColumnExportDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    createInvoice,
    fetchAdminInvoiceBrandingSettings,
    fetchServicesCatalog,
    fetchPendingInvoiceApprovalIssues,
    fetchPendingInvoiceApprovals,
    getStoredAdminToken,
    type BackendPendingInvoiceApprovalIssue,
    type BackendPendingInvoiceApproval,
} from '@/lib/backend-api';

const INVOICE_APPROVAL_EXPORT_COLUMNS = [
    'JobCode',
    'Dealership',
    'Technician',
    'Service',
    'Vehicle',
    'CompletedAt',
    'EstimatedTotal',
    'InvoiceState',
];

type PendingInvoice = BackendPendingInvoiceApproval;
type BlockedInvoice = BackendPendingInvoiceApprovalIssue;
type EditableServiceLine = {
    id: string;
    name: string;
    qb_item_id?: string | null;
    quantity: number;
    price: number;
};
type ServiceCatalogOption = {
    name: string;
    defaultPrice: number;
    qbItemId?: string | null;
};
type InvoiceBrandingProfile = {
    logo_url?: string | null;
    name: string;
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
    phone: string;
    email: string;
    website: string;
};

const DEFAULT_INVOICE_BRANDING_PROFILE: InvoiceBrandingProfile = {
    logo_url: null,
    name: 'SM2 Dispatch',
    street_address: '123 Dispatch Ave',
    city: 'Detroit',
    state: 'MI',
    zip_code: '48226',
    phone: '+1-586-556-0113',
    email: 'billing@sm2dispatch.com',
    website: 'https://www.sm2dispatch.com',
};

const QUEBEC_GST_RATE = 0.05;
const QUEBEC_QST_RATE = 0.09975;
const QUEBEC_TOTAL_TAX_RATE = QUEBEC_GST_RATE + QUEBEC_QST_RATE;

const toNumber = (value: string | number | null | undefined): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

function StatusBadge({ status }: { status: string }) {
    if (status === 'creating') {
        return (
            <Badge variant="outline" className="animate-pulse border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                Generating...
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
            Needs Approval
        </Badge>
    );
}

export default function InvoiceApprovalsPage() {
    const isMobile = useIsMobile();
    const MIN_PREVIEW_WIDTH = 520;
    const MAX_PREVIEW_WIDTH = 980;
    const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [blockedInvoices, setBlockedInvoices] = useState<BlockedInvoice[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDealership, setFilterDealership] = useState<string>('all');
    const [filterTechnician, setFilterTechnician] = useState<string>('all');
    const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoice | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [isEditingInvoice, setIsEditingInvoice] = useState(false);
    const [editableServices, setEditableServices] = useState<EditableServiceLine[]>([]);
    const [serviceSuggestions, setServiceSuggestions] = useState<string[]>([]);
    const [serviceCatalogOptions, setServiceCatalogOptions] = useState<ServiceCatalogOption[]>([]);
    const [invoiceBranding, setInvoiceBranding] = useState<InvoiceBrandingProfile>(DEFAULT_INVOICE_BRANDING_PROFILE);
    const [previewPanelWidth, setPreviewPanelWidth] = useState(640);
    const [isResizingPreview, setIsResizingPreview] = useState(false);

    const fetchInvoicesData = async () => {
        setLoading(true);
        try {
            const adminToken = getStoredAdminToken();
            if (!adminToken) {
                setInvoices([]);
                setBlockedInvoices([]);
                setServiceSuggestions([]);
                setServiceCatalogOptions([]);
                setInvoiceBranding(DEFAULT_INVOICE_BRANDING_PROFILE);
                return;
            }
            const [rows, blockedRows, serviceRows, branding] = await Promise.all([
                fetchPendingInvoiceApprovals(adminToken),
                fetchPendingInvoiceApprovalIssues(adminToken),
                fetchServicesCatalog(adminToken),
                fetchAdminInvoiceBrandingSettings(adminToken),
            ]);
            setInvoices(rows);
            setBlockedInvoices(blockedRows);
            const nextCatalogOptions = serviceRows
                .map((service) => ({
                    name: service.name.trim(),
                    defaultPrice: toNumber(service.default_price),
                    qbItemId: service.qb_item_id,
                }))
                .filter((service) => service.name.length > 0);
            const nextSuggestions = Array.from(
                new Set(
                    nextCatalogOptions
                        .map((service) => service.name.trim())
                        .filter((serviceName) => serviceName.length > 0),
                ),
            ).sort((a, b) => a.localeCompare(b));
            setServiceSuggestions(nextSuggestions);
            setServiceCatalogOptions(nextCatalogOptions);
            setInvoiceBranding({
                logo_url: branding.logo_url,
                name: branding.name,
                street_address: branding.street_address,
                city: branding.city,
                state: branding.state,
                zip_code: branding.zip_code,
                phone: branding.phone,
                email: branding.email,
                website: branding.website,
            });
        } catch (error) {
            console.error(error);
            setInvoices([]);
            setBlockedInvoices([]);
            setServiceSuggestions([]);
            setServiceCatalogOptions([]);
            setInvoiceBranding(DEFAULT_INVOICE_BRANDING_PROFILE);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchInvoicesData();
    }, []);

    useEffect(() => {
        if (!isResizingPreview || isMobile) return;

        const handleMouseMove = (event: MouseEvent) => {
            const nextWidth = window.innerWidth - event.clientX;
            const clampedWidth = Math.max(MIN_PREVIEW_WIDTH, Math.min(MAX_PREVIEW_WIDTH, nextWidth));
            setPreviewPanelWidth(clampedWidth);
        };

        const handleMouseUp = () => {
            setIsResizingPreview(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isMobile, isResizingPreview]);

    const handlePreviewResizeMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (isMobile) return;
        if (event.button !== 0) return;
        event.preventDefault();
        setIsResizingPreview(true);
    };

    const dealershipOptions = useMemo(() => Array.from(
        new Set(
            invoices
                .map((invoice) => invoice.dealership_name.trim())
                .filter((dealership) => dealership.length > 0),
        ),
    ).sort((a, b) => a.localeCompare(b)), [invoices]);

    const technicianOptions = useMemo(() => Array.from(
        new Set(
            invoices
                .map((invoice) => (invoice.technician_name || '').trim())
                .filter((technician) => technician.length > 0),
        ),
    ).sort((a, b) => a.localeCompare(b)), [invoices]);

    const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
        const query = searchQuery.toLowerCase().trim();
        const technicianName = invoice.technician_name || '';
        const matchesSearch =
            query.length === 0 ||
            invoice.job_code.toLowerCase().includes(query) ||
            invoice.dealership_name.toLowerCase().includes(query) ||
            technicianName.toLowerCase().includes(query) ||
            invoice.vehicle_summary.toLowerCase().includes(query) ||
            invoice.service_summary.toLowerCase().includes(query);
        const matchesDealership =
            filterDealership === 'all' ||
            invoice.dealership_name.toLowerCase() === filterDealership.toLowerCase();
        const matchesTechnician =
            filterTechnician === 'all' ||
            technicianName.toLowerCase() === filterTechnician.toLowerCase();
        return matchesSearch && matchesDealership && matchesTechnician;
    }), [filterDealership, filterTechnician, invoices, searchQuery]);

    const serviceNameOptions = useMemo(() => {
        const combined = [...serviceSuggestions, ...editableServices.map((service) => service.name)];
        return Array.from(new Set(combined.map((name) => name.trim()).filter((name) => name.length > 0)))
            .sort((a, b) => a.localeCompare(b));
    }, [editableServices, serviceSuggestions]);

    const handleOpenDrawer = (invoice: PendingInvoice) => {
        const nextEditableServices = invoice.services.map((service) => ({
            id: service.id,
            name: service.name,
            qb_item_id: service.qb_item_id,
            quantity: toNumber(service.quantity),
            price: toNumber(service.price),
        }));
        setSelectedInvoice(invoice);
        setEditableServices(nextEditableServices);
        setIsEditingInvoice(false);
        setDrawerOpen(true);
    };

    const totals = useMemo(() => {
        if (!selectedInvoice) {
            return { subtotal: 0, gst: 0, qst: 0, tax: 0, total: 0 };
        }
        const subtotal = editableServices.reduce(
            (acc, service) => acc + Math.max(0, service.quantity) * Math.max(0, service.price),
            0,
        );
        const gst = subtotal * QUEBEC_GST_RATE;
        const qst = subtotal * QUEBEC_QST_RATE;
        const tax = subtotal * QUEBEC_TOTAL_TAX_RATE;
        const total = subtotal + tax;
        return { subtotal, gst, qst, tax, total };
    }, [editableServices, selectedInvoice]);

    const resetEditableServices = () => {
        if (!selectedInvoice) return;
        setEditableServices(selectedInvoice.services.map((service) => ({
            id: service.id,
            name: service.name,
            qb_item_id: service.qb_item_id,
            quantity: toNumber(service.quantity),
            price: toNumber(service.price),
        })));
    };

    const handleUpdateService = (serviceId: string, field: 'quantity' | 'price', rawValue: string) => {
        const parsedValue = Number(rawValue);
        const nextValue = Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
        setEditableServices((prev) => prev.map((service) => (
            service.id === serviceId ? { ...service, [field]: nextValue } : service
        )));
    };

    const resolveCatalogService = (serviceName: string): ServiceCatalogOption | null => {
        const normalizedName = serviceName.trim().toLowerCase();
        if (!normalizedName) return null;

        const exact = serviceCatalogOptions.find((service) => service.name.toLowerCase() === normalizedName);
        if (exact) return exact;

        const prefixMatches = serviceCatalogOptions.filter((service) => service.name.toLowerCase().startsWith(normalizedName));
        if (prefixMatches.length === 1) {
            return prefixMatches[0];
        }
        return null;
    };

    const handleUpdateServiceName = (serviceId: string, rawValue: string) => {
        setEditableServices((prev) => prev.map((service) => {
            if (service.id !== serviceId) return service;
            const resolvedService = resolveCatalogService(rawValue);
            if (!resolvedService) {
                return { ...service, name: rawValue };
            }
            const shouldAutofillPrice = service.price <= 0 || service.id.startsWith('manual-');
            return {
                ...service,
                name: resolvedService.name,
                qb_item_id: resolvedService.qbItemId,
                price: shouldAutofillPrice ? resolvedService.defaultPrice : service.price,
            };
        }));
    };

    const handleAddService = () => {
        const nextLine: EditableServiceLine = {
            id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: 'New Service',
            quantity: 1,
            price: 0,
        };
        setEditableServices((prev) => [...prev, nextLine]);
    };

    const handleDeleteService = (serviceId: string) => {
        setEditableServices((prev) => prev.filter((service) => service.id !== serviceId));
    };

    const toAddressLines = (party?: {
        name?: string | null;
        street?: string | null;
        city?: string | null;
        state?: string | null;
        zip_code?: string | null;
    } | null) => {
        if (!party) return [];
        const lines: string[] = [];
        if (party.name) lines.push(party.name);
        if (party.street) lines.push(party.street);
        const cityStateZip = [party.city, party.state, party.zip_code].filter(Boolean).join(', ').replace(', ,', ',');
        if (cityStateZip) lines.push(cityStateZip);
        return lines;
    };

    const handleDownloadPreviewPdf = () => {
        if (!selectedInvoice) return;

        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const left = 48;
        const pageWidth = doc.internal.pageSize.getWidth();
        const rowHeight = 22;

        const lineItems = editableServices.map((item) => ({
            product_service: item.name || 'Service',
            description: selectedInvoice.job_code,
            qty: item.quantity,
            rate: item.price,
            amount: item.quantity * item.price,
        }));

        const invoiceDateValue = selectedInvoice.completed_at ? new Date(selectedInvoice.completed_at) : new Date();
        const dueDateValue = new Date(invoiceDateValue);
        dueDateValue.setDate(dueDateValue.getDate() + 15);

        const subtotal = totals.subtotal;
        const salesTax = totals.tax;
        const shipping = 0;
        const total = totals.total;

        let y = 52;

        if (invoiceBranding.logo_url) {
            doc.setDrawColor(200, 200, 200);
            doc.rect(left, y - 8, 54, 30);
            doc.setFontSize(8);
            doc.setTextColor(110, 110, 110);
            doc.text('Logo', left + 20, y + 10);
            doc.setTextColor(0, 0, 0);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(invoiceBranding.name || '', left + 64, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(invoiceBranding.street_address || '', left + 64, y + 14);
        doc.text(`${invoiceBranding.city || ''}, ${invoiceBranding.state || ''} ${invoiceBranding.zip_code || ''}`.trim(), left + 64, y + 27);
        doc.text(`${invoiceBranding.phone || ''}  |  ${invoiceBranding.email || ''}`.trim(), left + 64, y + 40);
        doc.text(invoiceBranding.website || '', left + 64, y + 53);

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
        const billToLines = toAddressLines(selectedInvoice.bill_to || undefined);
        const shipToLines = toAddressLines(selectedInvoice.ship_to || undefined);
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
        doc.text(`DRAFT-${selectedInvoice.job_code}`, panelX + panelWidth - 8, panelTop + 10, { align: 'right' });
        doc.text(format(invoiceDateValue, 'yyyy-MM-dd'), panelX + panelWidth - 8, panelTop + 26, { align: 'right' });
        doc.text('Net 15', panelX + panelWidth - 8, panelTop + 42, { align: 'right' });
        doc.text(format(dueDateValue, 'yyyy-MM-dd'), panelX + panelWidth - 8, panelTop + 58, { align: 'right' });

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

        doc.save(`${selectedInvoice.job_code}-invoice-preview.pdf`);
    };

    const handleApprove = async () => {
        if (!selectedInvoice) return;
        const adminToken = getStoredAdminToken();
        if (!adminToken) {
            alert('Admin session missing. Please login again.');
            return;
        }
        if (editableServices.length === 0) {
            alert('Invoice must include at least one service line.');
            return;
        }
        const hasMissingNames = editableServices.some((service) => service.name.trim().length === 0);
        if (hasMissingNames) {
            alert('All service lines must have a service name.');
            return;
        }
        const hasInvalidLines = editableServices.some((service) => service.quantity <= 0 || service.price <= 0);
        if (hasInvalidLines) {
            alert('All service quantities and prices must be greater than 0.');
            return;
        }

        setIsApproving(true);
        setConfirmDialogOpen(false);
        try {
            await createInvoice(adminToken, {
                dispatch_job_ids: [selectedInvoice.job_id],
                replace_dispatch_line_items: true,
                line_items: editableServices.map((service) => ({
                    product_service: service.name,
                    qb_item_id: service.qb_item_id,
                    quantity: service.quantity,
                    qty: service.quantity,
                    rate: service.price,
                    tax_code: 'GST_QST',
                })),
                status: 'sent',
                terms: 'NET_15',
                shipping: 0,
            });

            setInvoices((prev) => prev.filter((inv) => inv.job_id !== selectedInvoice.job_id));
            setBlockedInvoices((prev) => prev.filter((inv) => inv.job_id !== selectedInvoice.job_id));
            setDrawerOpen(false);
            setSelectedInvoice(null);
        } catch (error) {
            const detail = error instanceof Error ? error.message : 'Unable to approve invoice.';
            alert(`Invoice approval failed: ${detail}`);
        } finally {
            setIsApproving(false);
        }
    };

    const getInvoiceApprovalExportRows = () => filteredInvoices.map((invoice) => ({
        JobCode: invoice.job_code,
        Dealership: invoice.dealership_name,
        Technician: invoice.technician_name || '',
        Service: invoice.service_summary,
        Vehicle: invoice.vehicle_summary,
        CompletedAt: invoice.completed_at || '',
        EstimatedTotal: toNumber(invoice.estimated_total),
        InvoiceState: invoice.invoice_state,
    }));

    const handleExport = (selectedColumns: string[], format: ExportFormat = 'csv') => {
        const exportData = selectColumnsForExport(getInvoiceApprovalExportRows(), selectedColumns);
        exportArrayData(exportData, 'invoice_approvals_export', format);
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Invoice Approvals</h1>
                    <p className="text-sm font-medium text-muted-foreground">Review pricing and approve invoice creation</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <div className="mr-2 hidden items-center text-xs font-medium text-muted-foreground sm:flex">
                        Last updated: {new Date().toLocaleTimeString()}
                    </div>
                    <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => void fetchInvoicesData()}>
                        <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setExportModalOpen(true)}>
                        <Download className="h-4 w-4 text-muted-foreground" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <ColumnExportDialog
                open={exportModalOpen}
                onOpenChange={setExportModalOpen}
                title="Export Invoice Approvals"
                description="Select the pending-approval columns you want in your CSV."
                availableColumns={INVOICE_APPROVAL_EXPORT_COLUMNS}
                onConfirm={handleExport}
            />

            <Card className="space-y-4 border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full lg:w-auto min-w-0 lg:min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by Job Code, Dealership, or VIN..."
                            className="border-border/60 bg-background/60 pl-9 text-foreground transition-all placeholder:text-muted-foreground focus:bg-background"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        <Select value={filterDealership} onValueChange={setFilterDealership}>
                            <SelectTrigger className="w-full border-dashed border-border/60 bg-background/60 text-foreground sm:w-[170px]">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    <SelectValue placeholder="Dealership" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Dealership</SelectItem>
                                {dealershipOptions.map((dealership) => (
                                    <SelectItem key={dealership} value={dealership}>
                                        {dealership}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterTechnician} onValueChange={setFilterTechnician}>
                            <SelectTrigger className="w-full border-dashed border-border/60 bg-background/60 text-foreground sm:w-[160px]">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <SelectValue placeholder="Technician" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Technician</SelectItem>
                                {technicianOptions.map((technician) => (
                                    <SelectItem key={technician} value={technician}>
                                        {technician}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="mx-2 h-6 w-px bg-border/70" />
                        <Button variant="secondary" className="border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20">
                            All Pending ({filteredInvoices.length})
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm">
                {loading ? (
                    <div className="p-4 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center py-20 text-muted-foreground">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/40">
                            <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">No invoices found</h3>
                        <p className="text-sm mt-1 max-w-sm text-center">
                            {blockedInvoices.length > 0
                                ? 'Completed jobs exist, but they are blocked from invoice approval until required data is fixed.'
                                : 'Try adjusting your search or filters.'}
                        </p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => { setSearchQuery(''); setFilterDealership('all'); setFilterTechnician('all'); }}
                        >
                            Clear Filters
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted/30">
                            <TableRow>
                                <TableHead className="w-[180px] pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job Code</TableHead>
                                <TableHead className="w-[200px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dealership</TableHead>
                                <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Technician</TableHead>
                                <TableHead className="w-[150px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed At</TableHead>
                                <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service</TableHead>
                                <TableHead className="w-[120px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Est. Total</TableHead>
                                <TableHead className="w-[140px] text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                <TableHead className="w-[100px] text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvoices.map((inv) => (
                                <TableRow
                                    key={inv.job_id}
                                    className="group cursor-pointer border-border/40 transition-colors hover:bg-muted/20"
                                    onClick={() => handleOpenDrawer(inv)}
                                >
                                    <TableCell className="pl-6 font-medium text-foreground group-hover:text-cyan-300">{inv.job_code}</TableCell>
                                    <TableCell className="text-muted-foreground">{inv.dealership_name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-300">
                                                {inv.technician_name?.substring(0, 2) || 'NA'}
                                            </div>
                                            <span className="text-sm text-foreground">{inv.technician_name || 'Unassigned'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {inv.completed_at ? new Date(inv.completed_at).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell className="max-w-[180px] truncate text-muted-foreground">{inv.service_summary}</TableCell>
                                    <TableCell className="text-right font-mono font-medium text-foreground">${toNumber(inv.estimated_total).toFixed(2)}</TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge status={inv.invoice_state} />
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {blockedInvoices.length > 0 && (
                <Card className="space-y-4 border-amber-500/20 bg-amber-500/8 p-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-amber-500/15 p-2">
                            <AlertTriangle className="h-4 w-4 text-amber-300" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">Blocked Invoice Jobs</h2>
                            <p className="text-sm text-muted-foreground">
                                These completed jobs are not shown in the approval queue because required invoice data is missing.
                            </p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {blockedInvoices.map((invoice) => (
                            <div key={invoice.job_id} className="rounded-lg border border-amber-500/20 bg-background/70 p-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="font-semibold text-foreground">{invoice.job_code}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {invoice.dealership_name} {invoice.technician_name ? `• ${invoice.technician_name}` : ''}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{invoice.service_summary}</p>
                                    </div>
                                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                                        Blocked
                                    </Badge>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {invoice.blocking_reasons.map((reason) => (
                                        <Badge key={`${invoice.job_id}-${reason}`} variant="outline" className="border-red-500/30 bg-red-500/10 text-red-300">
                                            {reason}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent
                    className="relative flex w-full flex-col gap-0 overflow-hidden border-l border-border/60 bg-[#07101f] p-0 text-foreground shadow-2xl sm:max-w-none"
                    style={isMobile ? undefined : { width: `${previewPanelWidth}px` }}
                >
                    {!isMobile && (
                        <div
                            role="separator"
                            aria-label="Resize invoice preview"
                            aria-orientation="vertical"
                            onMouseDown={handlePreviewResizeMouseDown}
                            className="absolute left-0 top-0 z-50 h-full w-2 -translate-x-1/2 cursor-col-resize"
                        >
                            <div className="absolute left-1/2 top-1/2 h-14 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/35" />
                        </div>
                    )}
                    {selectedInvoice && (
                        <>
                            <div className="border-b border-border/60 bg-slate-950/80 p-6 backdrop-blur">
                                <SheetHeader>
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                                            Pending Approval
                                        </Badge>
                                        <span className="text-xs font-mono text-muted-foreground">ID: {selectedInvoice.job_id}</span>
                                    </div>
                                    <SheetTitle className="text-xl font-bold text-foreground">Invoice Preview - {selectedInvoice.job_code}</SheetTitle>
                                    <SheetDescription className="text-sm text-muted-foreground">
                                        Review and approve services for invoice generation.
                                    </SheetDescription>
                                </SheetHeader>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-8">
                                    <section className="grid grid-cols-2 gap-4 rounded-xl border border-cyan-500/15 bg-slate-900/80 p-4 shadow-[0_0_0_1px_rgba(34,211,238,0.04)]">
                                        <div>
                                            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Dealership</h4>
                                            <div className="font-medium text-slate-100">{selectedInvoice.dealership_name}</div>
                                        </div>
                                        <div>
                                            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicle</h4>
                                            <div className="font-medium text-slate-100">{selectedInvoice.vehicle_summary}</div>
                                        </div>
                                        <div>
                                            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Technician</h4>
                                            <div className="font-medium text-slate-100">{selectedInvoice.technician_name || 'Unassigned'}</div>
                                        </div>
                                        <div>
                                            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Completed</h4>
                                            <div className="font-medium text-slate-100">
                                                {selectedInvoice.completed_at ? new Date(selectedInvoice.completed_at).toLocaleDateString() : '-'}
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                                                <DollarSign className="h-4 w-4 text-cyan-300" /> Billable Items
                                            </h3>
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                <Badge variant="outline" className="border-cyan-500/40 bg-cyan-500/10 text-cyan-200">
                                                    GST 5% + QST 9.975%
                                                </Badge>
                                                {!isEditingInvoice ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-2 border-cyan-500/40 bg-transparent text-cyan-200 hover:bg-cyan-500/10"
                                                        onClick={() => setIsEditingInvoice(true)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        Edit
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 gap-2 border-border/60 bg-transparent text-slate-200 hover:bg-slate-900"
                                                            onClick={() => {
                                                                resetEditableServices();
                                                                setIsEditingInvoice(false);
                                                            }}
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                            Cancel Edit
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-8 gap-2 bg-[#2F8E92] text-white hover:bg-[#267276]"
                                                            onClick={() => setIsEditingInvoice(false)}
                                                        >
                                                            <Save className="h-3.5 w-3.5" />
                                                            Save
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="overflow-hidden rounded-xl border border-border/60 bg-slate-950/70">
                                            {isEditingInvoice && isMobile ? (
                                                <div className="space-y-3 p-3">
                                                    {editableServices.map((item) => (
                                                        <div key={item.id} className="rounded-lg border border-border/60 bg-slate-900/70 p-3">
                                                            <div className="mb-2">
                                                                <Label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Service</Label>
                                                                <Input
                                                                    className="h-8 border-border/60 bg-slate-900 text-slate-100"
                                                                    value={item.name}
                                                                    list="invoice-service-suggestions"
                                                                    onChange={(e) => handleUpdateServiceName(item.id, e.target.value)}
                                                                    placeholder="Service name"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Qty</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        className="h-8 border-border/60 bg-slate-900 text-right text-slate-100"
                                                                        value={item.quantity}
                                                                        onChange={(e) => handleUpdateService(item.id, 'quantity', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Price</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        className="h-8 border-border/60 bg-slate-900 text-right text-slate-100"
                                                                        value={item.price}
                                                                        onChange={(e) => handleUpdateService(item.id, 'price', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 flex items-center justify-between">
                                                                <span className="text-xs uppercase tracking-wide text-slate-400">Line Total</span>
                                                                <span className="font-mono text-sm text-cyan-200">${(item.quantity * item.price).toFixed(2)}</span>
                                                            </div>
                                                            <div className="mt-2 flex justify-end">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 gap-1 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                                                                    onClick={() => handleDeleteService(item.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <Table className="table-fixed">
                                                    <TableHeader className="bg-slate-900/90">
                                                        <TableRow>
                                                            <TableHead className={cn('h-10 text-xs font-semibold text-slate-300', isEditingInvoice ? 'w-[42%]' : 'w-[58%]')}>
                                                                Service
                                                            </TableHead>
                                                            <TableHead className="h-10 w-[14%] text-center text-xs font-semibold text-slate-300">Qty</TableHead>
                                                            <TableHead className="h-10 w-[14%] text-right text-xs font-semibold text-slate-300">Price</TableHead>
                                                            <TableHead className="h-10 w-[14%] text-right text-xs font-semibold text-slate-300">Total</TableHead>
                                                            {isEditingInvoice && <TableHead className="h-10 w-[6%] text-right text-xs font-semibold text-slate-300">Del</TableHead>}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {editableServices.map((item) => (
                                                            <TableRow key={item.id} className="border-border/50">
                                                                <TableCell className="align-middle py-3 text-sm text-slate-100">
                                                                    {isEditingInvoice ? (
                                                                        <Input
                                                                            className="h-8 border-border/60 bg-slate-900 text-slate-100"
                                                                            value={item.name}
                                                                            list="invoice-service-suggestions"
                                                                            onChange={(e) => handleUpdateServiceName(item.id, e.target.value)}
                                                                            placeholder="Service name"
                                                                        />
                                                                    ) : (
                                                                        <div>{item.name}</div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="align-middle py-3 text-center text-sm text-slate-200">
                                                                    {isEditingInvoice ? (
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.01"
                                                                            className="ml-auto h-8 w-[88px] border-border/60 bg-slate-900 text-right text-slate-100"
                                                                            value={item.quantity}
                                                                            onChange={(e) => handleUpdateService(item.id, 'quantity', e.target.value)}
                                                                        />
                                                                    ) : (
                                                                        item.quantity.toFixed(2)
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="align-middle py-3 text-right text-sm text-slate-100">
                                                                    {isEditingInvoice ? (
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.01"
                                                                            className="ml-auto h-8 w-[96px] border-border/60 bg-slate-900 text-right text-slate-100"
                                                                            value={item.price}
                                                                            onChange={(e) => handleUpdateService(item.id, 'price', e.target.value)}
                                                                        />
                                                                    ) : (
                                                                        `$${item.price.toFixed(2)}`
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="align-middle py-3 text-right font-mono text-sm text-cyan-200">
                                                                    ${(item.quantity * item.price).toFixed(2)}
                                                                </TableCell>
                                                                {isEditingInvoice && (
                                                                    <TableCell className="align-middle py-3 text-right">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 w-8 p-0 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                                                                            onClick={() => handleDeleteService(item.id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TableCell>
                                                                )}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                            {isEditingInvoice && (
                                                <div className="border-t border-border/60 bg-slate-900/80 px-4 py-3">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-2 border-cyan-500/40 bg-transparent text-cyan-200 hover:bg-cyan-500/10"
                                                        onClick={handleAddService}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        Add Service
                                                    </Button>
                                                </div>
                                            )}
                                            <datalist id="invoice-service-suggestions">
                                                {serviceNameOptions.map((name) => (
                                                    <option key={name} value={name} />
                                                ))}
                                            </datalist>
                                            <div className="space-y-2 border-t border-border/60 bg-slate-900/90 p-4">
                                                <div className="flex justify-between text-sm text-slate-300">
                                                    <span>Subtotal</span>
                                                    <span className="font-mono">${totals.subtotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-slate-300">
                                                    <span>GST (5%)</span>
                                                    <span className="font-mono">${totals.gst.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-slate-300">
                                                    <span>QST (9.975%)</span>
                                                    <span className="font-mono">${totals.qst.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-slate-300">
                                                    <span>Total Tax (14.975%)</span>
                                                    <span className="font-mono">${totals.tax.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between border-t border-border/60 pt-2 text-lg font-bold text-slate-50">
                                                    <span>Total</span>
                                                    <span className="font-mono text-cyan-200">${totals.total.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                </div>
                            </ScrollArea>

                            <div className="sticky bottom-0 z-20 border-t border-border/60 bg-slate-950/95 p-6 backdrop-blur">
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <Button variant="outline" className="flex-1 border-border/70 bg-transparent text-slate-200 hover:bg-slate-900 hover:text-white" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                                    <Button variant="outline" className="flex-1 border-cyan-500/40 bg-transparent text-cyan-200 hover:bg-cyan-500/10" onClick={handleDownloadPreviewPdf}>
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Invoice
                                    </Button>
                                    <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="flex-[2] bg-[#2F8E92] hover:bg-[#267276] text-white shadow-sm font-semibold">
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                Approve & Generate
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="border-border/60 bg-slate-950 text-foreground">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2 text-foreground">
                                                    <ShieldAlert className="h-5 w-5 text-amber-300" /> Confirm Invoice Generation
                                                </DialogTitle>
                                                <DialogDescription className="pt-2 text-muted-foreground">
                                                    This will immediately create an invoice for <strong>{selectedInvoice.job_code}</strong> with a total of <strong>${totals.total.toFixed(2)}</strong>.
                                                    <br /><br />
                                                    This action cannot be undone from the portal. Are you sure?
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter className="mt-4">
                                                <Button variant="outline" className="border-border/70 bg-transparent text-slate-200 hover:bg-slate-900 hover:text-white" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                                                <Button onClick={() => void handleApprove()} disabled={isApproving} className="bg-[#2F8E92] hover:bg-[#267276]">
                                                    {isApproving ? 'Processing...' : 'Yes, Create Invoice'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
