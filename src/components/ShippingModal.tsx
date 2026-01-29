import { useState } from 'react';
import { Truck, X, Loader2, ArrowRight } from 'lucide-react';

interface ShippingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (details: { courier: string; trackingNumber: string; estimatedDate: string; proofImages: File[] }) => void;
}

export function ShippingModal({ isOpen, onClose, onConfirm }: ShippingModalProps) {
    const [courier, setCourier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [estimatedDate, setEstimatedDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [proofImages, setProofImages] = useState<File[]>([]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            onConfirm({ courier, trackingNumber, estimatedDate, proofImages });
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-null-2xl max-w-md w-full p-6 relative shadow-2xl scale-100 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-null-full transition text-gray-500"
                >
                    <X size={24} />
                </button>

                <div className="mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-null-xl flex items-center justify-center mb-4 text-blue-600">
                        <Truck size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-[#3d1a7a]">Ship Order</h2>
                    <p className="text-gray-500 text-sm mt-1">Enter delivery details to notify the buyer.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Courier / Service</label>
                        <select
                            required
                            className="w-full px-4 py-3 rounded-null-xl border border-gray-200 focus:outline-none focus:border-blue-500 transition"
                            value={courier}
                            onChange={(e) => setCourier(e.target.value)}
                        >
                            <option value="">Select Courier...</option>
                            <option value="Wells Fargo">Wells Fargo</option>
                            <option value="G4S">G4S</option>
                            <option value="Fargo Courier">Fargo Courier</option>
                            <option value="Sendy">Sendy</option>
                            <option value="Pick-up Mtaani">Pick-up Mtaani</option>
                            <option value="Other">Other / Personal Delivery</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Tracking Number / Rider Phone</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. WF-88293 or 07XX..."
                            className="w-full px-4 py-3 rounded-null-xl border border-gray-200 focus:outline-none focus:border-blue-500 transition"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated Delivery Date</label>
                        <input
                            type="date"
                            required
                            className="w-full px-4 py-3 rounded-null-xl border border-gray-200 focus:outline-none focus:border-blue-500 transition"
                            value={estimatedDate}
                            onChange={(e) => setEstimatedDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Proof of Shipment (Optional)</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-null-xl p-6 text-center hover:border-blue-500 transition cursor-pointer relative">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        setProofImages([...proofImages, ...Array.from(e.target.files)]);
                                    }
                                }}
                            />
                            <p className="text-sm text-gray-600">Click or drag images here</p>
                            <p className="text-xs text-gray-400 mt-1">Receipts, package photos, etc.</p>
                        </div>
                        {proofImages.length > 0 && (
                            <div className="flex gap-2 mt-2 overflow-x-auto py-2">
                                {proofImages.map((file, idx) => (
                                    <div key={idx} className="relative flex-shrink-0">
                                        <div className="w-16 h-16 bg-gray-100 rounded-null-lg flex items-center justify-center text-xs text-gray-500 overflow-hidden border border-gray-200">
                                            {file.name.slice(0, 10)}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setProofImages(proofImages.filter((_, i) => i !== idx))}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-null-full w-4 h-4 flex items-center justify-center text-[10px]"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-null-xl hover:bg-blue-700 transition transform hover:scale-[1.02] flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Confirming...
                            </>
                        ) : (
                            <>
                                Confirm Shipment
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
