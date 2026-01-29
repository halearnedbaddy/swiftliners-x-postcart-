import { useState, useRef, useEffect } from 'react';
import { BellIcon, CheckIcon, CheckCheckIcon, XIcon, PackageIcon, CreditCardIcon, TruckIcon, AlertCircleIcon, WalletIcon } from '@/components/icons';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'PAYMENT_RECEIVED':
      return <CreditCardIcon className="h-4 w-4 text-[#5d2ba3]" size={16} />;
    case 'ITEM_SHIPPED':
      return <TruckIcon className="h-4 w-4 text-[#254E58]" size={16} />;
    case 'DELIVERY_CONFIRMED':
      return <PackageIcon className="h-4 w-4 text-[#5d2ba3]" size={16} />;
    case 'ORDER_ACCEPTED':
      return <CheckIcon className="h-4 w-4 text-[#5d2ba3]" size={16} />;
    case 'DISPUTE_OPENED':
      return <AlertCircleIcon className="h-4 w-4 text-[#4F4A41]" size={16} />;
    case 'FUNDS_RELEASED':
      return <WalletIcon className="h-4 w-4 text-[#6E6658]" size={16} />;
    default:
      return <BellIcon className="h-4 w-4 text-[#6E6658]" size={16} />;
  }
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useWebSocket({
    onNotification: (notification) => {
      toast({
        title: notification.title,
        description: notification.message,
      });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="h-5 w-5 text-white" size={20} />
        
        {/* Connection indicator */}
        <span
          className={`absolute top-1 right-1 h-2 w-2 rounded-null-full ${
            isConnected ? 'bg-[#5d2ba3]' : 'bg-gray-400'
          }`}
        />
        
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold text-white bg-[#5d2ba3] rounded-null-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-null shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllAsRead}
                    className="p-1 hover:bg-muted rounded-null text-muted-foreground hover:text-foreground"
                    title="Mark all as read"
                  >
                    <CheckCheckIcon className="h-4 w-4 text-[#5d2ba3]" size={16} />
                  </button>
                  <button
                    onClick={clearNotifications}
                    className="p-1 hover:bg-muted rounded-null text-muted-foreground hover:text-foreground"
                    title="Clear all"
                  >
                    <XIcon className="h-4 w-4 text-[#6E6658]" size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-50 text-[#6E6658]" size={32} />
                <p>No notifications yet</p>
                <p className="text-sm mt-1">
                  {isConnected ? 'You\'re all caught up!' : 'Connecting...'}
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !notification.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.data?.type as string || notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium text-sm ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-null-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-muted/50">
              <p className="text-xs text-center text-muted-foreground">
                {isConnected ? '● Live updates enabled' : '○ Reconnecting...'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
