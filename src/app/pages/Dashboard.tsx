import { useData } from '../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, Package, UserPlus, TrendingUp } from 'lucide-react';

export function Dashboard() {
  const { customers, products, leads } = useData();

  const stats = [
    {
      title: 'Total Customers',
      value: customers.length,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Products',
      value: products.length,
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Active Leads',
      value: leads.filter(l => l.status !== 'lost' && l.status !== 'converted').length,
      icon: UserPlus,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Pipeline Value',
      value: `$${leads.reduce((sum, l) => sum + l.value, 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to your CRM overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customers.slice(0, 5).map((customer) => (
                <div key={customer.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{customer.name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    customer.status === 'active' ? 'bg-green-100 text-green-700' :
                    customer.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {customer.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{lead.name}</p>
                    <p className="text-sm text-gray-600">{lead.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${lead.value.toLocaleString()}</p>
                    <span className={`text-xs ${
                      lead.status === 'new' ? 'text-blue-600' :
                      lead.status === 'contacted' ? 'text-purple-600' :
                      lead.status === 'qualified' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
