import { Bell, Lock, User, Shield, Save } from 'lucide-react';

export function BuyerSettings() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold text-[#3d1a7a] mb-6">Account Settings</h2>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="md:col-span-1">
                    <div className="bg-white rounded-nullxl border border-gray-200 p-6 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-50 rounded-nullfull mx-auto mb-4 flex items-center justify-center text-3xl">
                            JD
                        </div>
                        <h3 className="font-bold text-lg text-[#3d1a7a]">John Doe</h3>
                        <p className="text-gray-500 text-sm mb-4">Joined Dec 2023</p>
                        <button className="text-green-600 text-sm font-semibold hover:underline">Change Avatar</button>
                    </div>
                </div>

                {/* Form Sections */}
                <div className="md:col-span-2 space-y-6">
                    {/* Personal Info */}
                    <div className="bg-white rounded-nullxl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <User className="text-green-600" size={20} />
                            <h3 className="font-bold text-lg text-[#3d1a7a]">Personal Information</h3>
                        </div>

                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                    <input type="text" defaultValue="John" className="w-full px-4 py-2 border border-gray-200 rounded-nulllg focus:outline-none focus:border-[#3d1a7a]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                    <input type="text" defaultValue="Doe" className="w-full px-4 py-2 border border-gray-200 rounded-nulllg focus:outline-none focus:border-[#3d1a7a]" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input type="email" defaultValue="john.doe@example.com" className="w-full px-4 py-2 border border-gray-200 rounded-nulllg focus:outline-none focus:border-[#3d1a7a]" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (M-Pesa)</label>
                                <input type="tel" defaultValue="+254 7XX XXX XXX" className="w-full px-4 py-2 border border-gray-200 rounded-nulllg focus:outline-none focus:border-[#3d1a7a]" />
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="bg-white rounded-nullxl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Bell className="text-green-600" size={20} />
                            <h3 className="font-bold text-lg text-[#3d1a7a]">Notifications</h3>
                        </div>

                        <div className="space-y-4">
                            {['Order Updates', 'Promotions & Deals', 'Security Alerts'].map((item) => (
                                <div key={item} className="flex items-center justify-between">
                                    <span className="text-gray-700">{item}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" defaultChecked className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#5d2ba3]/30 rounded-nullfull peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-nullfull after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3d1a7a]"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Security */}
                    <div className="bg-white rounded-nullxl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Shield className="text-green-600" size={20} />
                            <h3 className="font-bold text-lg text-[#3d1a7a]">Security</h3>
                        </div>
                        <button className="flex items-center gap-2 text-green-700 font-semibold hover:underline">
                            <Lock size={16} /> Change Password
                        </button>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button className="px-6 py-3 bg-gray-900 text-white rounded-nullxl font-bold hover:bg-black transition flex items-center gap-2">
                            <Save size={18} /> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
