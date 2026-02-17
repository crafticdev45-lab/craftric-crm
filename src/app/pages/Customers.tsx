import { useState } from 'react';
import { Link } from 'react-router';
import { useData } from '../context/DataContext';
import { usePermissions } from '../context/PermissionsContext';
import { LastModified } from '../components/LastModified';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Plus, Search, Users, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export function Customers() {
  const { customers, leads, addCustomer, deleteCustomer, getContactsByCustomer } = useData();
  const { canAdd, canDelete } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    status: 'active' as 'active' | 'inactive' | 'pending',
    leadId: '' as string | null,
  });

  const filteredCustomers = customers.filter(customer =>
    (customer.name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => {
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
                    <LastModified lastModifiedBy={customer.lastModifiedBy} lastModifiedAt={customer.lastModifiedAt} createdAt={customer.createdAt} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No companies found</p>
        </div>
      )}
    </div>
  );
}
