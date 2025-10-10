import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  User,
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  CheckCircle,
  Clock,
  FileText,
  DollarSign,
  MessageSquare,
  ExternalLink,
  Edit
} from "lucide-react";
import ContactForm from "../forms/contact-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Contact, Stage } from "@shared/schema";

interface ContactWithStage extends Contact {
  stage?: Stage;
}

interface ContactModalProps {
  contactId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ contactId, isOpen, onClose }: ContactModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: contact, isLoading } = useQuery<ContactWithStage>({
    queryKey: [`/api/contacts/${contactId}`],
    enabled: !!contactId && isOpen
  });

  // Mock data for demonstration - in reality these would be separate API calls
  const mockChecklistItems = [
    { id: "1", title: "Send welcome packet", completedAt: "2024-01-15", orderIndex: 0 },
    { id: "2", title: "Schedule consultation call", completedAt: null, orderIndex: 1 },
    { id: "3", title: "Send questionnaire", completedAt: null, orderIndex: 2 },
    { id: "4", title: "Create and send proposal", completedAt: null, orderIndex: 3 }
  ];

  const mockCommunicationHistory = [
    {
      id: "1",
      type: "email",
      subject: "Welcome to Lazy Photog Studio",
      sentAt: "2024-01-15T10:00:00",
      status: "opened"
    },
    {
      id: "2",
      type: "sms",
      message: "Thank you for your inquiry!",
      sentAt: "2024-01-15T10:05:00",
      status: "delivered"
    }
  ];

  const mockEstimates = [
    {
      id: "1",
      title: "Gold Wedding Package",
      status: "SENT",
      totalCents: 450000,
      createdAt: "2024-01-10"
    }
  ];

  const mockQuickLinks = [
    { id: "1", title: "Contact Portal", url: "/client-portal" },
    { id: "2", title: "Wedding Planning Guide", url: "#" },
    { id: "3", title: "Portfolio Gallery", url: "#" }
  ];

  const updateContactMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", `/api/contacts/${contactId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}`] });
      setIsEditing(false);
      toast({
        title: "Contact updated",
        description: "Contact information has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update contact. Please try again.",
        variant: "destructive"
      });
    }
  });

  const toggleChecklistItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("POST", `/api/contact-checklist/${itemId}/toggle`);
    },
    onSuccess: () => {
      // In reality, this would invalidate the checklist query
      toast({
        title: "Checklist updated",
        description: "Checklist item has been updated.",
      });
    }
  });

  if (!contactId) return null;

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };

  const getDaysInStage = () => {
    if (!contact?.stageEnteredAt) return 0;
    const enteredAt = new Date(contact.stageEnteredAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - enteredAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const completedItems = mockChecklistItems.filter(item => item.completedAt).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {contact ? `${contact.firstName} ${contact.lastName}` : "Loading..."}
            </span>
            {contact && !isEditing && (
              <Button
                variant="outline" 
                size="sm"
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-contact"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            Manage contact information, checklist, and communication history
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !contact ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Contact not found.</p>
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            <ContactForm
              initialData={{
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email || "",
                phone: contact.phone || "",
                weddingDate: contact.weddingDate || "",
                notes: contact.notes || "",
                emailOptIn: contact.emailOptIn,
                smsOptIn: contact.smsOptIn,
              }}
              onSubmit={(data) => updateContactMutation.mutate({
                ...data,
                weddingDate: data.weddingDate ? new Date(data.weddingDate) : undefined
              })}
              isLoading={updateContactMutation.isPending}
              submitText="Update Contact"
            />
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contact Information */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Current Stage</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{contact.stage?.name || "No stage"}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {getDaysInStage()} days
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {contact.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{contact.email}</span>
                          <Badge variant={contact.emailOptIn ? "default" : "outline"} className="text-xs">
                            {contact.emailOptIn ? "Opted in" : "Opted out"}
                          </Badge>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{contact.phone}</span>
                          <Badge variant={contact.smsOptIn ? "default" : "outline"} className="text-xs">
                            {contact.smsOptIn ? "Opted in" : "Opted out"}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {contact.weddingDate && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          Wedding: {new Date(contact.weddingDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {contact.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Notes</p>
                        <p className="text-sm bg-muted p-3 rounded-md">{contact.notes}</p>
                      </div>
                    )}

                    <div className="pt-2 text-xs text-muted-foreground">
                      Contact since: {new Date(contact.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button className="w-full" data-testid="button-create-estimate">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Create Estimate
                      </Button>
                      <Button variant="outline" className="w-full" data-testid="button-send-template">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Send Template
                      </Button>
                      <Button variant="outline" className="w-full" data-testid="button-schedule-call">
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Call
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Links</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {mockQuickLinks.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          className="flex items-center justify-between p-2 border border-border rounded hover:bg-accent transition-colors text-sm"
                          data-testid={`quick-link-${link.id}`}
                        >
                          <span>{link.title}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="checklist" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Wedding Checklist
                    </CardTitle>
                    <Badge variant="outline">
                      {completedItems} of {mockChecklistItems.length} complete
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockChecklistItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                        <Checkbox 
                          checked={!!item.completedAt}
                          onCheckedChange={() => toggleChecklistItemMutation.mutate(item.id)}
                          data-testid={`checklist-item-${item.id}`}
                        />
                        <span className={item.completedAt ? "line-through text-muted-foreground flex-1" : "flex-1"}>
                          {item.title}
                        </span>
                        {item.completedAt && (
                          <div className="text-xs text-muted-foreground">
                            Completed {new Date(item.completedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="communication" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Communication History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockCommunicationHistory.map((comm) => (
                      <div key={comm.id} className="flex items-start space-x-3 p-3 border border-border rounded-lg">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          comm.type === 'email' ? 'bg-blue-400' : 'bg-green-400'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {comm.type === 'email' ? (
                              <Mail className="w-4 h-4" />
                            ) : (
                              <MessageSquare className="w-4 h-4" />
                            )}
                            <span className="font-medium">
                              {comm.type === 'email' ? comm.subject : 'SMS'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {comm.status}
                            </Badge>
                          </div>
                          {comm.type === 'sms' && (
                            <p className="text-sm text-muted-foreground">{(comm as any).message}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(comm.sentAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Estimates & Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockEstimates.map((estimate) => (
                      <div key={estimate.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div>
                          <h4 className="font-medium">{estimate.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(estimate.createdAt).toLocaleDateString()}
                          </p>
                          <p className="font-mono">{formatPrice(estimate.totalCents)}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{estimate.status}</Badge>
                          <Button variant="outline" size="sm" data-testid={`view-estimate-${estimate.id}`}>
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {mockEstimates.length === 0 && (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No documents yet.</p>
                        <Button className="mt-2" data-testid="button-create-first-estimate">
                          Create First Estimate
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
