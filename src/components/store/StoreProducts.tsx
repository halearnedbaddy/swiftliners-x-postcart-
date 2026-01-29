import { useState, useEffect, useRef } from 'react';
import { PackageIcon, SearchIcon, EditIcon, ArchiveIcon, ExternalLinkIcon, ImageIcon, RefreshCwIcon, LoaderIcon, CheckIcon, XIcon, InstagramIcon, FacebookIcon, LinkedInIcon, PlusIcon, LinkIcon, ImagePlusIcon, TrashIcon, CopyIcon, CheckCircleIcon, UploadIcon } from '@/components/icons';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sourceUrl?: string;
  sourcePlatform?: string;
  createdAt: string;
  updatedAt: string;
}

interface StoreProductsProps {
  storeSlug?: string;
}

export function StoreProducts({ storeSlug }: StoreProductsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', imageUrl: '' });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Add Product Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    price: '',
    description: '',
    imageUrl: '',
  });
  const [addingProduct, setAddingProduct] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [publishedRes, draftsRes] = await Promise.all([
        api.listPublishedProducts(),
        api.listDraftProducts(),
      ]);

      if (publishedRes.success && publishedRes.data) {
        setProducts(Array.isArray(publishedRes.data) ? publishedRes.data : []);
      }
      if (draftsRes.success && draftsRes.data) {
        setDrafts(Array.isArray(draftsRes.data) ? draftsRes.data : []);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      toast({ title: 'Failed to load products', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.triggerStoreRescan();
      if (res.success) {
        toast({ title: 'Sync started', description: 'Products will be updated from your social accounts' });
        setTimeout(loadProducts, 3000);
      } else {
        toast({ title: 'Sync failed', description: res.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Sync failed', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please select an image under 5MB', variant: 'destructive' });
      return;
    }

    // Convert to base64 for preview (in production, you'd upload to a storage service)
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (isEdit) {
        setEditForm(prev => ({ ...prev, imageUrl: base64 }));
      } else {
        setAddForm(prev => ({ ...prev, imageUrl: base64 }));
      }
      toast({ title: 'Image added!', description: 'Your image has been uploaded' });
    };
    reader.readAsDataURL(file);
  };

  const handleAddProduct = async () => {
    if (!addForm.name.trim() || !addForm.price) {
      toast({ title: 'Please fill in product name and price', variant: 'destructive' });
      return;
    }

    setAddingProduct(true);
    try {
      const res = await api.createProduct({
        name: addForm.name.trim(),
        description: addForm.description.trim() || undefined,
        price: parseFloat(addForm.price) || 0,
        images: addForm.imageUrl.trim() ? [addForm.imageUrl.trim()] : [],
      });

      if (res.success && res.data) {
        const newProduct = res.data as Product;
        setDrafts(prev => [newProduct, ...prev]);
        setShowAddModal(false);
        setAddForm({ name: '', price: '', description: '', imageUrl: '' });
        toast({ title: 'Product added!', description: 'Your product is saved as a draft. Publish it to make it visible.' });
      } else {
        toast({ title: 'Failed to add product', description: res.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Failed to add product', variant: 'destructive' });
    } finally {
      setAddingProduct(false);
    }
  };

  const handlePublish = async (product: Product) => {
    const res = await api.publishProduct(product.id);
    if (res.success) {
      setDrafts(prev => prev.filter(p => p.id !== product.id));
      setProducts(prev => [...prev, { ...product, status: 'PUBLISHED' }]);
      toast({ title: 'Product published!' });
    } else {
      toast({ title: 'Failed to publish', description: res.error, variant: 'destructive' });
    }
  };

  const handleArchive = async (product: Product) => {
    const res = await api.archiveProduct(product.id);
    if (res.success) {
      setProducts(prev => prev.filter(p => p.id !== product.id));
      toast({ title: 'Product archived' });
    } else {
      toast({ title: 'Failed to archive', description: res.error, variant: 'destructive' });
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(product.id);
    try {
      const res = await api.deleteProduct(product.id);
      if (res.success) {
        setProducts(prev => prev.filter(p => p.id !== product.id));
        setDrafts(prev => prev.filter(p => p.id !== product.id));
        toast({ title: 'Product deleted' });
      } else {
        toast({ title: 'Failed to delete', description: res.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Failed to delete product', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const getPaymentLink = (product: Product) => {
    if (!storeSlug || product.status !== 'PUBLISHED') return null;
    return `${window.location.origin}/store/${storeSlug}/product/${product.id}`;
  };

  const copyPaymentLink = async (product: Product) => {
    const link = getPaymentLink(product);
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(product.id);
      toast({ title: 'Link copied!', description: 'Share this link with your customers' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      imageUrl: product.images?.[0] || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setSaving(true);
    
    const res = await api.updateProductDetails(editingProduct.id, {
      name: editForm.name,
      description: editForm.description,
      price: parseFloat(editForm.price) || 0,
      images: editForm.imageUrl.trim() ? [editForm.imageUrl.trim()] : editingProduct.images,
    });
    
    if (res.success) {
      const updateFn = (prev: Product[]) => prev.map(p => 
        p.id === editingProduct.id 
          ? { 
              ...p, 
              name: editForm.name, 
              description: editForm.description, 
              price: parseFloat(editForm.price) || 0,
              images: editForm.imageUrl.trim() ? [editForm.imageUrl.trim()] : p.images,
            }
          : p
      );
      setProducts(updateFn);
      setDrafts(updateFn);
      setEditingProduct(null);
      toast({ title: 'Product updated!' });
    } else {
      toast({ title: 'Failed to update', description: res.error, variant: 'destructive' });
    }
    
    setSaving(false);
  };

  const getPlatformIcon = (platform?: string) => {
    switch (platform?.toUpperCase()) {
      case 'INSTAGRAM': return <InstagramIcon size={14} className="text-pink-500" />;
      case 'FACEBOOK': return <FacebookIcon size={14} className="text-blue-600" />;
      case 'LINKEDIN': return <LinkedInIcon size={14} className="text-blue-700" />;
      default: return null;
    }
  };

  const allProducts = filter === 'all' 
    ? [...products, ...drafts]
    : filter === 'published' 
      ? products 
      : drafts;

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => `KES ${amount.toLocaleString()}`;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="bg-muted h-8 w-32 rounded-null animate-pulse" />
          <div className="bg-muted h-10 w-32 rounded-null animate-pulse" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="bg-muted h-64 rounded-null-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Products</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-null-lg hover:bg-primary/90 transition font-medium"
          >
            <PlusIcon size={18} />
            Add Product
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-null-lg hover:bg-muted transition font-medium text-foreground"
          >
            <RefreshCwIcon size={18} className={syncing ? 'animate-spin' : ''} />
            Sync from Social
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {(['all', 'published', 'drafts'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-null-lg text-sm font-medium transition capitalize ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f} {f === 'all' ? `(${products.length + drafts.length})` : f === 'published' ? `(${products.length})` : `(${drafts.length})`}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 rounded-null-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Products Grid or Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="bg-card border border-border rounded-null-xl p-12 text-center">
          <PackageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-xl font-bold text-foreground mb-2">No products yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Add products manually or sync from your connected social accounts.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-null-lg hover:bg-primary/90 transition font-medium"
            >
              <PlusIcon size={20} />
              Add Product Manually
            </button>
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-input text-foreground rounded-null-lg hover:bg-muted transition font-medium"
            >
              <RefreshCwIcon size={20} className={syncing ? 'animate-spin' : ''} />
              Sync from Social
            </button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const paymentLink = getPaymentLink(product);
            const isDeleting = deletingId === product.id;
            const isCopied = copiedId === product.id;

            return (
              <div 
                key={product.id} 
                className="bg-card border border-border rounded-null-xl overflow-hidden hover:shadow-lg transition-all duration-300 group"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-muted">
                  {product.images?.[0] ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={48} className="text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className={`absolute top-3 left-3 px-2 py-1 rounded-null-full text-xs font-medium ${
                    product.status === 'PUBLISHED' 
                      ? 'bg-green-100 text-green-800' 
                      : product.status === 'DRAFT'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.status}
                  </div>

                  {/* Source Platform */}
                  {product.sourcePlatform && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 rounded-null-full flex items-center gap-1">
                      {getPlatformIcon(product.sourcePlatform)}
                    </div>
                  )}

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => startEdit(product)}
                      className="p-2 bg-white rounded-null-full hover:bg-gray-100 transition"
                      title="Edit"
                    >
                      <EditIcon size={18} className="text-gray-700" />
                    </button>
                    {product.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublish(product)}
                        className="p-2 bg-green-500 rounded-null-full hover:bg-green-600 transition"
                        title="Publish"
                      >
                        <CheckIcon size={18} className="text-white" />
                      </button>
                    )}
                    {product.status === 'PUBLISHED' && (
                      <button
                        onClick={() => handleArchive(product)}
                        className="p-2 bg-orange-500 rounded-null-full hover:bg-orange-600 transition"
                        title="Archive"
                      >
                        <ArchiveIcon size={18} className="text-white" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(product)}
                      disabled={isDeleting}
                      className="p-2 bg-red-500 rounded-null-full hover:bg-red-600 transition disabled:opacity-50"
                      title="Delete"
                    >
                      {isDeleting ? (
                        <LoaderIcon size={18} className="text-white animate-spin" />
                      ) : (
                        <TrashIcon size={18} className="text-white" />
                      )}
                    </button>
                    {product.sourceUrl && (
                      <a
                        href={product.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white rounded-null-full hover:bg-gray-100 transition"
                        title="View Source"
                      >
                        <ExternalLinkIcon size={18} className="text-gray-700" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-1 truncate">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                  )}
                  <p className="text-lg font-bold text-primary mb-3">{formatCurrency(product.price)}</p>
                  
                  {/* Payment Link Section */}
                  {paymentLink ? (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-null-lg">
                      <LinkIcon size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground truncate flex-1">{paymentLink}</span>
                      <button
                        onClick={() => copyPaymentLink(product)}
                        className="p-1 hover:bg-muted rounded-null transition flex-shrink-0"
                        title="Copy link"
                      >
                        {isCopied ? (
                          <CheckCircleIcon size={14} className="text-green-500" />
                        ) : (
                          <CopyIcon size={14} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  ) : product.status === 'DRAFT' ? (
                    <button
                      onClick={() => handlePublish(product)}
                      className="w-full text-sm px-3 py-2 bg-green-500 text-white rounded-null-lg hover:bg-green-600 transition font-medium flex items-center justify-center gap-2"
                    >
                      <CheckIcon size={14} />
                      Publish to Get Link
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-null-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Add New Product</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-muted rounded-null-lg transition"
              >
                <XIcon size={20} />
              </button>
            </div>
            
            <div className="space-y-5">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Product Name</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Vintage Denim Jacket"
                  className="w-full px-4 py-3 rounded-null-xl border border-input bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Price (KES)</label>
                <input
                  type="number"
                  value={addForm.price}
                  onChange={(e) => setAddForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g. 5000"
                  className="w-full px-4 py-3 rounded-null-xl border border-input bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              {/* Product Image */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Product Image</label>
                <div className="flex gap-3 mb-3">
                  {addForm.imageUrl ? (
                    <div className="relative w-20 h-20 rounded-null-xl overflow-hidden border border-border">
                      <img 
                        src={addForm.imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <button
                        onClick={() => setAddForm(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-null-full hover:bg-red-600 transition"
                      >
                        <XIcon size={12} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-null-xl border-2 border-dashed border-border flex items-center justify-center">
                      <ImagePlusIcon size={24} className="text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, false)}
                      className="hidden"
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-input rounded-null-lg hover:bg-muted transition text-sm font-medium text-foreground"
                    >
                      <UploadIcon size={16} />
                      Upload Image
                    </button>
                    <button 
                      type="button"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-null-lg hover:opacity-90 transition text-sm font-medium text-white"
                      onClick={() => {
                        toast({ title: 'Magic Studio coming soon', description: 'AI-powered image generation' });
                      }}
                    >
                      Magic Studio ✨
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="url"
                    value={addForm.imageUrl}
                    onChange={(e) => setAddForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="Or paste image URL..."
                    className="w-full pl-10 pr-4 py-3 rounded-null-xl border border-input bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition text-sm"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</label>
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your product..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-null-xl border border-input bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 border border-input rounded-null-xl hover:bg-muted transition font-medium text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                disabled={addingProduct || !addForm.name.trim() || !addForm.price}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-pink-500 text-white rounded-null-xl hover:opacity-90 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingProduct ? <LoaderIcon size={18} className="animate-spin" /> : null}
                Add to Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-null-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Edit Product</h3>
              <button 
                onClick={() => setEditingProduct(null)}
                className="p-1 hover:bg-muted rounded-null-lg transition"
              >
                <XIcon size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Product Image</label>
                <div className="flex gap-3">
                  {editForm.imageUrl ? (
                    <div className="relative w-16 h-16 rounded-null-lg overflow-hidden border border-border">
                      <img 
                        src={editForm.imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setEditForm(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute top-1 right-1 p-0.5 bg-red-500 rounded-null-full hover:bg-red-600 transition"
                      >
                        <XIcon size={10} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-null-lg border-2 border-dashed border-border flex items-center justify-center">
                      <ImagePlusIcon size={20} className="text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, true)}
                      className="hidden"
                    />
                    <button 
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-input rounded-null-lg hover:bg-muted transition text-sm font-medium text-foreground"
                    >
                      <UploadIcon size={14} />
                      Change Image
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Product Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-null-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 rounded-null-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Price (KES)</label>
                <input
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-4 py-2 rounded-null-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingProduct(null)}
                className="flex-1 px-4 py-2 border border-input rounded-null-lg hover:bg-muted transition font-medium text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-null-lg hover:bg-primary/90 transition font-medium flex items-center justify-center gap-2"
              >
                {saving ? <LoaderIcon size={18} className="animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
