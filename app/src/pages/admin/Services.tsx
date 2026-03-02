import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    RefreshCw,
    Plus,
    MoreVertical,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    FileText,
    Archive,
    Trash2,
    Edit2,
    Info,
    FileDown
} from 'lucide-react';
import { exportArrayData, selectColumnsForExport, type ExportFormat } from '@/lib/export';
import { cn } from '@/lib/utils';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import ColumnExportDialog from '@/components/modals/ColumnExportDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
    createAdminService,
    fetchAdminServices,
    getStoredAdminToken,
    updateAdminService,
    updateAdminServiceStatus,
    type BackendServiceCatalogItem,
} from '@/lib/backend-api';

// --- Types ---

interface ServiceItem {
    id: string;
    code: string;
    name: string;
    category: string;
    default_price: number;
    approval_required: boolean;
    status: 'active' | 'archived';
    notes?: string;
    updated_at: string;
    updated_by?: string;
    allowed_actions: string[];
}

const toNumber = (value: string | number): number => {
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
};

const mapBackendServiceToUi = (row: BackendServiceCatalogItem): ServiceItem => ({
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category || 'General',
    default_price: toNumber(row.default_price),
    approval_required: Boolean(row.approval_required),
    status: row.status === 'archived' ? 'archived' : 'active',
    notes: row.notes ?? undefined,
    updated_at: row.updated_at,
    updated_by: row.updated_by ?? undefined,
    allowed_actions: ['edit', row.status === 'active' ? 'archive' : 'unarchive', 'duplicate'],
});

const ADMIN_REFRESH_EVENT = 'sm-dispatch:admin-refresh';

// --- Mock Data ---

