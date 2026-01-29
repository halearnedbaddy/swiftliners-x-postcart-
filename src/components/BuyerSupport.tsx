import { MessageSquare, Mail, Phone, ChevronDown } from 'lucide-react';

export function BuyerSupport() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-[#3d1a7a] mb-2">How can we help you?</h2>
                <p className="text-gray-500">Our team is here to ensure every transaction is safe and smooth.</p>
            </div>

            {/* Quick Contact Options */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-null2xl text-center hover:shadow-lg transition cursor-pointer group">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-nullxl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition">
                        <MessageSquare size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-[#3d1a7a] mb-2">Live Chat</h3>
                    <p className="text-sm text-gray-500 mb-4">Average wait: 2 mins</p>
                    <button className="text-blue-700 font-bold text-sm">Start Chat →</button>
                </div>

                <div className="bg-green-50 border border-green-100 p-6 rounded-null2xl text-center hover:shadow-lg transition cursor-pointer group">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-nullxl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition">
                        <Mail size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-[#3d1a7a] mb-2">Email Us</h3>
                    <p className="text-sm text-gray-500 mb-4">Response in 24 hours</p>
                    <button className="text-green-700 font-bold text-sm">Send Email →</button>
                </div>

                <div className="bg-orange-50 border border-orange-100 p-6 rounded-null2xl text-center hover:shadow-lg transition cursor-pointer group">
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-nullxl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition">
                        <Phone size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-[#3d1a7a] mb-2">Phone Support</h3>
                    <p className="text-sm text-gray-500 mb-4">Mon-Fri, 9AM - 6PM</p>
                    <button className="text-orange-700 font-bold text-sm">Call Now →</button>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white rounded-null2xl border border-gray-200 p-8">
                <h3 className="text-xl font-bold text-[#3d1a7a] mb-6">Frequently Asked Questions</h3>

                <div className="space-y-4">
                    {[
                        { q: "How long does the seller have to ship?", a: "Sellers usually ship within 2-3 business days. If they don't, you can cancel for a full refund." },
                        { q: "What if the item is not as described?", a: "Do not confirm receipt. Open a dispute immediately in the 'Disputes' tab and upload your evidence." },
                        { q: "Is my money safe?", a: "Yes. Your money is held in a secure escrow account and is only released to the seller after you confirm delivery." },
                        { q: "How do refunds work?", a: "If an order is cancelled or a dispute is resolved in your favor, funds are returned to your M-Pesa immediately." }
                    ].map((item, idx) => (
                        <div key={idx} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                            <button className="w-full text-left flex justify-between items-center font-medium text-gray-900 hover:text-[#3d1a7a] transition">
                                {item.q}
                                <ChevronDown size={18} className="text-gray-400" />
                            </button>
                            <p className="mt-2 text-gray-500 text-sm leading-relaxed hidden">
                                {item.a}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
