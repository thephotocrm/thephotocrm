import { useState } from "react";
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
import { MessageSquare, Mail, Send, MessageCircle, ArrowLeft, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

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
}

export default function Inbox() {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isMobileThreadView, setIsMobileThreadView] = useState(false);
  const [isNewMessageDialogOpen, setIsNewMessageDialogOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/inbox/conversations'],
    refetchInterval: 10000 // Poll every 10 seconds for new messages
  });

  // Fetch all contacts for new message dialog
  const { data: allContacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    enabled: isNewMessageDialogOpen
  });

  // Fetch thread for selected contact
  const { data: thread = [], isLoading: threadLoading } = useQuery<ThreadMessage[]>({
    queryKey: ['/api/inbox/thread', selectedContactId],
    enabled: !!selectedContactId,
    refetchInterval: 5000 // Poll every 5 seconds when viewing a thread
  });

  // Send SMS mutation
  const sendSmsMutation = useMutation({
    mutationFn: async ({ contactId, message }: { contactId: string; message: string }) => {
      return apiRequest('POST', '/api/inbox/send-sms', { contactId, message });
    },
    onSuccess: () => {
      setNewMessage("");
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

  const handleConversationClick = (contactId: string) => {
    setSelectedContactId(contactId);
    setIsMobileThreadView(true);
    markAsReadMutation.mutate(contactId);
  };

  const handleSendMessage = () => {
    if (!selectedContactId || !newMessage.trim()) return;

    sendSmsMutation.mutate({
      contactId: selectedContactId,
      message: newMessage.trim()
    });
  };

  const handleBackToList = () => {
    setIsMobileThreadView(false);
    setSelectedContactId(null);
  };

  const handleStartNewConversation = (contactId: string) => {
    setSelectedContactId(contactId);
    setIsMobileThreadView(true);
    setIsNewMessageDialogOpen(false);
    setContactSearch("");
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

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div className={`w-full md:w-96 border-r bg-background ${isMobileThreadView ? 'hidden md:block' : 'block'}`}>
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-inbox-title">Inbox</h2>
              <p className="text-sm text-muted-foreground">SMS Conversations</p>
            </div>
            <Dialog open={isNewMessageDialogOpen} onOpenChange={setIsNewMessageDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-new-message">
                  <Plus className="w-4 h-4 mr-1" />
                  New
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

          <ScrollArea className="h-[calc(100vh-12rem)]">
            {conversationsLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No SMS conversations yet</p>
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
              conversations.map((conversation) => (
                <div
                  key={conversation.contact.id}
                  onClick={() => handleConversationClick(conversation.contact.id)}
                  className={`p-4 border-b cursor-pointer transition-colors hover:bg-accent ${
                    selectedContactId === conversation.contact.id ? 'bg-accent' : ''
                  }`}
                  data-testid={`conversation-${conversation.contact.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(conversation.contact.firstName, conversation.contact.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold truncate" data-testid={`contact-name-${conversation.contact.id}`}>
                          {conversation.contact.firstName} {conversation.contact.lastName}
                        </h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate flex-1" data-testid={`last-message-${conversation.contact.id}`}>
                          {conversation.lastMessage || 'No messages'}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="default" className="ml-2" data-testid={`unread-badge-${conversation.contact.id}`}>
                            {conversation.unreadCount}
                          </Badge>
                        )}
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
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={handleBackToList}
                  data-testid="button-back-to-list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                
                <Avatar>
                  <AvatarFallback>
                    {getInitials(selectedConversation?.contact.firstName, selectedConversation?.contact.lastName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h3 className="font-semibold" data-testid="thread-contact-name">
                    {selectedConversation?.contact.firstName} {selectedConversation?.contact.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{selectedConversation?.contact.phone}</p>
                </div>
                
                <Link href={`/contacts/${selectedContactId}`}>
                  <Button variant="outline" size="sm" data-testid="button-view-contact">
                    View Contact
                  </Button>
                </Link>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {threadLoading ? (
                  <div className="text-center text-muted-foreground">Loading messages...</div>
                ) : thread.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No messages yet</div>
                ) : (
                  <div className="space-y-4">
                    {thread.map((message) => {
                      if (message.type === 'SMS') {
                        return (
                          <div
                            key={message.id}
                            className={`flex ${message.isInbound ? 'justify-start' : 'justify-end'}`}
                            data-testid={`sms-message-${message.id}`}
                          >
                            <div
                              className={`max-w-sm rounded-lg px-4 py-2 ${
                                message.isInbound
                                  ? 'bg-muted'
                                  : 'bg-primary text-primary-foreground'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              <p className="text-xs mt-1 opacity-70">
                                {formatTime(message.timestamp)}
                              </p>
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
                )}
              </ScrollArea>

              {/* Message Composer */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
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
                    className="min-h-[60px]"
                    data-testid="textarea-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendSmsMutation.isPending}
                    data-testid="button-send-sms"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                  <span>{newMessage.length} / 160 characters</span>
                  <span>Press Enter to send</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
