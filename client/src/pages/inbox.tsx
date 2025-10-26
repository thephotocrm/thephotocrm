import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Mail, Send, MessageCircle, ArrowLeft, Plus, Search, Check, CheckCheck, XCircle, Smile, Image as ImageIcon, MessageSquarePlus, Users, Phone, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format, isToday, isYesterday, isThisWeek, isThisYear } from "date-fns";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  photographerId: string;
}

interface Conversation {
  contact: Contact;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  lastReadAt?: Date;
}

interface ThreadMessage {
  type: 'SMS' | 'EMAIL';
  id: string;
  content: string | null;
  direction: 'OUTBOUND' | 'INBOUND';
  timestamp: Date;
  isInbound: boolean;
  subject?: string;
  status?: string; // SMS delivery status: sent, delivered, failed
  imageUrl?: string | null; // MMS image URL
}

type InboxView = 'inbox' | 'contacts' | 'phone' | 'settings';

export default function Inbox() {
  const [currentView, setCurrentView] = useState<InboxView>('inbox');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isMobileThreadView, setIsMobileThreadView] = useState(false);
  const [isNewMessageDialogOpen, setIsNewMessageDialogOpen] = useState(false);
  const [isComingSoonDialogOpen, setIsComingSoonDialogOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/inbox/conversations'],
    refetchInterval: 10000 // Poll every 10 seconds for new messages
  });

  // Fetch all contacts for new message dialog and contacts view
  const { data: allContacts = [], isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    enabled: isNewMessageDialogOpen || currentView === 'contacts'
  });

  // Fetch thread for selected contact
  const { data: thread = [], isLoading: threadLoading } = useQuery<ThreadMessage[]>({
    queryKey: ['/api/inbox/thread', selectedContactId],
    enabled: !!selectedContactId,
    refetchInterval: 5000 // Poll every 5 seconds when viewing a thread
  });

  // Common emojis for quick access
  const commonEmojis = ['😊', '😂', '❤️', '👍', '🎉', '🙏', '✨', '🔥', '💯', '👏', '😍', '🤔', '😎', '💪', '🙌'];

  // Send SMS mutation
  const sendSmsMutation = useMutation({
    mutationFn: async ({ contactId, message, imageUrl }: { contactId: string; message: string; imageUrl?: string }) => {
      return apiRequest('POST', '/api/inbox/send-sms', { contactId, message, imageUrl });
    },
    onSuccess: () => {
      setNewMessage("");
      setSelectedImage(null);
      setShowEmojiPicker(false);
      // Force immediate refetch instead of just invalidating
      queryClient.refetchQueries({ queryKey: ['/api/inbox/conversations'] });
      queryClient.refetchQueries({ queryKey: ['/api/inbox/thread', selectedContactId] });
      queryClient.refetchQueries({ queryKey: ['/api/inbox/unread-count'] });
      toast({
        title: "Message sent",
        description: "Your SMS was delivered successfully"
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to send",
        description: error.message || "Could not send SMS"
      });
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (contactId: string) => {
      return apiRequest('POST', `/api/inbox/mark-read/${contactId}`);
    },
    onSuccess: () => {
      // Force immediate refetch instead of just invalidating
      queryClient.refetchQueries({ queryKey: ['/api/inbox/conversations'] });
      queryClient.refetchQueries({ queryKey: ['/api/inbox/unread-count'] });
    }
  });

  // Auto-select the most recent conversation
  useEffect(() => {
    if (conversations.length > 0 && !selectedContactId) {
      const mostRecentContact = conversations[0].contact.id;
      setSelectedContactId(mostRecentContact);
      markAsReadMutation.mutate(mostRecentContact);
    }
  }, [conversations.length]);

  const handleConversationClick = (contactId: string) => {
    setSelectedContactId(contactId);
    setIsMobileThreadView(true);
    markAsReadMutation.mutate(contactId);
  };

  const handleSendMessage = () => {
    if (!selectedContactId || !newMessage.trim()) return;

    sendSmsMutation.mutate({
      contactId: selectedContactId,
      message: newMessage.trim(),
      imageUrl: selectedImage || undefined
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit for MMS)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Image must be under 5MB for MMS"
      });
      return;
    }

    // Create temporary URL for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBackToList = () => {
    setIsMobileThreadView(false);
  };

  const handleStartNewConversation = (contactId: string) => {
    setSelectedContactId(contactId);
    setIsMobileThreadView(true);
    setIsNewMessageDialogOpen(false);
    setContactSearch("");
  };

  const handleContactToInbox = (contactId: string) => {
    setSelectedContactId(contactId);
    setCurrentView('inbox');
    setIsMobileThreadView(true);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  // Format full timestamp for messages
  const formatMessageTime = (date: Date | string) => {
    const d = new Date(date);
    return format(d, 'h:mm a');
  };

  // Get date label for grouping
  const getDateLabel = (date: Date | string) => {
    const d = new Date(date);
    
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    if (isThisWeek(d)) return format(d, 'EEEE');
    if (isThisYear(d)) return format(d, 'MMMM d');
    return format(d, 'MMMM d, yyyy');
  };

  // Group messages by date with sender grouping
  const groupedMessages = useMemo(() => {
    if (!thread.length) return [];

    const groups: Array<{
      date: string;
      messages: Array<{
        groupId: string;
        messages: ThreadMessage[];
        isInbound: boolean;
      }>;
    }> = [];

    let currentDate = '';
    let currentMessageGroup: ThreadMessage[] = [];
    let currentIsInbound: boolean | null = null;

    thread.forEach((message, index) => {
      const messageDate = getDateLabel(message.timestamp);
      
      // New date group
      if (messageDate !== currentDate) {
        // Save previous message group
        if (currentMessageGroup.length > 0 && currentIsInbound !== null) {
          const lastGroup = groups[groups.length - 1];
          if (lastGroup) {
            lastGroup.messages.push({
              groupId: `group-${groups.length}-${lastGroup.messages.length}`,
              messages: currentMessageGroup,
              isInbound: currentIsInbound
            });
          }
        }

        // Start new date group
        currentDate = messageDate;
        groups.push({ date: messageDate, messages: [] });
        currentMessageGroup = [message];
        currentIsInbound = message.isInbound;
      }
      // Same sender, group together (within 2 minutes)
      else if (
        currentIsInbound === message.isInbound &&
        currentMessageGroup.length > 0
      ) {
        const lastMessage = currentMessageGroup[currentMessageGroup.length - 1];
        const timeDiff = new Date(message.timestamp).getTime() - new Date(lastMessage.timestamp).getTime();
        const twoMinutes = 2 * 60 * 1000;

        if (timeDiff < twoMinutes && message.type === 'SMS') {
          currentMessageGroup.push(message);
        } else {
          // Save current group and start new one
          groups[groups.length - 1].messages.push({
            groupId: `group-${groups.length}-${groups[groups.length - 1].messages.length}`,
            messages: currentMessageGroup,
            isInbound: currentIsInbound!
          });
          currentMessageGroup = [message];
          currentIsInbound = message.isInbound;
        }
      }
      // Different sender
      else {
        // Save current group
        if (currentMessageGroup.length > 0 && currentIsInbound !== null) {
          groups[groups.length - 1].messages.push({
            groupId: `group-${groups.length}-${groups[groups.length - 1].messages.length}`,
            messages: currentMessageGroup,
            isInbound: currentIsInbound
          });
        }
        // Start new group
        currentMessageGroup = [message];
        currentIsInbound = message.isInbound;
      }

      // Last message
      if (index === thread.length - 1 && currentMessageGroup.length > 0 && currentIsInbound !== null) {
        groups[groups.length - 1].messages.push({
          groupId: `group-${groups.length}-${groups[groups.length - 1].messages.length}`,
          messages: currentMessageGroup,
          isInbound: currentIsInbound
        });
      }
    });

    return groups;
  }, [thread]);

  const getStatusIcon = (status?: string) => {
    if (!status) return null;
    
    if (status === 'delivered') {
      return <CheckCheck className="w-3 h-3" data-testid="icon-delivered" />;
    } else if (status === 'sent' || status === 'queued' || status === 'sending') {
      return <Check className="w-3 h-3" data-testid="icon-sent" />;
    } else if (status === 'failed' || status === 'undelivered') {
      return <XCircle className="w-3 h-3 text-red-500" data-testid="icon-failed" />;
    }
    return null;
  };

  const selectedConversation = conversations.find(c => c.contact.id === selectedContactId);

  // Filter contacts based on search - only show contacts with phone numbers for SMS
  const filteredContacts = allContacts
    .filter(contact => contact.phone) // Only contacts with phone numbers
    .filter(contact => {
      const searchLower = contactSearch.toLowerCase();
      const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
      const phone = contact.phone?.toLowerCase() || '';
      const email = contact.email?.toLowerCase() || '';
      return fullName.includes(searchLower) || phone.includes(searchLower) || email.includes(searchLower);
    });

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conversation => {
    const searchLower = conversationSearch.toLowerCase();
    const fullName = `${conversation.contact.firstName} ${conversation.contact.lastName}`.toLowerCase();
    const message = conversation.lastMessage.toLowerCase();
    return fullName.includes(searchLower) || message.includes(searchLower);
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 md:px-6 py-6 shrink-0">
        <div className="max-w-[1140px] mx-auto w-full">
          <h1 className="text-3xl md:text-4xl font-semibold">Inbox</h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden justify-center">
        <div className="flex-1 flex flex-col overflow-hidden max-w-[1140px] w-full px-6 pt-6 pb-8 gap-4">
          {/* Action Bar */}
          <div className="shrink-0 flex items-center justify-end">
            <Dialog open={isNewMessageDialogOpen} onOpenChange={setIsNewMessageDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-message">
                  <Plus className="w-4 h-4 mr-2" />
                  New Message
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>New Message</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-contact-search"
                    />
                  </div>
                  <ScrollArea className="h-80">
                    {filteredContacts.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {contactSearch ? 'No contacts found' : 'No contacts with phone numbers'}
                      </div>
                    ) : (
                      filteredContacts.map((contact) => (
                        <div
                          key={contact.id}
                          onClick={() => handleStartNewConversation(contact.id)}
                          className="p-3 border-b cursor-pointer hover:bg-accent transition-colors"
                          data-testid={`contact-option-${contact.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(contact.firstName, contact.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {contact.firstName} {contact.lastName}
                              </p>
                              {contact.phone && (
                                <p className="text-sm text-muted-foreground truncate">{contact.phone}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Coming Soon Dialog */}
          <Dialog open={isComingSoonDialogOpen} onOpenChange={setIsComingSoonDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Coming Soon</DialogTitle>
              </DialogHeader>
              <div className="py-6 text-center">
                <p className="text-muted-foreground">This feature is coming soon!</p>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setIsComingSoonDialogOpen(false)} data-testid="button-close-coming-soon">
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Two Column Layout - Connected Design */}
          <div className="flex-1 flex overflow-hidden bg-card border rounded-2xl shadow-sm max-h-[759px]">
            {/* Left Sidebar */}
            <div className="hidden md:flex w-16 bg-gradient-to-b from-indigo-600 to-indigo-700 flex-col items-center py-4 gap-4 rounded-l-2xl">
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 transition-colors ${
                  currentView === 'inbox' ? 'bg-white text-indigo-600 hover:bg-white' : 'text-white hover:bg-white/20'
                }`}
                onClick={() => setCurrentView('inbox')}
                data-testid="sidebar-inbox"
              >
                <MessageSquare className="w-6 h-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 transition-colors ${
                  currentView === 'contacts' ? 'bg-white text-indigo-600 hover:bg-white' : 'text-white hover:bg-white/20'
                }`}
                onClick={() => setCurrentView('contacts')}
                data-testid="sidebar-contacts"
              >
                <Users className="w-6 h-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 transition-colors ${
                  currentView === 'phone' ? 'bg-white text-indigo-600 hover:bg-white' : 'text-white hover:bg-white/20'
                }`}
                onClick={() => setIsComingSoonDialogOpen(true)}
                data-testid="sidebar-phone"
              >
                <Phone className="w-6 h-6" />
              </Button>
              
              <div className="flex-1" />
              
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 transition-colors ${
                  currentView === 'settings' ? 'bg-white text-indigo-600 hover:bg-white' : 'text-white hover:bg-white/20'
                }`}
                onClick={() => setCurrentView('settings')}
                data-testid="sidebar-settings"
              >
                <Settings className="w-6 h-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white hover:bg-white/20"
                onClick={() => setIsNewMessageDialogOpen(true)}
                data-testid="sidebar-add"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </div>
            
            {/* INBOX VIEW - Conversation List and Message Thread */}
            {currentView === 'inbox' && (
              <>
                {/* Conversation List */}
                <div className={`w-full md:w-96 border-r flex flex-col overflow-hidden ${isMobileThreadView ? 'hidden md:flex' : 'flex'}`}>
                  {/* Inbox Header */}
                  <div className="p-4 border-b shrink-0">
                    <h2 className="text-xl font-semibold mb-3 text-indigo-600" data-testid="text-inbox-title">Inbox</h2>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search"
                        value={conversationSearch}
                        onChange={(e) => setConversationSearch(e.target.value)}
                        className="pl-9"
                        data-testid="input-conversation-search"
                      />
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1 min-h-0">
                {conversationsLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Loading conversations...</div>
                ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">{conversationSearch ? 'No conversations found' : 'No SMS conversations yet'}</p>
                <Dialog open={isNewMessageDialogOpen} onOpenChange={setIsNewMessageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-start-conversation">
                      <Plus className="w-4 h-4 mr-2" />
                      Start a Conversation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>New Message</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search contacts..."
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                          className="pl-9"
                          data-testid="input-contact-search-empty"
                        />
                      </div>
                      <ScrollArea className="h-80">
                        {filteredContacts.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            {contactSearch ? 'No contacts found' : 'No contacts with phone numbers'}
                          </div>
                        ) : (
                          filteredContacts.map((contact) => (
                            <div
                              key={contact.id}
                              onClick={() => handleStartNewConversation(contact.id)}
                              className="p-3 border-b cursor-pointer hover:bg-accent transition-colors"
                              data-testid={`contact-option-empty-${contact.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback>
                                    {getInitials(contact.firstName, contact.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">
                                    {contact.firstName} {contact.lastName}
                                  </p>
                                  {contact.phone && (
                                    <p className="text-sm text-muted-foreground truncate">{contact.phone}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.contact.id}
                  onClick={() => handleConversationClick(conversation.contact.id)}
                  className={`p-4 border-b cursor-pointer transition-all duration-200 hover:bg-accent/50 max-w-full ${
                    selectedContactId === conversation.contact.id ? 'bg-accent' : ''
                  } ${conversation.unreadCount > 0 ? 'bg-accent/20' : ''}`}
                  data-testid={`conversation-${conversation.contact.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className={`rounded-xl ${conversation.unreadCount > 0 ? 'ring-2 ring-primary' : ''}`}>
                      <AvatarFallback className={`rounded-xl ${conversation.unreadCount > 0 ? 'font-bold' : ''}`}>
                        {getInitials(conversation.contact.firstName, conversation.contact.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className={`truncate flex-1 ${conversation.unreadCount > 0 ? 'font-bold' : 'font-semibold'}`} data-testid={`contact-name-${conversation.contact.id}`}>
                          {conversation.contact.firstName} {conversation.contact.lastName}
                        </h3>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="default" className="min-w-[24px] h-5 flex items-center justify-center shrink-0" data-testid={`unread-badge-${conversation.contact.id}`}>
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 min-w-0">
                        <p className={`text-sm truncate flex-1 min-w-0 ${conversation.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`} data-testid={`last-message-${conversation.contact.id}`}>
                          {conversation.lastMessage || 'No messages'}
                        </p>
                        <span className={`text-xs whitespace-nowrap shrink-0 ${conversation.unreadCount > 0 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                  ))
                )}
              </ScrollArea>
            </div>

            {/* Message Thread */}
            <div className={`flex-1 flex flex-col ${!isMobileThreadView ? 'hidden md:flex' : 'flex'}`}>
          {!selectedContactId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground bg-gradient-to-br from-background to-muted/20">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-10 h-10 text-primary/40" />
                </div>
                <p className="text-lg font-medium mb-1">No conversation selected</p>
                <p className="text-sm text-muted-foreground">Choose a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="px-4 py-2 border-b flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8"
                  onClick={handleBackToList}
                  data-testid="button-back-to-list"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                
                <Avatar className="rounded-xl h-8 w-8">
                  <AvatarFallback className="rounded-xl text-xs">
                    {getInitials(selectedConversation?.contact.firstName, selectedConversation?.contact.lastName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h3 className="text-sm font-semibold" data-testid="thread-contact-name">
                    {selectedConversation?.contact.firstName} {selectedConversation?.contact.lastName}
                  </h3>
                </div>
                
                <Link href={`/contacts/${selectedContactId}`}>
                  <Button variant="outline" size="sm" className="text-xs h-7" data-testid="button-view-contact">
                    View Contact
                  </Button>
                </Link>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 bg-blue-50/70 dark:bg-blue-950/40">
                {threadLoading ? (
                  <div className="text-center text-muted-foreground">Loading messages...</div>
                ) : thread.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No messages yet</div>
                ) : (
                  <div className="space-y-6">
                    {groupedMessages.map((dateGroup) => (
                      <div key={dateGroup.date} className="space-y-4">
                        {/* Date Divider */}
                        <div className="flex items-center gap-3 py-2">
                          <Separator className="flex-1" />
                          <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-full">
                            {dateGroup.date}
                          </span>
                          <Separator className="flex-1" />
                        </div>

                        {/* Message Groups */}
                        {dateGroup.messages.map((group) => (
                          <div key={group.groupId} className="space-y-1">
                            {group.messages.map((message, index) => {
                              if (message.type === 'SMS') {
                                const isFirstInGroup = index === 0;
                                const isLastInGroup = index === group.messages.length - 1;
                                
                                return (
                                  <div
                                    key={message.id}
                                    className={`flex group ${message.isInbound ? 'justify-start' : 'justify-end'}`}
                                    data-testid={`sms-message-${message.id}`}
                                  >
                                    <div
                                      className={`max-w-sm px-4 py-2 ${
                                        message.isInbound
                                          ? 'bg-muted'
                                          : 'bg-primary text-primary-foreground'
                                      } ${
                                        isFirstInGroup && isLastInGroup
                                          ? 'rounded-2xl'
                                          : isFirstInGroup
                                          ? message.isInbound ? 'rounded-t-2xl rounded-br-2xl rounded-bl-md' : 'rounded-t-2xl rounded-bl-2xl rounded-br-md'
                                          : isLastInGroup
                                          ? message.isInbound ? 'rounded-b-2xl rounded-tr-2xl rounded-tl-md' : 'rounded-b-2xl rounded-tl-2xl rounded-tr-md'
                                          : message.isInbound ? 'rounded-r-2xl rounded-l-md' : 'rounded-l-2xl rounded-r-md'
                                      }`}
                                    >
                                      {message.imageUrl && (
                                        <img 
                                          src={message.imageUrl} 
                                          alt="MMS" 
                                          className="max-w-full rounded-xl mb-2"
                                          data-testid={`mms-image-${message.id}`}
                                        />
                                      )}
                                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                      {isLastInGroup && (
                                        <div className="flex items-center gap-1.5 text-xs mt-1 opacity-0 group-hover:opacity-70 transition-opacity">
                                          <span>{formatMessageTime(message.timestamp)}</span>
                                          {!message.isInbound && message.status && (
                                            <span className="inline-flex" data-testid={`status-${message.status}`}>
                                              {getStatusIcon(message.status)}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              } else if (message.type === 'EMAIL') {
                                return (
                                  <div
                                    key={message.id}
                                    className="flex justify-center my-4"
                                    data-testid={`email-notification-${message.id}`}
                                  >
                                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 flex items-center gap-2 max-w-md">
                                      <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-blue-900 dark:text-blue-100">
                                          {message.isInbound ? 'Contact sent email' : 'You sent email'}
                                        </p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                          {formatTime(message.timestamp)}
                                        </p>
                                      </div>
                                      <Link href={`/contacts/${selectedContactId}`}>
                                        <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400" data-testid="button-view-email">
                                          View
                                        </Button>
                                      </Link>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Message Composer */}
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40">
                {selectedImage && (
                  <div className="mb-2 mx-3 relative inline-block">
                    <img src={selectedImage} alt="Preview" className="max-h-32 rounded-xl border" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => setSelectedImage(null)}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center gap-2 bg-background rounded-3xl px-3 py-2 mx-3 mb-3 shadow-sm border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    data-testid="button-emoji"
                  >
                    <Smile className="w-5 h-5 text-muted-foreground" />
                  </Button>
                  
                  <label htmlFor="image-upload">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      asChild
                      data-testid="button-image"
                    >
                      <div>
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </Button>
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 border-0 resize-none min-h-[36px] max-h-[120px] bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-0 text-sm leading-9"
                    data-testid="textarea-message"
                    rows={1}
                  />
                  
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendSmsMutation.isPending}
                    size="icon"
                    className="h-8 w-8 rounded-full shrink-0"
                    data-testid="button-send-sms"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                {showEmojiPicker && (
                  <div className="mx-3 mb-2 p-3 bg-background rounded-xl border">
                    <div className="grid grid-cols-10 gap-2">
                      {commonEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleEmojiSelect(emoji)}
                          className="text-2xl hover:scale-125 transition-transform cursor-pointer"
                          data-testid={`emoji-${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </>
    )}

    {/* CONTACTS VIEW */}
    {currentView === 'contacts' && (
      <div className="flex-1 flex flex-col overflow-hidden">
        {contactsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading contacts...</p>
          </div>
        ) : allContacts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No contacts yet</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4" data-testid="text-recent-contacts">Recent Contacts</h2>
              <div className="space-y-2">
                {allContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent transition-colors"
                    data-testid={`contact-card-${contact.id}`}
                  >
                    <Avatar className="rounded-xl">
                      <AvatarFallback className="rounded-xl">
                        {getInitials(contact.firstName, contact.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" data-testid={`contact-name-${contact.id}`}>
                        {contact.firstName} {contact.lastName}
                      </p>
                      {contact.phone && (
                        <p className="text-sm text-muted-foreground truncate" data-testid={`contact-phone-${contact.id}`}>
                          {contact.phone}
                        </p>
                      )}
                      {!contact.phone && contact.email && (
                        <p className="text-sm text-muted-foreground truncate" data-testid={`contact-email-${contact.id}`}>
                          {contact.email}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => handleContactToInbox(contact.id)}
                      data-testid={`button-add-contact-${contact.id}`}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    )}

    {/* PHONE VIEW - Coming Soon */}
    {currentView === 'phone' && (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-8">
          <Phone className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-1" data-testid="text-coming-soon-phone">Coming Soon</p>
          <p className="text-sm text-muted-foreground">Phone features will be available soon</p>
        </div>
      </div>
    )}

    {/* SETTINGS VIEW - Coming Soon */}
    {currentView === 'settings' && (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-8">
          <Settings className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-1" data-testid="text-coming-soon-settings">Coming Soon</p>
          <p className="text-sm text-muted-foreground">Settings will be available soon</p>
        </div>
      </div>
    )}
  </div>
</div>
  </div>
</div>
  );
}
