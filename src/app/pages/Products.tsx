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
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Plus, Search, Package, Trash2, Filter } from 'lucide-react';
import {
  PRODUCT_FILTER_FIELDS,
  productMatchesFieldFilter,
  type ProductFilterFieldKey,
} from '../lib/customerProductFilters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';

export function Products() {
  const { products, addProduct, deleteProduct, getModelsByProduct, error } = useData();
  const { users } = useAuth();
  const { canRead, canAdd, canDelete } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<ListSortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterField, setFilterField] = useState<ProductFilterFieldKey>('all');
  const [filterValue, setFilterValue] = useState('');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
  });

  const searchFilteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        (product.description ?? '').toLowerCase().includes(q),
    );
  }, [products, searchTerm]);

  const filteredProducts = useMemo(
    () =>
      searchFilteredProducts.filter((p) =>
        productMatchesFieldFilter(p, filterField, filterValue, users),
      ),
    [searchFilteredProducts, filterField, filterValue, users],
  );

  const filterActive = filterValue.trim().length > 0;

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
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
  }, [filteredProducts, sortBy, sortDir, users]);

  const handleDeleteProduct = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Delete this product and all its models?')) deleteProduct(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await addProduct(formData);
    if (!ok) return;
    setFormData({ name: '', description: '', category: '' });
    setIsDialogOpen(false);
  };

  if (!canRead('products')) {
    return (
      <div className="p-8">
        <p className="text-gray-600">You don&apos;t have permission to view products.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-2">Manage your product catalog</p>
        </div>
        {canAdd('products') && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
              )}
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Add Product</Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search products..."
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
            nameLabel="Product name (A–Z)"
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
                <DialogTitle>Filter products</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="product-filter-field">Field</Label>
                  <Select
                    value={filterField}
                    onValueChange={(v) => {
                      setFilterField(v as ProductFilterFieldKey);
                      setFilterValue('');
                    }}
                  >
                    <SelectTrigger id="product-filter-field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_FILTER_FIELDS.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="product-filter-value">
                    {filterField === 'all' ? 'Contains (any column)' : 'Value'}
                  </Label>
                  <Input
                    id="product-filter-value"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder={
                      filterField === 'all'
                        ? 'Type to match name, category, description…'
                        : 'Filter…'
                    }
                  />
                </div>
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
        {sortedProducts.map((product) => {
          const models = getModelsByProduct(product.id);
          const totalStock = models.reduce((sum, model) => sum + model.stock, 0);
          
          return (
            <Link key={String(product.id)} to={`/products/${String(product.id)}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-600">{product.category}</p>
                    </div>
                    {canDelete('products') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 shrink-0"
                        onClick={(e) => handleDeleteProduct(e, product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Total Stock</p>
                      <p className="font-bold text-gray-900">{totalStock}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Models</p>
                      <p className="font-bold text-gray-900">{models.length}</p>
                    </div>
                    <LastModified
                      lastModifiedBy={product.lastModifiedBy}
                      lastModifiedAt={product.lastModifiedAt}
                      createdBy={product.createdBy}
                      createdAt={product.createdAt}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {sortedProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found</p>
        </div>
      )}
    </div>
  );
}
