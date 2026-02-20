import { Link, Outlet, useLocation } from 'react-router';
import { LayoutDashboard, Users, Package, UserPlus, UsersRound, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { Button } from './ui/button';

export function Layout() {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { canRead } = usePermissions();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, objectType: null as 'customers' | 'contacts' | 'products' | 'models' | 'leads' | 'users' | null },
    { path: '/customers', label: 'Companies', icon: Users, objectType: 'customers' as const },
    { path: '/products', label: 'Products', icon: Package, objectType: 'products' as const },
    { path: '/leads', label: 'Leads', icon: UserPlus, objectType: 'leads' as const },
    { path: '/users', label: 'Users', icon: UsersRound, objectType: 'users' as const },
  ].filter((item) => item.objectType == null || canRead(item.objectType));

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900">Craftric Interior CRM</h1>
        </div>
        <nav className="px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 space-y-2">
          {currentUser && (
            <>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
                <p className="text-xs text-gray-600">{currentUser.email}</p>
                <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 capitalize">
                  {currentUser.role}
                </span>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}