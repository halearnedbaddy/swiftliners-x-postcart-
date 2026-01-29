import { useState, useRef, useEffect } from 'react';
import { Copy, CheckCircle, ArrowRight, Loader2, Share2, ImagePlus, X, ChevronLeft, ChevronRight, Globe, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { LinkedInIcon } from '@/components/icons/LinkedInIcon';
import { useCurrency } from '@/hooks/useCurrency';

const SUPABASE_URL = "https://pxyyncsnjpuwvnwyfdwx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4eXluY3NuanB1d3Zud3lmZHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDY5NDMsImV4cCI6MjA4MzU4Mjk0M30.n-tEs1U3qB7E_eov-zVL2g7crlhNOqJ5cF5TcUeV_dI";

const MAX_IMAGES = 5;

interface CreatePaymentLinkResponse {
  id: string;
  productName: string;
  price: number;
  productDescription?: string | null;
  images?: string[];
  linkUrl?: string;
}

interface GeneratedLink {
    id: string;
    linkUrl: string;
    productName: string;
    price: number;
    productDescription?: string;
    images: string[];
}

export function LinkGenerator() {
    const { selectedCountry, formatPrice, SUPPORTED_COUNTRIES } = useCurrency();
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [formData, setFormData] = useState({
        item: '',
        price: '',
        originalPrice: '',
        description: '',
        customerPhone: '',
        currency: selectedCountry.currencyCode,
        expiryHours: '24'
    });
    const [images, setImages] = useState<string[]>([]);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [paymentLink, setPaymentLink] = useState<GeneratedLink | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check Supabase auth on mount
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsAuthenticated(!!session?.user);
        });
    }, []);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const remainingSlots = MAX_IMAGES - images.length;
        if (remainingSlots <= 0) {
            setError(`Maximum ${MAX_IMAGES} images allowed`);
            return;
        }

        const filesToProcess = Array.from(files).slice(0, remainingSlots);
        setError(null);
        setIsUploadingImage(true);

        try {
            const newImages: string[] = [];
            
            for (const file of filesToProcess) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    continue;
                }

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    continue;
                }

                // Convert to base64
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target?.result as string);
                    reader.onerror = () => reject(new Error('Failed to read file'));
                    reader.readAsDataURL(file);
                });
                
                newImages.push(base64);
            }

            if (newImages.length > 0) {
                setImages(prev => [...prev, ...newImages]);
            }
        } catch (err) {
            setError('Failed to upload images');
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        if (activeImageIndex >= images.length - 1 && activeImageIndex > 0) {
            setActiveImageIndex(activeImageIndex - 1);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsGenerating(true);

        try {
            // Get current session from Supabase
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session?.user) {
                setError('Please log in to create payment links');
                setIsGenerating(false);
                return;
            }

            const price = parseFloat(formData.price);
            if (isNaN(price) || price <= 0) {
                setError('Please enter a valid price');
                setIsGenerating(false);
                return;
            }

            // Calculate expiry hours
            const expiryHours = formData.expiryHours && formData.expiryHours !== 'never' 
                ? parseInt(formData.expiryHours) 
                : undefined;

            // Build headers with auth token
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${session.access_token}`,
            };

            // Call the links-api edge function directly
            const response = await fetch(`${SUPABASE_URL}/functions/v1/links-api`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    productName: formData.item,
                    productDescription: formData.description || undefined,
                    price: price,
                    originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
                    images: images.length > 0 ? images : [],
                    customerPhone: formData.customerPhone || undefined,
                    currency: formData.currency,
                    quantity: 1,
                    expiryHours: expiryHours,
                }),
            });

            const result = await response.json();

            if (result.success && result.data) {
                const data = result.data as CreatePaymentLinkResponse;
                // Always use current origin so shared link works when opened by buyer (same domain as seller)
                const linkUrl = data.linkUrl || `${window.location.origin}/buy/${data.id}`;
                setPaymentLink({
                    id: data.id,
                    linkUrl,
                    productName: data.productName,
                    price: Number(data.price),
                    productDescription: data.productDescription ?? undefined,
                    images: data.images ?? images,
                });
                setStep('success');
                setActiveImageIndex(0);
            } else {
                setError(result.error || 'Failed to create payment link');
            }
        } catch (err: any) {
            console.error('Error creating link:', err);
            setError(err.message || 'Failed to create payment link. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async () => {
        if (!paymentLink) return;
        try {
            await navigator.clipboard.writeText(paymentLink.linkUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = paymentLink.linkUrl;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getShareText = () => {
        if (!paymentLink) return '';
        return `Hi! 👋\n\nCheck out this product I'm selling:\n${paymentLink.productName} - ${formatPrice(paymentLink.price, formData.currency)}\n\nView and buy securely here:\n${paymentLink.linkUrl}\n\n✅ Secure payment\n✅ Buyer protection\n✅ Fast delivery`;
    };

    const shareToWhatsApp = () => {
        if (!paymentLink) return;
        const text = getShareText();
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareToFacebook = () => {
        if (!paymentLink) return;
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(paymentLink.linkUrl)}&quote=${encodeURIComponent(getShareText())}`, '_blank');
    };

    const shareToTwitter = () => {
        if (!paymentLink) return;
        const text = `Check out ${paymentLink.productName} - ${formatPrice(paymentLink.price, formData.currency)}! Buy securely: ${paymentLink.linkUrl}`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareToLinkedIn = () => {
        if (!paymentLink) return;
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(paymentLink.linkUrl)}`, '_blank');
    };

    const shareToTikTok = () => {
        if (!paymentLink) return;
        // TikTok doesn't have a direct share URL, so we copy the link and guide user
        copyToClipboard();
        alert('Link copied! Open TikTok and paste the link in your bio or video description.');
    };

    const shareToInstagram = () => {
        if (!paymentLink) return;
        // Instagram doesn't have a direct share URL, so we copy the link and guide user
        copyToClipboard();
        alert('Link copied! Open Instagram and paste the link in your bio or story.');
    };

    const shareNative = async () => {
        if (!paymentLink) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Payment for ${paymentLink.productName}`,
                    text: `Pay securely using PayLoom Escrow`,
                    url: paymentLink.linkUrl,
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            copyToClipboard();
        }
    };

    const resetForm = () => {
        setStep('form');
        setFormData({ item: '', price: '', originalPrice: '', description: '', customerPhone: '', currency: selectedCountry.currencyCode, expiryHours: '24' });
        setImages([]);
        setPaymentLink(null);
        setError(null);
        setActiveImageIndex(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const nextImage = () => {
        if (paymentLink && paymentLink.images.length > 0) {
            setActiveImageIndex((prev) => (prev + 1) % paymentLink.images.length);
        }
    };

    const prevImage = () => {
        if (paymentLink && paymentLink.images.length > 0) {
            setActiveImageIndex((prev) => (prev - 1 + paymentLink.images.length) % paymentLink.images.length);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-black text-foreground mb-2">Create Payment Link</h2>
                <p className="text-muted-foreground">Turn any product into a secure checkout link for social media.</p>
                {!isAuthenticated && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                        Demo mode: Log in to create real payment links
                    </p>
                )}
            </div>

            <div className="bg-card rounded-null shadow-xl border border-border overflow-hidden">
                {step === 'form' ? (
                    <div className="p-8">
                        <form onSubmit={handleGenerate} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-null text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">Product Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Nike Air Max 2024"
                                    className="w-full px-4 py-3 rounded-null border border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition font-medium"
                                    value={formData.item}
                                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-foreground mb-2">Currency</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                        <select
                                            className="w-full pl-12 pr-4 py-3 rounded-null border border-border bg-background text-foreground focus:outline-none focus:border-primary transition font-bold"
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        >
                                            {SUPPORTED_COUNTRIES.map(c => (
                                                <option key={c.code} value={c.currencyCode}>{c.currencyCode} ({c.name})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-foreground mb-2">Sale Price *</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            required
                                            min="100"
                                            placeholder="0.00"
                                            className="w-full px-4 py-3 rounded-null border border-border bg-background text-foreground focus:outline-none focus:border-primary transition font-bold text-lg"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">
                                    Product Images * 
                                    <span className="text-muted-foreground font-normal ml-2">
                                        {images.length}/{MAX_IMAGES}
                                    </span>
                                </label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                                
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    {images.map((img, index) => (
                                        <div 
                                            key={index} 
                                            className="relative aspect-square rounded-null border border-border overflow-hidden bg-muted group"
                                        >
                                            <img
                                                src={img}
                                                alt={`Product ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-null-full flex items-center justify-center hover:opacity-90 transition shadow-lg opacity-0 group-hover:opacity-100"
                                            >
                                                <X size={12} />
                                            </button>
                                            {index === 0 && (
                                                <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-null font-medium">
                                                    Main
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    
                                    {images.length < MAX_IMAGES && (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploadingImage}
                                            className="aspect-square rounded-null border-2 border-dashed border-border bg-muted/50 hover:bg-muted hover:border-primary/50 transition flex flex-col items-center justify-center gap-1 text-muted-foreground disabled:opacity-50"
                                        >
                                            {isUploadingImage ? (
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                            ) : (
                                                <>
                                                    <ImagePlus className="w-6 h-6" />
                                                    <span className="text-[10px] font-medium">Add</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                                
                                {images.length === 0 && (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingImage}
                                        className="w-full h-32 rounded-null border-2 border-dashed border-border bg-muted/50 hover:bg-muted hover:border-primary/50 transition flex flex-col items-center justify-center gap-2 text-muted-foreground disabled:opacity-50"
                                    >
                                        {isUploadingImage ? (
                                            <>
                                                <Loader2 className="w-8 h-8 animate-spin" />
                                                <span className="text-sm font-medium">Uploading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <ImagePlus className="w-8 h-8" />
                                                <span className="text-sm font-medium">Click to upload product images</span>
                                                <span className="text-xs">PNG, JPG up to 5MB each • Max {MAX_IMAGES} images</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">Product Description *</label>
                                <textarea
                                    rows={3}
                                    required
                                    placeholder="Describe your product (size, condition, etc.)"
                                    className="w-full px-4 py-3 rounded-null border border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition resize-none"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-foreground mb-2">Customer Phone (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="+254 7XX XXX XXX"
                                        className="w-full px-4 py-3 rounded-null border border-border bg-background text-foreground focus:outline-none focus:border-primary transition"
                                        value={formData.customerPhone}
                                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-foreground mb-2">Link Expiry</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-null border border-border bg-background text-foreground focus:outline-none focus:border-primary transition"
                                        value={formData.expiryHours}
                                        onChange={(e) => setFormData({ ...formData, expiryHours: e.target.value })}
                                    >
                                        <option value="24">24 Hours</option>
                                        <option value="48">48 Hours</option>
                                        <option value="168">7 Days</option>
                                        <option value="">Never</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isGenerating || images.length === 0}
                                className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-null hover:opacity-90 transition transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Generating Secure Link...
                                    </>
                                ) : (
                                    <>
                                        🔗 Generate Payment Link
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                ) : paymentLink && (
                    <div className="p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Visual Card Preview */}
                            <div className="flex-1 bg-gradient-to-br from-primary/90 to-primary p-6 rounded-null text-primary-foreground shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-null-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-null-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                                <div className="relative z-10 flex flex-col h-full justify-between min-h-[400px]">
                                    <div>
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="w-8 h-8 bg-white/20 rounded-null flex items-center justify-center">
                                                <CheckCircle className="text-white" size={20} />
                                            </div>
                                            <span className="font-black tracking-wider">PayLoom</span>
                                        </div>

                                        {paymentLink.images.length > 0 && (
                                            <div className="bg-white/10 backdrop-blur-md rounded-null p-2 mb-4 border border-white/10 relative">
                                                <img
                                                    src={paymentLink.images[activeImageIndex]}
                                                    alt={`${paymentLink.productName} - Image ${activeImageIndex + 1}`}
                                                    className="w-full h-32 object-cover rounded-null"
                                                />
                                                
                                                {paymentLink.images.length > 1 && (
                                                    <>
                                                        <button
                                                            onClick={prevImage}
                                                            className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/50 rounded-null-full flex items-center justify-center hover:bg-black/70 transition"
                                                        >
                                                            <ChevronLeft size={14} />
                                                        </button>
                                                        <button
                                                            onClick={nextImage}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/50 rounded-null-full flex items-center justify-center hover:bg-black/70 transition"
                                                        >
                                                            <ChevronRight size={14} />
                                                        </button>
                                                        
                                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                                                            {paymentLink.images.map((_, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => setActiveImageIndex(idx)}
                                                                    className={`w-1.5 h-1.5 rounded-full transition ${
                                                                        idx === activeImageIndex ? 'bg-white' : 'bg-white/40'
                                                                    }`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        <div className="bg-white/10 backdrop-blur-md rounded-null p-4 mb-4 border border-white/10">
                                            <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Selling</p>
                                            <h3 className="text-xl font-bold leading-tight">{paymentLink.productName}</h3>
                                        </div>

                                        <div className="bg-white/10 backdrop-blur-md rounded-null p-4 border border-white/10">
                                            <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Price</p>
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-3xl font-black">{formatPrice(paymentLink.price, formData.currency)}</p>
                                                {formData.originalPrice && parseFloat(formData.originalPrice) > paymentLink.price && (
                                                    <p className="text-white/50 line-through text-sm">
                                                        {formatPrice(parseFloat(formData.originalPrice), formData.currency)}
                                                    </p>
                                                )}
                                            </div>
                                            {formData.originalPrice && parseFloat(formData.originalPrice) > paymentLink.price && (
                                                <p className="text-[10px] bg-white/20 inline-block px-1.5 py-0.5 rounded-null mt-1 font-bold">
                                                    SAVE {Math.round((1 - paymentLink.price / parseFloat(formData.originalPrice)) * 100)}%
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-8 text-center bg-white p-4 rounded-null">
                                        <div className="w-full aspect-square bg-gray-100 rounded-null mb-2 flex items-center justify-center">
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(paymentLink.linkUrl)}`} 
                                                alt="QR Code" 
                                                className="w-[80%] h-[80%]" 
                                            />
                                        </div>
                                        <p className="text-gray-900 font-bold text-sm">Scan to Pay Securely</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex-1 flex flex-col justify-center gap-4">
                                {/* Success Header */}
                                <div className="text-center md:text-left">
                                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-4">
                                        <CheckCircle size={20} />
                                        <span className="font-semibold">Payment Link Created!</span>
                                    </div>
                                    <p className="text-muted-foreground">Share this link with your buyer to receive secure payment.</p>
                                </div>

                                {/* Link Display Box */}
                                <div 
                                    className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-lg border-2 border-primary/20 cursor-pointer hover:border-primary/40 transition-all group" 
                                    onClick={copyToClipboard}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Link2 size={16} className="text-primary" />
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Link</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0 bg-background/80 rounded-md px-3 py-2 border border-border">
                                            <code className="text-primary font-mono text-sm block truncate">
                                                {paymentLink.linkUrl}
                                            </code>
                                        </div>
                                        <button className="flex-shrink-0 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:opacity-90 transition flex items-center gap-2">
                                            {copied ? (
                                                <>
                                                    <CheckCircle size={16} />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={16} />
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Share Section */}
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-muted-foreground">Share via:</p>
                                    
                                    {/* Primary Share Buttons */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={shareToWhatsApp}
                                            className="py-3 bg-[#25D366] text-white rounded-lg font-medium hover:bg-[#128C7E] transition flex items-center justify-center gap-2 text-sm"
                                        >
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                            </svg>
                                            WhatsApp
                                        </button>
                                        <button
                                            onClick={shareToFacebook}
                                            className="py-3 bg-[#1877F2] text-white rounded-lg font-medium hover:bg-[#166FE5] transition flex items-center justify-center gap-2 text-sm"
                                        >
                                            <FacebookIcon className="w-4 h-4" />
                                            Facebook
                                        </button>
                                        <button
                                            onClick={shareToTwitter}
                                            className="py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition flex items-center justify-center gap-2 text-sm"
                                        >
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                            </svg>
                                            X
                                        </button>
                                    </div>

                                    {/* Secondary Share Buttons */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={shareToInstagram}
                                            className="py-3 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white rounded-lg font-medium hover:opacity-90 transition flex items-center justify-center gap-2 text-sm"
                                        >
                                            <InstagramIcon className="w-4 h-4" />
                                            Instagram
                                        </button>
                                        <button
                                            onClick={shareToTikTok}
                                            className="py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition flex items-center justify-center gap-2 text-sm"
                                        >
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                                            </svg>
                                            TikTok
                                        </button>
                                        <button
                                            onClick={shareToLinkedIn}
                                            className="py-3 bg-[#0A66C2] text-white rounded-lg font-medium hover:bg-[#004182] transition flex items-center justify-center gap-2 text-sm"
                                        >
                                            <LinkedInIcon className="w-4 h-4" />
                                            LinkedIn
                                        </button>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={shareNative}
                                        className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
                                    >
                                        <Share2 size={18} />
                                        More Options
                                    </button>
                                    <button
                                        onClick={resetForm}
                                        className="flex-1 py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition border border-border"
                                    >
                                        Create Another
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
