import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Plus, Mail, User as UserIcon, Shield, Trash2, Pencil, MailCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ObjectType } from '../types';
import { LastModified } from '../components/LastModified';

const OBJECT_LABELS: Record<ObjectType, string> = {
  customers: 'Companies',
  contacts: 'Contacts',
  products: 'Products',
  models: 'Models',
  leads: 'Leads',
  users: 'Users',
};

export function Users() {
  const { users, addUser, updateUser, deleteUser, currentUser, sendPasswordResetLink } = useAuth();
  const { canAdd, canEdit, canDelete, canManagePermissions, getUserPermissions, updateUserPermissions } = usePermissions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '' });
  const [resetLinkSending, setResetLinkSending] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'sales' as 'admin' | 'sales' | 'manager',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addUser(formData);
    setFormData({ name: '', email: '', role: 'sales' });
    setIsDialogOpen(false);
  };

  const handleDeleteUser = (user: { id: string; name: string }) => {
    if (user.id === currentUser?.id) {
      window.alert('You cannot delete your own account.');
      return;
    }
    if (window.confirm(`Delete user ${user.name}?`)) deleteUser(user.id);
  };

  const openEditDialog = (user: { id: string; name: string; email: string; role: string }) => {
    setEditingUser(user);
    setEditForm({ name: user.name, email: user.email });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    updateUser(editingUser.id, { name: editForm.name.trim(), email: editForm.email.trim() });
    setEditingUser(null);
  };

  const handleSendResetLink = async () => {
    const email = editForm.email.trim();
    if (!email) {
      window.alert('Enter the user’s email first.');
      return;
    }
    setResetLinkSending(true);
    const result = await sendPasswordResetLink(email);
    setResetLinkSending(false);
    if (result.success) {
      window.alert(`Password reset link sent to ${email}.`);
    } else {
      window.alert(result.error ?? 'Failed to send reset link.');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'sales': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-2">Manage system users and their roles</p>
        </div>
        {canAdd('users') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value: 'admin' | 'sales' | 'manager') => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Add User</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-3 bg-blue-50 rounded-full flex-shrink-0">
                    <UserIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg text-gray-900 truncate" title={user.name}>{user.name}</h3>
                    <p className="text-sm text-gray-600 truncate" title={user.email}>{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {canEdit('users') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 h-8 w-8"
                      onClick={() => openEditDialog(user)}
                      title="Edit user"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete('users') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                      onClick={() => handleDeleteUser(user)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Role</span>
                  <span className={`px-3 py-1 rounded-full text-xs capitalize ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                <LastModified
                  lastModifiedBy={user.lastModifiedBy}
                  lastModifiedAt={user.lastModifiedAt}
                  createdAt={user.createdAt}
                  className="pt-3 border-t border-gray-200"
                />
                {canManagePermissions() && (
                  <div className="pt-3">
                    <PermissionsDialog user={user} getUserPermissions={getUserPermissions} updateUserPermissions={updateUserPermissions} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No users found</p>
        </div>
      )}

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" className="w-full">Save changes</Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={resetLinkSending}
                onClick={handleSendResetLink}
              >
                <MailCheck className="w-4 h-4 mr-2" />
                {resetLinkSending ? 'Sending…' : 'Send reset password link'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PermissionsDialog({
  user,
  getUserPermissions,
  updateUserPermissions,
}: {
  user: { id: string; name: string; role: string };
  getUserPermissions: (userId: string, ot: ObjectType) => { read: boolean; edit: boolean; delete: boolean };
  updateUserPermissions: (userId: string, ot: ObjectType, p: Partial<{ read: boolean; edit: boolean; delete: boolean }>) => void;
}) {
  const [open, setOpen] = useState(false);
  const objectTypes: ObjectType[] = ['customers', 'contacts', 'products', 'models', 'leads', 'users'];
  const isAdminUser = (user.role ?? '').toLowerCase() === 'admin';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Shield className="w-4 h-4 mr-2" />
          Manage Permissions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissions for {user.name}</DialogTitle>
        </DialogHeader>
        {isAdminUser ? (
          <p className="text-sm text-gray-600">Admin users have full access to all resources.</p>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">Set read, edit, and delete access for each object type.</p>
            <div className="space-y-4">
              {objectTypes.map((ot) => {
            const perms = getUserPermissions(user.id, ot);
            return (
              <div key={ot} className="flex items-center gap-6 p-3 border rounded-lg">
                <span className="font-medium w-24">{OBJECT_LABELS[ot]}</span>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perms.read}
                      onChange={(e) => updateUserPermissions(user.id, ot, { read: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Read</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perms.edit}
                      onChange={(e) => updateUserPermissions(user.id, ot, { edit: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Edit</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perms.delete}
                      onChange={(e) => updateUserPermissions(user.id, ot, { delete: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Delete</span>
                  </label>
                </div>
              </div>
            );
          })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
