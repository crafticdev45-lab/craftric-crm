import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { usePermissions } from '../context/PermissionsContext';
import { LastModified } from '../components/LastModified';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Plus, Package, Trash2, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, getModelsByProduct, addModel, deleteModel, deleteProduct, updateModel } = useData();
  const { canEdit, canDelete, canAdd } = usePermissions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    stock: 0,
    price: 0,
  });

  const product = products.find(p => String(p.id) === String(id));
  const models = getModelsByProduct(id || '');

  if (!product) {
    return (
      <div className="p-8">
        <Link to="/products" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Link>
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  const totalStock = models.reduce((sum, model) => sum + model.stock, 0);
  const totalValue = models.reduce((sum, model) => sum + (model.stock * model.price), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addModel({ ...formData, productId: product.id });
    setFormData({ name: '', sku: '', stock: 0, price: 0 });
    setIsDialogOpen(false);
  };

  const handleStockChange = (modelId: string, newStock: number) => {
    if (newStock >= 0) {
      updateModel(modelId, { stock: newStock });
    }
  };

  const handleDeleteProduct = () => {
    if (window.confirm('Delete this product and all its models?')) {
      deleteProduct(product.id);
      navigate('/products');
    }
  };

  const handlePriceChange = (modelId: string, newPrice: number) => {
    if (newPrice >= 0) {
      updateModel(modelId, { price: newPrice });
    }
  };

  return (
    <div className="p-8">
      <Link to="/products" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Product Information</CardTitle>
              {canDelete('products') && (
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDeleteProduct}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
                    <p className="text-gray-600">{product.category}</p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="text-gray-900">{product.description}</p>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <LastModified lastModifiedBy={product.lastModifiedBy} lastModifiedAt={product.lastModifiedAt} createdAt={product.createdAt} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Total Models</p>
                <p className="text-2xl font-bold text-gray-900">{models.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Stock</p>
                <p className="text-2xl font-bold text-gray-900">{totalStock}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Models</CardTitle>
            {canAdd('models') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Model
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Model</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="model-name">Model Name</Label>
                    <Input
                      id="model-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">Add Model</Button>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No models yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {models.map((model) => (
                <div key={model.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{model.name}</h3>
                      <p className="text-sm text-gray-600">SKU: {model.sku}</p>
                    </div>
                    {canDelete('models') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteModel(model.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`stock-${model.id}`} className="text-xs text-gray-600 mb-1">Stock</Label>
                      <div className="flex items-center gap-2">
                        {canEdit('models') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStockChange(model.id, model.stock - 1)}
                        >
                          -
                        </Button>
                        )}
                        <Input
                          id={`stock-${model.id}`}
                          type="number"
                          min="0"
                          value={model.stock}
                          onChange={(e) => handleStockChange(model.id, parseInt(e.target.value) || 0)}
                          className="text-center"
                          disabled={!canEdit('models')}
                        />
                        {canEdit('models') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStockChange(model.id, model.stock + 1)}
                        >
                          +
                        </Button>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor={`price-${model.id}`} className="text-xs text-gray-600 mb-1">Price</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id={`price-${model.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={model.price}
                          onChange={(e) => handlePriceChange(model.id, parseFloat(e.target.value) || 0)}
                          className="pl-8"
                          disabled={!canEdit('models')}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <LastModified lastModifiedBy={model.lastModifiedBy} lastModifiedAt={model.lastModifiedAt} />
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-600">Total Value:</span>
                      <span className="font-bold text-gray-900">${(model.stock * model.price).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
