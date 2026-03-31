import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useData } from '../context/DataContext';
import { usePermissions } from '../context/PermissionsContext';
import { useAuth } from '../context/AuthContext';
import { LastModified } from '../components/LastModified';
import { ListSortControls } from '../components/ListSortControls';
import { applyDir, compareDateStrings, userSortName, type ListSortKey, type SortDir } from '../lib/listSort';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Plus, Search, Users, Trash2, Filter } from 'lucide-react';
import {
  CUSTOMER_FILTER_FIELDS,
  customerMatchesFieldFilter,
  type CustomerFilterFieldKey,
} from '../lib/customerProductFilters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export function Customers() {
  const { customers, leads, addCustomer, deleteCustomer, getContactsByCustomer } = useData();
  const { users } = useAuth();
  const { canAdd, canDelete } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<ListSortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterField, setFilterField] = useState<CustomerFilterFieldKey>('all');
  const [filterValue, setFilterValue] = useState('');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    status: 'active' as 'active' | 'inactive' | 'pending',
    leadId: '' as string | null,
  });

  const searchFilteredCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return customers.filter((customer) => (customer.name ?? '').toLowerCase().includes(q));
  }, [customers, searchTerm]);

  const filteredCustomers = useMemo(
    () =>
      searchFilteredCustomers.filter((c) =>
        customerMatchesFieldFilter(c, filterField, filterValue, users, leads),
      ),
    [searchFilteredCustomers, filterField, filterValue, users, leads],
  );

  const filterActive = filterValue.trim().length > 0;

  const sortedCustomers = useMemo(() => {
    const list = [...filteredCustomers];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
      } else if (sortBy === 'createdAt') {
        cmp = compareDateStrings(a.createdAt, b.createdAt);
      } else {
        const na = userSortName(users, a.createdBy ?? a.lastModifiedBy);
        const nb = userSortName(users, b.createdBy ?? b.lastModifiedBy);
        cmp = na.localeCompare(nb, undefined, { sensitivity: 'base' });
      }
      return applyDir(cmp, sortDir);
    });
    return list;
  }, [filteredCustomers, sortBy, sortDir, users]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer({
      name: formData.name,
      status: formData.status,
      leadId: formData.leadId || null,
    });
    setFormData({ name: '', status: 'active', leadId: '' });
    setIsDialogOpen(false);
  };

  const handleDeleteCustomer = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Delete this company and all its contacts?')) deleteCustomer(id);
  };

  const getLeadDisplay = (leadId: string | null) => {
    if (!leadId) return null;
    const lead = leads.find(l => l.id === leadId);
    return lead ? `${lead.name} (${lead.company})` : null;
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-2">Manage your company details</p>
        </div>
        {canAdd('customers') && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Company name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'active' | 'inactive' | 'pending') => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="lead">Lead</Label>
                <Select
                  value={formData.leadId ?? 'none'}
                  onValueChange={(v) => setFormData({ ...formData, leadId: v === 'none' ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No lead</SelectItem>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name} – {lead.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Add Company</Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search companies..."
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
            nameLabel="Company name (A–Z)"
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
                <DialogTitle>Filter companies</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="customer-filter-field">Field</Label>
                  <Select
                    value={filterField}
                    onValueChange={(v) => {
                      setFilterField(v as CustomerFilterFieldKey);
                      setFilterValue('');
                    }}
                  >
                    <SelectTrigger id="customer-filter-field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_FILTER_FIELDS.map((f) => (
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
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-filter-value">
                      {filterField === 'all' ? 'Contains (any column)' : 'Value'}
                    </Label>
                    <Input
                      id="customer-filter-value"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder={
                        filterField === 'leadId'
                          ? 'Lead name, company, or email…'
                          : filterField === 'all'
                            ? 'Type to match name, status, lead…'
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
        {sortedCustomers.map((customer) => {
          const contactCount = getContactsByCustomer(customer.id).length;
          const leadDisplay = getLeadDisplay(customer.leadId);
          return (
            <Link key={customer.id} to={`/customers/${customer.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{customer.name}</h3>
                      {leadDisplay && (
                        <p className="text-sm text-gray-600 mt-1">Lead: {leadDisplay}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {canDelete('customers') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                          onClick={(e) => handleDeleteCustomer(e, customer.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      customer.status === 'active' ? 'bg-green-100 text-green-700' :
                      customer.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {customer.status}
                    </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{contactCount} contact{contactCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <LastModified
                      lastModifiedBy={customer.lastModifiedBy}
                      lastModifiedAt={customer.lastModifiedAt}
                      createdBy={customer.createdBy}
                      createdAt={customer.createdAt}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {sortedCustomers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No companies found</p>
        </div>
      )}
    </div>
  );
}
