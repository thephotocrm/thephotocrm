import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AuthBroadcastMessage {
  type: 'LOGIN' | 'LOGOUT';
  userId: string | null;
  timestamp: number;
  senderId: string;
}

// Generate a unique ID for this tab
const generateTabId = () => `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function useAuthBroadcast(
  currentUserId: string | null,
  onLogoutRequired: () => void
) {
  const { toast } = useToast();
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(generateTabId());

  useEffect(() => {
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel is not supported in this browser');
      return;
    }

    // Create broadcast channel
    const channel = new BroadcastChannel('auth-channel');
    channelRef.current = channel;

    // Listen for messages from other tabs
    channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
      const { type, userId, senderId } = event.data;

      // Ignore messages from the same tab
      if (senderId === tabIdRef.current) {
        return;
      }

      if (type === 'LOGIN' && userId && currentUserId && userId !== currentUserId) {
        // Another user logged in on a different tab
        toast({
          title: 'Session Conflict Detected',
          description: 'Another user has logged in. You will be logged out.',
          variant: 'destructive',
        });
        
        // Wait a moment for the user to see the message, then logout
        setTimeout(() => {
          onLogoutRequired();
        }, 2000);
      } else if (type === 'LOGOUT' && currentUserId) {
        // User logged out from another tab
        toast({
          title: 'Logged Out',
          description: 'You have been logged out from another tab.',
        });
        
        setTimeout(() => {
          onLogoutRequired();
        }, 1000);
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [currentUserId, onLogoutRequired, toast]);

  // Function to broadcast login event
  const broadcastLogin = (userId: string) => {
    if (channelRef.current) {
      const message: AuthBroadcastMessage = {
        type: 'LOGIN',
        userId,
        timestamp: Date.now(),
        senderId: tabIdRef.current,
      };
      channelRef.current.postMessage(message);
    }
  };

  // Function to broadcast logout event
  const broadcastLogout = () => {
    if (channelRef.current) {
      const message: AuthBroadcastMessage = {
        type: 'LOGOUT',
        userId: null,
        timestamp: Date.now(),
        senderId: tabIdRef.current,
      };
      channelRef.current.postMessage(message);
    }
  };

  return { broadcastLogin, broadcastLogout };
}