export const MOCK_SERVICES: ServiceItem[] = [
    { id: 's1', code: 'PPF-ALA-AILES-COMP-2', name: 'PPF ailes complètes (2)', category: 'PPF', default_price: 400, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's2', code: 'PPF-ALA-CAPOT-12', name: 'PPF bande de capot 12"', category: 'PPF', default_price: 120, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's3', code: 'PPF-ALA-CAPOT-18', name: 'PPF bande de capot 18"', category: 'PPF', default_price: 170, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's4', code: 'PPF-ALA-TOIT-12', name: 'PPF bande de toit 12"', category: 'PPF', default_price: 100, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's5', code: 'PPF-ALA-TOIT-4', name: 'PPF bande de toit 4"', category: 'PPF', default_price: 40, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's6', code: 'PPF-ALA-TOIT-6', name: 'PPF bande de toit 6"', category: 'PPF', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's7', code: 'PPF-ALA-TOIT-8', name: 'PPF bande de toit 8"', category: 'PPF', default_price: 75, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's8', code: 'PPF-OPT-BANDE-AR', name: 'PPF bande pare-chocs arrière (à partir de)', category: 'PPF', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's9', code: 'FORDDN-SVC-PPF-BANDE-AR', name: 'PPF bande pare-chocs arrière – Donnacona Ford', category: 'PPF', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's10', code: 'HONDA-DON-SVC-PPF-BANDE-AR', name: 'PPF bande pare-chocs arrière – Honda', category: 'PPF', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's11', code: 'PPF-ALA-BAS-CAISSES-12', name: 'PPF bas de caisses 12"', category: 'PPF', default_price: 375, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's12', code: 'PPF-ALA-BAS-CAISSES-8', name: 'PPF bas de caisses 8"', category: 'PPF', default_price: 240, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's13', code: 'PPF-PKG-CAPOT12-AILES', name: 'PPF capot 12" + ailes', category: 'PPF', default_price: 135, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's14', code: 'FORDDN-SVC-PPF-CAPOT12-AILES', name: 'PPF capot 12" + ailes – Donnacona Ford', category: 'PPF', default_price: 135, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's15', code: 'FORDDN-SVC-PPF-CAPOT12-F150', name: 'PPF capot 12" + ailes – F-150', category: 'PPF', default_price: 175, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's16', code: 'FORDDN-SVC-PPF-CAPOT12-F250', name: 'PPF capot 12" + ailes – F-250', category: 'PPF', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's17', code: 'FORDDN-SVC-PPF-CAPOT12-COMBO-F150', name: 'PPF capot 12" + ailes + pare-chocs avant (combo) – F-150', category: 'PPF', default_price: 150, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's18', code: 'FORDDN-SVC-PPF-CAPOT12-COMBO-F250', name: 'PPF capot 12" + ailes + pare-chocs avant (combo) – F-250', category: 'PPF', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's19', code: 'PPF-PKG-CAPOT12-AILES-POINTE', name: 'PPF capot 12" + ailes + pointes (à partir de)', category: 'PPF', default_price: 185, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's20', code: 'FORDDN-SVC-PPF-CAPOT16-AUTRE', name: 'PPF capot 16" + ailes (autre)', category: 'PPF', default_price: 175, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's21', code: 'PPF-PKG-CAPOT16-AILES', name: 'PPF capot 16" + ailes (base)', category: 'PPF', default_price: 185, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's22', code: 'HONDA-DON-SVC-PPF-16-CRVHRV', name: 'PPF capot 16" + ailes – CRV/HRV/Ridgeline/Prologue', category: 'PPF', default_price: 170, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's23', code: 'FORDDN-SVC-PPF-CAPOT16-F150', name: 'PPF capot 16" + ailes – F-150', category: 'PPF', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's24', code: 'FORDDN-SVC-PPF-CAPOT16-F250', name: 'PPF capot 16" + ailes – F-250', category: 'PPF', default_price: 250, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's25', code: 'HONDA-DON-SVC-PPF-16-ODY', name: 'PPF capot 16" + ailes – Odyssey', category: 'PPF', default_price: 180, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's26', code: 'FORDDN-SVC-PPF-CAPOT16-COMBO-F150', name: 'PPF capot 16" + ailes + pare-chocs avant (combo) – F-150', category: 'PPF', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's27', code: 'FORDDN-SVC-PPF-CAPOT16-COMBO-F250', name: 'PPF capot 16" + ailes + pare-chocs avant (combo) – F-250', category: 'PPF', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's28', code: 'PPF-PKG-CAPOT16-AILES-POINTE', name: 'PPF capot 16" + ailes + pointe (à partir de)', category: 'PPF', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's29', code: 'FORDDN-SVC-PPF-CAPOT16-AUTRE-POINTE', name: 'PPF capot 16" + ailes + pointe (autre)', category: 'PPF', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's30', code: 'PPF-PKG-CAPOT24-POINTE', name: 'PPF capot 24" + pointe', category: 'PPF', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's31', code: 'HONDA-DON-SVC-PPF-CIVIC-24', name: 'PPF capot 24" + pointe – Civic', category: 'PPF', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's32', code: 'FORDDN-SVC-PPF-CAPOT24-POINTE', name: 'PPF capot 24" + pointe – Donnacona Ford', category: 'PPF', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's33', code: 'PPF-ALA-CAPOT-COMP', name: 'PPF capot complet (à partir de)', category: 'PPF', default_price: 325, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's34', code: 'PPF-ALA-POIGNEES', name: 'PPF intérieur de poignées (ch.)', category: 'PPF', default_price: 10, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's35', code: 'PPF-OPT-MIROIRS', name: 'PPF miroirs (2)', category: 'PPF', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's36', code: 'FORDDN-SVC-PPF-MIROIRS', name: 'PPF miroirs – Donnacona Ford', category: 'PPF', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's37', code: 'HONDA-DON-SVC-PPF-MIROIRS', name: 'PPF miroirs – Honda', category: 'PPF', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's38', code: 'PPF-ALA-MONTANT-PB', name: 'PPF montant de pare-brise (ch.)', category: 'PPF', default_price: 30, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's39', code: 'FORDDN-SVC-PPF-PARECHOCS-AV-AUTRE', name: 'PPF pare-chocs avant – autre modèle', category: 'PPF', default_price: 325, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's40', code: 'PPF-OPT-PARECHOCS-AV', name: 'PPF pare-chocs avant (base)', category: 'PPF', default_price: 350, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's41', code: 'FORDDN-SVC-PPF-PARECHOCS-AV-F150', name: 'PPF pare-chocs avant – F-150', category: 'PPF', default_price: 250, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's42', code: 'FORDDN-SVC-PPF-PARECHOCS-AV-F250', name: 'PPF pare-chocs avant – F-250', category: 'PPF', default_price: 300, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's43', code: 'HONDA-DON-SVC-PPF-PARECHOCS-AV', name: 'PPF pare-chocs avant – Honda', category: 'PPF', default_price: 325, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's44', code: 'PPF-ALA-PHARES-AJOUT', name: 'PPF phares (ajout)', category: 'PPF', default_price: 70, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's45', code: 'PPF-ALA-PHARES-SEUL', name: 'PPF phares (seul)', category: 'PPF', default_price: 110, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's46', code: 'PPF-ALA-SEUIL-COFFRE', name: 'PPF seuil de coffre', category: 'PPF', default_price: 45, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's47', code: 'PPF-ALA-SEUIL-PORTE', name: 'PPF seuil de porte (ch.)', category: 'PPF', default_price: 25, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's48', code: 'PPF-OPT-TOIT12-AJOUT', name: 'PPF toit 12" (ajout)', category: 'PPF', default_price: 90, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's49', code: 'FORDDN-SVC-PPF-TOIT12-AJOUT', name: 'PPF toit 12" (ajout) – Donnacona Ford', category: 'PPF', default_price: 90, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's50', code: 'HONDA-DON-SVC-PPF-TOIT12-AJOUT', name: 'PPF toit 12" (ajout) – Honda', category: 'PPF', default_price: 90, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's51', code: 'PPF-OPT-TOIT12-SEUL', name: 'PPF toit 12" (seul)', category: 'PPF', default_price: 115, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's52', code: 'FORDDN-SVC-PPF-TOIT12-SEUL', name: 'PPF toit 12" (seul) – Donnacona Ford', category: 'PPF', default_price: 115, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's53', code: 'HONDA-DON-SVC-PPF-TOIT12-SEUL', name: 'PPF toit 12" (seul) – Honda', category: 'PPF', default_price: 115, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's54', code: 'TEINTE-BANDE-PB', name: 'Bande pare-brise teintée', category: 'Window Tint', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's55', code: 'FORDDN-SVC-TINT-BANDE-PB', name: 'Bande pare-brise teintée (Ford)', category: 'Window Tint', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's56', code: 'TEINTE-COMP-LIMO', name: 'Teintage complet – arrière limo', category: 'Window Tint', default_price: 240, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's57', code: 'FORDDN-SVC-TINT-COMP-LIMO', name: 'Teintage complet – arrière limo (Ford)', category: 'Window Tint', default_price: 240, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's58', code: 'TEINTE-COMP-STD', name: 'Teintage complet – standard', category: 'Window Tint', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's59', code: 'FORDDN-SVC-TINT-COMP-STD', name: 'Teintage complet – standard (Ford)', category: 'Window Tint', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's60', code: 'TEINTE-AR-LIMO', name: 'Teintage vitres arrière – limo', category: 'Window Tint', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's61', code: 'FORDDN-SVC-TINT-AR-LIMO', name: 'Teintage vitres arrière – limo (Ford)', category: 'Window Tint', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's62', code: 'TEINTE-AR-STD', name: 'Teintage vitres arrière – standard', category: 'Window Tint', default_price: 185, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's63', code: 'FORDDN-SVC-TINT-AR-STD', name: 'Teintage vitres arrière – standard (Ford)', category: 'Window Tint', default_price: 185, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's64', code: 'TEINTE-AV-CER', name: 'Teintage vitres avant – céramique', category: 'Window Tint', default_price: 100, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's65', code: 'FORDDN-SVC-TINT-AV-CER', name: 'Teintage vitres avant – céramique (Ford)', category: 'Window Tint', default_price: 100, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's66', code: 'TEINTE-AV-STD', name: 'Teintage vitres avant – standard', category: 'Window Tint', default_price: 90, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's67', code: 'FORDDN-SVC-TINT-AV-STD', name: 'Teintage vitres avant – standard (Ford)', category: 'Window Tint', default_price: 90, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's68', code: 'AUDI-SVC-2WAY', name: 'Démarreur 2-Way – Audi', category: 'Remote Starter', default_price: 480, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's69', code: 'AUDI-SVC-2WAY-S3RS3-2526', name: 'Démarreur 2-Way – Audi S3/RS3 2025-2026', category: 'Remote Starter', default_price: 580, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's70', code: 'AUDI-SVC-MYCAR2', name: 'Démarreur MyCar 2 – Audi', category: 'Remote Starter', default_price: 590, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's71', code: 'AUDI-SVC-MYCAR-S3RS3-2526', name: 'Démarreur MyCar – Audi S3/RS3 2025-2026', category: 'Remote Starter', default_price: 690, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's72', code: 'AUDI-SVC-DOMINO', name: 'Domino repérage – Audi', category: 'Remote Starter', default_price: 320, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's73', code: 'AUDI-SVC-PB-MO', name: 'Remplacement de pare-brise – Audi', category: 'Remote Starter', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
];

// --- Components ---

function ApprovalBadge({ required }: { required: boolean }) {
    if (required) return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Yes</Badge>;
    return <Badge variant="outline" className="text-gray-500 border-gray-200">No</Badge>;
}

function StatusBadge({ status }: { status: 'active' | 'archived' }) {
    if (status === 'active') return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 shadow-none">Active</Badge>;
    return <Badge variant="outline" className="text-gray-500 border-gray-200">Archived</Badge>;
}

const SERVICE_EXPORT_COLUMNS = [
    'Code',
    'Name',
    'Category',
    'DefaultPrice',
    'Status',
    'Notes',
];

export default function ServicesPage() {
    const { hasBackendAdminToken } = useAuth();
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [minPrice, setMinPrice] = useState<string>('');
    const [maxPrice, setMaxPrice] = useState<string>('');

    // Drawers & Modals
    const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [exportModalOpen, setExportModalOpen] = useState(false);

    // Forms
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        category: 'General',
        default_price: '',
        approval_required: false,
        notes: ''
    });

    // Initial Fetch
    const fetchServices = useCallback(async () => {
        setLoading(true);
        const token = getStoredAdminToken();
        if (!hasBackendAdminToken || !token) {
            setServices([]);
            setLoading(false);
            return;
        }
        try {
            const rows = await fetchAdminServices(token, true);
            setServices(rows.map(mapBackendServiceToUi));
        } catch (error) {
            const detail = error instanceof Error ? error.message : 'Unable to load services';
            alert(detail);
            setServices([]);
        } finally {
            setLoading(false);
        }
    }, [hasBackendAdminToken]);

    useEffect(() => {
        void fetchServices();
    }, [fetchServices]);

    useEffect(() => {
        const handleAdminRefresh = () => {
            void fetchServices();
        };

        window.addEventListener(ADMIN_REFRESH_EVENT, handleAdminRefresh);
        return () => {
            window.removeEventListener(ADMIN_REFRESH_EVENT, handleAdminRefresh);
        };
    }, [fetchServices]);

    const getServiceExportRows = () => services.map(s => ({
            Code: s.code,
            Name: s.name,
            Category: s.category,
            DefaultPrice: s.default_price,
            Status: s.status,
            Notes: s.notes || ''
        }));

    const handleExport = (selectedColumns: string[], format: ExportFormat = 'csv') => {
        const exportData = selectColumnsForExport(getServiceExportRows(), selectedColumns);
        exportArrayData(exportData, 'services_pricing_export', format);
    };

    // Filter Logic
    const filteredServices = services.filter(s => {
        const matchesSearch =
            s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase());
        const normalizedCategory = s.category.trim().toLowerCase();
        const normalizedName = s.name.trim().toLowerCase();
        const normalizedCode = s.code.trim().toLowerCase();
        let matchesCategory = true;
        if (filterCategory === 'ppf') {
            matchesCategory = normalizedCategory === 'ppf';
        }
        if (filterCategory === 'window_tint') {
            matchesCategory = normalizedCategory === 'window tint';
        }
        if (filterCategory === 'engine_immobilizers') {
            matchesCategory =
                normalizedName.includes('immobilizer') ||
                normalizedName.includes('anti-demarrage') ||
                normalizedName.includes('antidémarrage') ||
                normalizedName.includes('domino') ||
                normalizedCode.includes('immobil');
        }
        if (filterCategory === 'remote_starters') {
            matchesCategory =
                normalizedName.includes('remote starter') ||
                normalizedName.includes('demarreur') ||
                normalizedName.includes('démarreur') ||
                normalizedName.includes('mycar') ||
                normalizedName.includes('2-way') ||
                normalizedCode.includes('2way') ||
                normalizedCode.includes('mycar');
        }
        if (filterCategory === 'vehicle_tracking_systems') {
            matchesCategory =
                normalizedName.includes('tracking') ||
                normalizedName.includes('repérage') ||
                normalizedName.includes('reperage') ||
                normalizedCode.includes('tracking');
        }
        if (filterCategory === 'windshield_repair') {
            matchesCategory =
                normalizedName.includes('windshield repair') ||
                normalizedName.includes('pare-brise') ||
                normalizedCode.includes('pb');
        }
        if (filterCategory === 'windshield_replacement') {
            matchesCategory =
                normalizedName.includes('windshield replacement') ||
                normalizedName.includes('remplacement de pare-brise');
        }

        const min = minPrice.trim() === '' ? null : Number(minPrice);
        const max = maxPrice.trim() === '' ? null : Number(maxPrice);
        const matchesMin = min === null || (!Number.isNaN(min) && s.default_price >= min);
        const matchesMax = max === null || (!Number.isNaN(max) && s.default_price <= max);

        return matchesSearch && matchesCategory && matchesMin && matchesMax;
    });

    // Handlers
    const handleOpenDrawer = (s: ServiceItem) => {
        setSelectedService(s);
        setDrawerOpen(true);
    };

    const handleOpenAddModal = () => {
        setModalMode('add');
        setFormData({ code: '', name: '', category: 'General', default_price: '', approval_required: false, notes: '' });
        setModalOpen(true);
    };

    const handleOpenEditModal = (s: ServiceItem) => {
        setModalMode('edit');
        setFormData({
            code: s.code,
            name: s.name,
            category: s.category || 'General',
            default_price: s.default_price.toString(),
            approval_required: s.approval_required,
            notes: s.notes || ''
        });
        setSelectedService(s);
        setModalOpen(true);
    };

    const handleSaveService = async () => {
        const token = getStoredAdminToken();
        if (!token) {
            alert('Admin session is required to save services.');
            return;
        }

        if (!formData.code || !formData.name || !formData.default_price) {
            alert("Code, Name, and Default Price are required.");
            return;
        }

        const normalizedCategory = formData.category.trim() || 'General';

        const price = parseFloat(formData.default_price);
        if (isNaN(price) || price < 0) {
            alert("Price must be a valid non-negative number.");
            return;
        }

        const normalizedCode = formData.code.trim().toLowerCase();

        if (modalMode === 'add') {
            if (services.some((s) => s.code.trim().toLowerCase() === normalizedCode)) {
                alert("Service code already exists.");
                return;
            }
            try {
                const created = await createAdminService(token, {
                    code: formData.code,
                    name: formData.name,
                    category: normalizedCategory,
                    default_price: price,
                    approval_required: formData.approval_required,
                    notes: formData.notes || null,
                });
                setServices(prev => [mapBackendServiceToUi(created), ...prev]);
            } catch (error) {
                const detail = error instanceof Error ? error.message : 'Unable to create service';
                alert(detail);
                return;
            }

        } else if (modalMode === 'edit' && selectedService) {
            if (
                services.some(
                    (s) => s.id !== selectedService.id && s.code.trim().toLowerCase() === normalizedCode,
                )
            ) {
                alert("Service code already exists.");
                return;
            }
            try {
                const updated = await updateAdminService(token, selectedService.id, {
                    code: formData.code,
                    name: formData.name,
                    category: normalizedCategory,
                    default_price: price,
                    approval_required: formData.approval_required,
                    notes: formData.notes || null,
                });
                const updatedService = mapBackendServiceToUi(updated);
                setServices(prev => prev.map(s => s.id === selectedService.id ? updatedService : s));
                setSelectedService(updatedService);
            } catch (error) {
                const detail = error instanceof Error ? error.message : 'Unable to update service';
                alert(detail);
                return;
            }
        }

        setModalOpen(false);
        // Toast success here
    };

    const handleArchiveToggle = async (s: ServiceItem) => {
        const token = getStoredAdminToken();
        if (!token) {
            alert('Admin session is required to change service status.');
            return;
        }
        const newStatus = s.status === 'active' ? 'archived' : 'active';
        try {
            const updated = await updateAdminServiceStatus(token, s.id, newStatus);
            const next = mapBackendServiceToUi(updated);
            setServices(prev => prev.map(item => item.id === s.id ? next : item));
        } catch (error) {
            const detail = error instanceof Error ? error.message : 'Unable to update service status';
            alert(detail);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* 1. Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Services & Pricing</h1>
                    <p className="text-sm text-muted-foreground font-medium">Manage service catalog, default pricing, and approval flags</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <Button variant="outline" size="sm" onClick={() => void fetchServices()} className="h-9 gap-2" disabled={loading}>
                        <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setExportModalOpen(true)} className="h-9 gap-2">
                        <FileDown className="w-4 h-4" /> Export
                    </Button>
                    <Button size="sm" onClick={handleOpenAddModal} className="h-9 gap-2 bg-[#2F8E92] hover:bg-[#267276]">
                        <Plus className="w-4 h-4" /> Add Service
                    </Button>
                </div>
            </div>

            {/* 2. Info Banner */}
            <div className="bg-card border border-blue-200/50 rounded-lg p-3 flex items-start sm:items-center gap-3 text-sm text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 mt-0.5 sm:mt-0 flex-shrink-0 text-blue-600 dark:text-blue-300" />
                <p>Price changes affect future jobs only. Previously approved invoices remain unchanged.</p>
            </div>

            {/* 3. Filter Bar */}
            <Card className="p-4 border-border shadow-sm space-y-4 bg-card">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full lg:w-auto min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by service code or name..."
                            className="pl-9 bg-muted/30 border-border focus:bg-background transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="ppf">PPF</SelectItem>
                                <SelectItem value="window_tint">Window Tint</SelectItem>
                                <SelectItem value="engine_immobilizers">Engine immobilizers</SelectItem>
                                <SelectItem value="remote_starters">Remote starters</SelectItem>
                                <SelectItem value="vehicle_tracking_systems">Vehicle tracking systems</SelectItem>
                                <SelectItem value="windshield_repair">Windshield repair</SelectItem>
                                <SelectItem value="windshield_replacement">Windshield replacement</SelectItem>
                            </SelectContent>
                        </Select>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-[180px] justify-start border-border bg-background">
                                    Prices
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[260px] p-3">
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500">Min Price</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Min Price"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 mt-3">
                                    <Label className="text-xs text-gray-500">Max Price</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Max Price"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                    />
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </Card>

            {/* 4. Services Table */}
            <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                {loading ? (
                    <div className="p-4 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">No services found</h3>
                        <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                        <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(''); setFilterCategory('all'); setMinPrice(''); setMaxPrice(''); }}>Clear Filters</Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-gray-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="pl-6 w-[150px]">Service Code</TableHead>
                                <TableHead className="min-w-[260px]">Service Name</TableHead>
                                <TableHead className="w-[120px]">Category</TableHead>
                                <TableHead className="w-[120px] text-right pr-6">Default Price</TableHead>
                                <TableHead className="w-[100px] text-center">Status</TableHead>
                                <TableHead className="w-[80px] text-center">Notes</TableHead>
                                <TableHead className="w-[180px] text-right">Last Updated</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredServices.map((service) => (
                                <TableRow
                                    key={service.id}
                                    className="group hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => handleOpenDrawer(service)}
                                >
                                    <TableCell className="pl-6 font-semibold text-gray-900">{service.code}</TableCell>
                                    <TableCell className="text-gray-700 font-medium">{service.name}</TableCell>
                                    <TableCell className="text-gray-600">{service.category}</TableCell>
                                    <TableCell className="text-right pr-6 font-mono text-gray-600">
                                        ${service.default_price.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge status={service.status} />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {service.notes && <AlertCircle className="w-4 h-4 text-blue-500 mx-auto" />}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-gray-400 font-mono">
                                        {new Date(service.updated_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="w-4 h-4 text-gray-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenEditModal(service)}>
                                                        <Edit2 className="w-4 h-4 mr-2" /> Edit Service
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleArchiveToggle(service)} className={service.status === 'active' ? "text-red-600" : ""}>
                                                        {service.status === 'active' ? (
                                                            <><Archive className="w-4 h-4 mr-2" /> Archive</>
                                                        ) : (
                                                            <><CheckCircle2 className="w-4 h-4 mr-2" /> Unarchive</>
                                                        )}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* 6. Add/Edit Service Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{modalMode === 'add' ? 'Add New Service' : 'Edit Service'}</DialogTitle>
                        <DialogDescription>
                            Configure service details and default pricing. <br />
                            <span className="text-xs text-amber-600 font-medium">Changes affect future jobs only.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Service Code <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="e.g. SRV-001"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    disabled={modalMode === 'edit'} // Lock code on edit usually desirable
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Default Price ($) <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.default_price}
                                        onChange={e => setFormData({ ...formData, default_price: e.target.value })}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Service Name <span className="text-red-500">*</span></Label>
                            <Input placeholder="e.g. Standard Inspection" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Category <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="e.g. PPF"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-gray-50">
                            <div className="space-y-0.5">
                                <Label className="text-base">Approval Required</Label>
                                <p className="text-xs text-gray-500">Flag invoices containing this service for review.</p>
                            </div>
                            <Switch
                                checked={formData.approval_required}
                                onCheckedChange={c => setFormData({ ...formData, approval_required: c })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Notes (Optional)</Label>
                            <Textarea
                                placeholder="Internal notes about pricing logic or restrictions..."
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveService} className="bg-[#2F8E92] hover:bg-[#267276]">{modalMode === 'add' ? 'Create Service' : 'Save Changes'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ColumnExportDialog
                open={exportModalOpen}
                onOpenChange={setExportModalOpen}
                title="Export Services"
                description="Select the service columns you want in your CSV."
                availableColumns={SERVICE_EXPORT_COLUMNS}
                onConfirm={handleExport}
            />

            {/* 7. Service Drawer */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent className="sm:max-w-md w-full p-0 flex flex-col gap-0 bg-gray-50/50">
                    {selectedService && (
                        <>
                            <div className="bg-white px-6 py-4 border-b border-gray-200">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-xl font-bold text-gray-900">{selectedService.name}</h2>
                                        </div>
                                        <div className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded inline-block">
                                            {selectedService.code}
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => { setDrawerOpen(false); handleOpenEditModal(selectedService); }}>
                                        <Edit2 className="w-3 h-3 mr-2" /> Edit
                                    </Button>
                                </div>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-6">
                                    <Card className="p-4 border-gray-200 shadow-sm space-y-4">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> Service Details
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500 block">Default Price</span>
                                                <span className="font-mono font-medium text-gray-900">${selectedService.default_price.toFixed(2)}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Status</span>
                                                <StatusBadge status={selectedService.status} />
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Approval Required</span>
                                                <ApprovalBadge required={selectedService.approval_required} />
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Last Updated</span>
                                                <span className="text-gray-900">{new Date(selectedService.updated_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {selectedService.notes && (
                                            <div className="pt-4 border-t border-gray-100">
                                                <span className="text-gray-500 block text-xs mb-1">Notes</span>
                                                <p className="text-sm text-gray-700 bg-amber-50 p-2 rounded border border-amber-100">
                                                    {selectedService.notes}
                                                </p>
                                            </div>
                                        )}
                                    </Card>

                                </div>
                            </ScrollArea>
                        </>
                    )}
                </SheetContent>
            </Sheet>

        </div>
    );
}
