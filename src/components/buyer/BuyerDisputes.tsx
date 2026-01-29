import { AlertTriangleIcon, CheckCircleIcon, LoaderIcon, ClockIcon, ChevronRightIcon } from '@/components/icons';
import { useState, useCallback } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface BuyerDisputesProps {
  disputes: any[];
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

export function BuyerDisputes({ disputes, loading, error, onRefresh }: BuyerDisputesProps) {
  const { toast } = useToast();
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleSendMessage = useCallback(async (disputeId: string) => {
    if (!newMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    setSendingMessage(true);
    try {
      const response = await api.addBuyerDisputeMessage(disputeId, newMessage.trim());
      if (response.success) {
        toast({
          title: 'Message Sent',
          description: 'Your message has been added to the dispute.',
        });
        setNewMessage('');
        onRefresh?.();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to send message',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  }, [newMessage, toast, onRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderIcon size={32} className="animate-spin text-[#5d2ba3]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#4F4A41]/10 border border-[#4F4A41]/30 rounded-null p-6 text-[#4F4A41]">
        <p className="font-bold">Failed to load disputes</p>
        <p className="text-sm">{error}</p>
        <button 
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-[#3d1a7a] text-white rounded-null text-sm hover:bg-[#250e52] transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-[#4F4A41]/20 text-[#4F4A41]';
      case 'IN_PROGRESS':
        return 'bg-[#6E6658]/20 text-[#6E6658]';
      case 'RESOLVED':
        return 'bg-[#5d2ba3]/20 text-[#5d2ba3]';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <AlertTriangleIcon size={16} />;
      case 'IN_PROGRESS':
        return <ClockIcon size={16} />;
      case 'RESOLVED':
        return <CheckCircleIcon size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#3d1a7a]">My Disputes</h2>
          <p className="text-sm text-gray-500">{disputes.length} dispute(s)</p>
        </div>
      </div>

      <div className="space-y-4">
        {disputes.length > 0 ? (
          disputes.map((dispute) => (
            <div
              key={dispute.id}
              className="bg-white rounded-null border border-gray-200 shadow-sm overflow-hidden transition hover:shadow-md"
            >
              {/* Dispute Header */}
              <div 
                className="p-6 cursor-pointer"
                onClick={() => setSelectedDispute(selectedDispute === dispute.id ? null : dispute.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-null ${
                    dispute.status === 'RESOLVED' ? 'bg-[#5d2ba3]/20 text-[#5d2ba3]' : 'bg-[#6E6658]/20 text-[#6E6658]'
                  }`}>
                    <AlertTriangleIcon size={24} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-null-full text-xs font-bold uppercase flex items-center gap-1 ${getStatusColor(dispute.status)}`}>
                        {getStatusIcon(dispute.status)}
                        {dispute.status?.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">Case #{dispute.id?.slice(0, 8)}</span>
                    </div>

                    <h3 className="text-lg font-bold text-[#3d1a7a] mb-1">{dispute.reason?.replace('_', ' ') || 'Dispute'}</h3>

                    <p className="text-sm text-gray-600 mb-3">
                      Transaction: <span className="font-semibold">{dispute.transaction?.itemName || 'N/A'}</span>
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Seller: <span className="font-semibold text-gray-900">{dispute.transaction?.seller?.name || 'Unknown'}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        KES {(dispute.transaction?.amount || 0).toLocaleString()}
                      </span>
                    </div>

                    {dispute.description && (
                      <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-null">
                        {dispute.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded View with Messages */}
              {selectedDispute === dispute.id && (
                <div className="border-t border-gray-200 p-6 bg-gray-50 space-y-4">
                  {/* Messages */}
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {dispute.messages && dispute.messages.length > 0 ? (
                      dispute.messages.map((msg: any) => (
                        <div 
                          key={msg.id} 
                          className={`p-3 rounded-null ${
                            msg.senderId === dispute.openedById 
                              ? 'bg-[#5d2ba3]/20 ml-8' 
                              : 'bg-white border border-gray-200 mr-8'
                          }`}
                        >
                          <p className="text-sm text-gray-900">{msg.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(msg.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No messages yet</p>
                    )}
                  </div>

                  {/* Message Input */}
                  {dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-null focus:outline-none focus:border-[#3d1a7a]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(dispute.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleSendMessage(dispute.id)}
                        disabled={sendingMessage || !newMessage.trim()}
                        className="px-4 py-3 bg-[#3d1a7a] text-white rounded-null hover:bg-[#250e52] disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {sendingMessage ? (
                          <LoaderIcon size={18} className="animate-spin" />
                        ) : (
                          <ChevronRightIcon size={18} />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Deadline Info */}
                  {dispute.deadline && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-white p-3 rounded-null border border-gray-200">
                      <ClockIcon size={16} />
                      <span>Resolution deadline: {new Date(dispute.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-null border border-gray-200 border-dashed">
            <CheckCircleIcon className="mx-auto text-[#5d2ba3] mb-4" size={48} />
            <h3 className="text-lg font-bold text-[#3d1a7a]">No Disputes</h3>
            <p className="text-gray-500">You haven't raised any disputes yet.</p>
            <p className="text-sm text-gray-400 mt-2">If you have issues with an order, you can open a dispute from the order details.</p>
          </div>
        )}
      </div>
    </div>
  );
}