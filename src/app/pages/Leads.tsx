import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { usePermissions } from '../context/PermissionsContext';
import { useAuth } from '../context/AuthContext';
import { LastModified } from '../components/LastModified';
import { ListSortControls } from '../components/ListSortControls';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Plus, Search, Mail, Phone, Building, Trash2, Pencil, Filter } from 'lucide-react';
import { applyDir, compareDateStrings, userSortName, type ListSortKey, type SortDir } from '../lib/listSort';
import { LEAD_FILTER_FIELDS, leadMatchesFieldFilter, type LeadFilterFieldKey } from '../lib/leadFilters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const COUNTRY_CODES = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'USA/Canada (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+86', label: 'China (+86)' },
] as const;

export function Leads() {
  const { leads, addLead, updateLead, deleteLead, error } = useData();
  const { users } = useAuth();
  const { canAdd, canEdit, canDelete } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<ListSortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterField, setFilterField] = useState<LeadFilterFieldKey>('all');
  const [filterValue, setFilterValue] = useState('');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<typeof leads[0] | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'new' as 'new' | 'contacted' | 'qualified' | 'lost' | 'converted',
    source: '',
    value: 0,
  });
  const [leadPhoneCode, setLeadPhoneCode] = useState<string>(COUNTRY_CODES[0].code);

  const displayedLeads = useMemo(() => {
    const sq = searchTerm.toLowerCase();
    let list = leads.filter(
      (lead) =>
        (lead.name ?? '').toLowerCase().includes(sq) ||
        (lead.company ?? '').toLowerCase().includes(sq) ||
        (lead.email ?? '').toLowerCase().includes(sq),
    );
    list = list.filter((l) => leadMatchesFieldFilter(l, filterField, filterValue, users));
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
      } else if (sortBy === 'createdAt') {
        cmp = compareDateStrings(a.createdAt, b.createdAt);
      } else {
        const na = userSortName(users, a.createdBy);
        const nb = userSortName(users, b.createdBy);
        cmp = na.localeCompare(nb, undefined, { sensitivity: 'base' });
      }
      if (cmp !== 0) return applyDir(cmp, sortDir);
      return applyDir(String(a.id).localeCompare(String(b.id)), sortDir);
    });
    return list;
  }, [leads, searchTerm, filterField, filterValue, users, sortBy, sortDir]);

  const filterActive = filterValue.trim().length > 0;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await addLead({ ...formData, phone: `${leadPhoneCode}${formData.phone}` });
    if (!ok) return;
    setFormData({ name: '', email: '', phone: '', company: '', status: 'new', source: '', value: 0 });
    setLeadPhoneCode(COUNTRY_CODES[0].code);
    setIsDialogOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    const ok = await updateLead(editingLead.id, formData);
    if (!ok) return;
    setEditingLead(null);
    setFormData({ name: '', email: '', phone: '', company: '', status: 'new', source: '', value: 0 });
  };

  const openEditDialog = (lead: typeof leads[0]) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? '',
      company: lead.company,
      status: lead.status,
      source: lead.source ?? '',
      value: lead.value ?? 0,
    });
  };

  const closeEditDialog = () => {
    setEditingLead(null);
    setFormData({ name: '', email: '', phone: '', company: '', status: 'new', source: '', value: 0 });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'contacted': return 'bg-purple-100 text-purple-700';
      case 'qualified': return 'bg-green-100 text-green-700';
      case 'lost': return 'bg-red-100 text-red-700';
      case 'converted': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600 mt-2">Manage your sales pipeline</p>
        </div>
        {canAdd('leads') && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
              )}
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <div className="flex gap-2">
                  <Select value={leadPhoneCode} onValueChange={(v) => setLeadPhoneCode(v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    value={formData.phone}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: digits });
                    }}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="e.g., Website, Referral, Cold Call"
                  required
                />
              </div>
              <div>
                <Label htmlFor="value">Estimated Value (₹)</Label>
                <Input
                  id="value"
                  type="number"
                  min="1"
                  value={formData.value}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setFormData({ ...formData, value: Number.isNaN(val) ? 0 : val });
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Add Lead</Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Edit Lead dialog */}
      <Dialog open={!!editingLead} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
            )}
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, phone: digits });
                }}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-company">Company</Label>
              <Input
                id="edit-company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-source">Source</Label>
              <Input
                id="edit-source"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="e.g., Website, Referral, Cold Call"
              />
            </div>
            <div>
              <Label htmlFor="edit-value">Estimated Value (₹)</Label>
              <Input
                id="edit-value"
                type="number"
                min="1"
                value={formData.value}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setFormData({ ...formData, value: Number.isNaN(val) ? 0 : val });
                }}
              />
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value: 'new' | 'contacted' | 'qualified' | 'lost' | 'converted') => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ListSortControls
            sortBy={sortBy}
            sortDir={sortDir}
            onSortByChange={setSortBy}
            onSortDirToggle={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            nameLabel="Lead name (A–Z)"
          />
          <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
                {filterActive && (
                  <span className="rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-xs font-medium">On</span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Filter leads</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-filter-field">Field</Label>
                  <Select
                    value={filterField}
                    onValueChange={(v) => {
                      setFilterField(v as LeadFilterFieldKey);
                      setFilterValue('');
                    }}
                  >
                    <SelectTrigger id="lead-filter-field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_FILTER_FIELDS.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filterField === 'status' ? (
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={filterValue || 'any'} onValueChange={(v) => setFilterValue(v === 'any' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-filter-value">
                      {filterField === 'all' ? 'Contains (any column)' : 'Value'}
                    </Label>
                    <Input
                      id="lead-filter-value"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder={
                        filterField === 'value'
                          ? 'e.g. 5000'
                          : filterField === 'all'
                            ? 'Type to match name, email, company…'
                            : 'Filter…'
                      }
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterField('all');
                      setFilterValue('');
                    }}
                  >
                    Clear
                  </Button>
                  <Button type="button" size="sm" onClick={() => setFilterDialogOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedLeads.map((lead) => (
          <Card key={lead.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{lead.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                    <Building className="w-4 h-4" />
                    <span>{lead.company}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{lead.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{lead.phone}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Value</span>
                  <span className="font-bold text-gray-900">₹{(Number(lead.value) || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Source</span>
                  <span className="text-sm text-gray-900">{lead.source}</span>
                </div>
                <LastModified lastModifiedBy={lead.lastModifiedBy} lastModifiedAt={lead.lastModifiedAt} createdBy={lead.createdBy} createdAt={lead.createdAt} className="mt-2" />
              </div>

              <div className="mt-4 flex items-center gap-2 flex-wrap">
              {canEdit('leads') && (
                <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(lead)}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Select
                  value={lead.status}
                  onValueChange={(value: any) => updateLead(lead.id, { status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
                </>
              )}
              {canDelete('leads') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={async () => {
                  if (!window.confirm('Delete this lead?')) return;
                  const deleted = await deleteLead(lead.id);
                  if (!deleted) alert('Cannot delete this lead: it is linked to an existing customer.');
                }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {displayedLeads.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No leads found</p>
        </div>
      )}
    </div>
  );
}