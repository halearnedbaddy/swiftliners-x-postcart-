import { useState } from 'react';
import { X, Loader, AlertTriangle, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

type ActionType = 'activate' | 'deactivate' | 'delete' | 'reset-password';

interface ConfirmActionModalProps {
  user: {
    id: string;
    name: string;
    email?: string;
  };
  actionType: ActionType;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const actionConfig = {
  activate: {
    title: 'Activate User',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    buttonColor: 'bg-green-600 hover:bg-green-700',
    message: (name: string) => `Are you sure you want to activate ${name}? They will be able to log in and use the platform.`,
    confirmText: 'Activate User',
  },
  deactivate: {
    title: 'Deactivate User',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    buttonColor: 'bg-amber-600 hover:bg-amber-700',
    message: (name: string) => `Are you sure you want to deactivate ${name}? They will no longer be able to log in until reactivated.`,
    confirmText: 'Deactivate User',
  },
  delete: {
    title: 'Delete User',
    icon: Trash2,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    buttonColor: 'bg-red-600 hover:bg-red-700',
    message: (name: string) => `Are you sure you want to permanently delete ${name}? This action cannot be undone and all associated data will be lost.`,
    confirmText: 'Delete Permanently',
    requireConfirmation: true,
  },
  'reset-password': {
    title: 'Reset Password',
    icon: AlertCircle,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    message: (name: string, email?: string) => 
      email 
        ? `Send a password reset link to ${email}? ${name} will receive an email with instructions to reset their password.`
        : `${name} does not have an email address on file. Please add an email before sending a password reset.`,
    confirmText: 'Send Reset Link',
  },
};

export function ConfirmActionModal({ user, actionType, isOpen, onClose, onConfirm }: ConfirmActionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen) return null;

  const config = actionConfig[actionType];
  const Icon = config.icon;
  const needsConfirmation = actionType === 'delete';
  const canConfirm = !needsConfirmation || confirmText.toLowerCase() === 'delete';
  const noEmail = actionType === 'reset-password' && !user.email;

  const handleConfirm = async () => {
    if (!canConfirm || noEmail) return;

    try {
      setLoading(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{config.title}</h3>
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

          <div className={`flex items-start gap-3 p-4 ${config.bgColor} ${config.borderColor} border rounded-lg`}>
            <Icon className={`${config.iconColor} shrink-0 mt-0.5`} size={20} />
            <p className="text-sm text-gray-700">
              {config.message(user.name, user.email)}
            </p>
          </div>

          {needsConfirmation && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                placeholder="DELETE"
              />
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
              onClick={handleConfirm}
              disabled={!canConfirm || loading || noEmail}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${config.buttonColor}`}
            >
              {loading && <Loader size={16} className="animate-spin" />}
              {config.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
