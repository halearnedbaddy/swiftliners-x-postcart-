import { useState } from 'react';
import { 
  MoreVertical, 
  Edit, 
  ShieldCheck, 
  ShieldOff, 
  UserCheck, 
  UserX, 
  Trash2, 
  KeyRound, 
  Activity,
  Loader
} from 'lucide-react';

interface UserActionsDropdownProps {
  user: {
    id: string;
    name: string;
    role: string;
    isActive: boolean;
    accountStatus: string;
  };
  onEdit: () => void;
  onPromote: () => void;
  onDemote: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onResetPassword: () => void;
  onViewActivity: () => void;
  loading?: boolean;
}

export function UserActionsDropdown({
  user,
  onEdit,
  onPromote,
  onDemote,
  onActivate,
  onDeactivate,
  onDelete,
  onResetPassword,
  onViewActivity,
  loading = false,
}: UserActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const canPromote = user.role !== 'ADMIN' && user.role !== 'admin';
  const canDemote = user.role === 'SELLER' || user.role === 'seller' || user.role === 'ADMIN' || user.role === 'admin';
  const isActive = user.isActive && user.accountStatus !== 'SUSPENDED';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
        disabled={loading}
      >
        {loading ? (
          <Loader size={18} className="animate-spin" />
        ) : (
          <MoreVertical size={18} />
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            {/* Edit Profile */}
            <button
              onClick={() => handleAction(onEdit)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit size={14} />
              Edit Profile
            </button>

            <div className="border-t border-gray-100 my-1" />

            {/* Promote/Demote */}
            {canPromote && (
              <button
                onClick={() => handleAction(onPromote)}
                className="w-full px-4 py-2 text-left text-sm text-[#5d2ba3] hover:bg-[#5d2ba3]/5 flex items-center gap-2"
              >
                <ShieldCheck size={14} />
                Promote User
              </button>
            )}
            {canDemote && (
              <button
                onClick={() => handleAction(onDemote)}
                className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
              >
                <ShieldOff size={14} />
                Demote User
              </button>
            )}

            <div className="border-t border-gray-100 my-1" />

            {/* Activate/Deactivate */}
            {isActive ? (
              <button
                onClick={() => handleAction(onDeactivate)}
                className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
              >
                <UserX size={14} />
                Deactivate User
              </button>
            ) : (
              <button
                onClick={() => handleAction(onActivate)}
                className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
              >
                <UserCheck size={14} />
                Activate User
              </button>
            )}

            {/* Reset Password */}
            <button
              onClick={() => handleAction(onResetPassword)}
              className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
            >
              <KeyRound size={14} />
              Reset Password
            </button>

            <div className="border-t border-gray-100 my-1" />

            {/* View Activity */}
            <button
              onClick={() => handleAction(onViewActivity)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Activity size={14} />
              View Activity
            </button>

            <div className="border-t border-gray-100 my-1" />

            {/* Delete User */}
            <button
              onClick={() => handleAction(onDelete)}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 size={14} />
              Delete User
            </button>
          </div>
        </>
      )}
    </div>
  );
}
