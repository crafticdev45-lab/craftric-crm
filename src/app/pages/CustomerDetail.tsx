import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { usePermissions } from '../context/PermissionsContext';
import { LastModified } from '../components/LastModified';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Plus, Mail, Phone, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, leads, getContactsByCustomer, addContact, deleteContact, deleteCustomer, updateCustomer } = useData();
  const { canEdit, canDelete, canAdd } = usePermissions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });

  const customer = customers.find(c => c.id === id);
  const contacts = getContactsByCustomer(id || '');
  const linkedLead = customer?.leadId ? leads.find(l => l.id === customer.leadId) : null;

  if (!customer) {
    return (
      <div className="p-8">
        <Link to="/customers" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Companies
        </Link>
        <p className="text-gray-500">Company not found</p>
      </div>
    );
  }

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addContact({ ...formData, customerId: customer.id });
    setFormData({ name: '', email: '', phone: '', role: '' });
    setIsDialogOpen(false);
  };

  const handleDeleteCompany = () => {
    if (window.confirm('Delete this company and all its contacts?')) {
      deleteCustomer(customer.id);
      navigate('/customers');
    }
  };

  const handleCompanyUpdate = (field: 'name' | 'status' | 'leadId', value: string | null) => {
    updateCustomer(customer.id, field === 'leadId' ? { leadId: value } : { [field]: value });
  };

  return (
    <div className="p-8">
      <Link to="/customers" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Companies
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Company Information</CardTitle>
              <div className="flex items-center gap-2">
                {canDelete('customers') && (
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDeleteCompany}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
              <span className={`px-3 py-1 rounded-full text-sm ${
                customer.status === 'active' ? 'bg-green-100 text-green-700' :
                customer.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {customer.status}
              </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Name</p>
                <p className="text-2xl font-bold text-gray-900">{customer.name}</p>
              </div>
              {canEdit('customers') && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <Select value={customer.status} onValueChange={(v) => handleCompanyUpdate('status', v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              )}
              <div>
                <p className="text-sm text-gray-600 mb-1">Lead</p>
                <Select
                  value={customer.leadId ?? 'none'}
                  onValueChange={(v) => handleCompanyUpdate('leadId', v === 'none' ? null : v)}
                  disabled={!canEdit('customers')}
                >
                  <SelectTrigger className="w-full max-w-md">
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
                {linkedLead && (
                  <p className="text-sm text-gray-500 mt-2">
                    {linkedLead.name}, {linkedLead.company} • ${linkedLead.value.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="pt-4 border-t border-gray-200">
                <LastModified lastModifiedBy={customer.lastModifiedBy} lastModifiedAt={customer.lastModifiedAt} createdAt={customer.createdAt} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Total Contacts</p>
                <p className="text-2xl font-bold text-gray-900">{contacts.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-medium text-gray-900 capitalize">{customer.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contacts</CardTitle>
            {canAdd('contacts') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="contact-name">Name</Label>
                    <Input
                      id="contact-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-phone">Phone</Label>
                    <Input
                      id="contact-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-role">Role</Label>
                    <Input
                      id="contact-role"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">Add Contact</Button>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No contacts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{contact.name}</h3>
                    <p className="text-sm text-gray-600">{contact.role}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{contact.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{contact.phone}</span>
                      </div>
                    </div>
                  </div>
                  {canDelete('contacts') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteContact(contact.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
