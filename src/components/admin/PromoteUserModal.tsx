import { useState } from 'react';
import { X, Loader, ShieldCheck, AlertTriangle } from 'lucide-react';

type UserRole = 'buyer' | 'seller' | 'admin';

interface PromoteUserModalProps {
  user: {
    id: string;
    name: string;
    role: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onPromote: (newRole: UserRole) => Promise<void>;
}

export function PromoteUserModal({ user, isOpen, onClose, onPromote }: PromoteUserModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentRole = user.role.toLowerCase() as UserRole;

  const allRoles: { role: UserRole; label: string; description: string }[] = [
    { 
      role: 'buyer', 
      label: 'Buyer', 
      description: 'Can browse and purchase products' 
    },
    { 
      role: 'seller', 
      label: 'Seller', 
      description: 'Can create stores and sell products' 
    },
    { 
      role: 'admin', 
      label: 'Admin', 
      description: 'Full platform access and management' 
    },
  ];
  
  const availableRoles = allRoles.filter(r => r.role !== currentRole);

  const handlePromote = async () => {
    if (!selectedRole) return;

    try {
      setLoading(true);
      setError(null);
      await onPromote(selectedRole);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const isUpgrade = 
    (currentRole === 'buyer' && (selectedRole === 'seller' || selectedRole === 'admin')) ||
    (currentRole === 'seller' && selectedRole === 'admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-[#3d1a7a]">Change User Role</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="bg-gray-50 px-4 py-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>User:</strong> {user.name}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Current Role:</strong>{' '}
              <span className="capitalize px-2 py-0.5 bg-[#5d2ba3]/10 text-[#5d2ba3] rounded-full text-xs font-semibold">
                {currentRole}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Select New Role</label>
            {availableRoles.map(({ role, label, description }) => (
              <label
                key={role}
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition ${
                  selectedRole === role
                    ? 'border-[#5d2ba3] bg-[#5d2ba3]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={selectedRole === role}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="mt-1 text-[#5d2ba3] focus:ring-[#5d2ba3]"
                />
                <div>
                  <p className="font-medium text-gray-900 capitalize">{label}</p>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
              </label>
            ))}
          </div>

          {selectedRole === 'admin' && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> Admin users have full access to all platform features, including user management and financial data.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handlePromote}
              disabled={!selectedRole || loading}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${
                isUpgrade ? 'bg-[#3d1a7a] hover:bg-[#250e52]' : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {loading ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              {isUpgrade ? 'Promote' : 'Demote'} to {selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : '...'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
