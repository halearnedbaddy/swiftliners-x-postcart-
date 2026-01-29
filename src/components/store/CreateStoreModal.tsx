import { useState } from 'react';
import { X, Store, Link2, Loader2 } from 'lucide-react';
import { api } from '@/services/api';

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoreCreated: (store: { id: string; name: string; slug: string; logo?: string | null; bio?: string | null; visibility?: string; status?: string }) => void;
}

export function CreateStoreModal({ isOpen, onClose, onStoreCreated }: CreateStoreModalProps) {
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSlugChange = (value: string) => {
    // Auto-format slug: lowercase, replace spaces with hyphens, remove special chars
    const formatted = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setStoreSlug(formatted);
  };

  const handleNameChange = (value: string) => {
    setStoreName(value);
    // Auto-generate slug from name if slug is empty or matches previous auto-generated value
    if (!storeSlug || storeSlug === storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) {
      handleSlugChange(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!storeName.trim()) {
      setError('Please enter a store name');
      return;
    }
    if (!storeSlug.trim()) {
      setError('Please enter a store link');
      return;
    }
    if (storeSlug.length < 3) {
      setError('Store link must be at least 3 characters');
      return;
    }

    setIsCreating(true);

    try {
      const res = await api.createStore({
        name: storeName.trim(),
        slug: storeSlug.trim(),
      });

      if (res.success && res.data) {
        const storeData = res.data as any;
        onStoreCreated({
          id: storeData.id || `store_${Date.now()}`,
          name: storeData.name || storeName.trim(),
          slug: storeData.slug || storeSlug.trim(),
          logo: storeData.logo || null,
          bio: storeData.bio || null,
          visibility: storeData.visibility || 'PRIVATE',
          status: storeData.status || 'INACTIVE',
        });
        setStoreName('');
        setStoreSlug('');
        onClose();
      } else {
        setError(res.error || 'Failed to create store. Please try again.');
      }
    } catch (err) {
      setError('Failed to create store. Please try again.');
      console.error('Create store error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-null max-w-md w-full p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-null bg-primary/10 flex items-center justify-center">
              <Store className="text-primary" size={24} />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Create Your Store</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground transition p-2 hover:bg-muted rounded-null"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-muted-foreground mb-6">
          Set up your store to start selling. You can customize it further after creation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Store Name *
            </label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                value={storeName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Awesome Store"
                className="w-full pl-10 pr-4 py-3 rounded-null border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                maxLength={50}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Store Link *
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                value={storeSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="my-awesome-store"
                className="w-full pl-10 pr-4 py-3 rounded-null border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                maxLength={30}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Your store URL: <span className="font-mono text-primary">/store/{storeSlug || 'your-store'}</span>
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-null text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-null border border-input bg-background text-foreground hover:bg-muted transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-4 py-3 rounded-null bg-primary text-primary-foreground hover:bg-primary/90 transition font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creating...
                </>
              ) : (
                'Create Store'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
