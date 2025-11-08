import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, User, Mail, Phone, FileText, DollarSign, Clock, Copy, Eye, MoreVertical, Trash, Send, MessageSquare, Plus, X, Heart, Briefcase, Camera, ChevronDown, Menu, Link as LinkIcon, ExternalLink, Lock, Settings, Tag, Sparkles, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Paperclip, Image as ImageIcon, Video, Smile, Code, Undo, Redo, Strikethrough, Subscript, Superscript, Palette, Type, Mic, ArrowLeft, Reply, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PhotographerSignatureDialog } from "@/components/photographer-signature-dialog";
import heroImage from "@assets/stock_images/vintage_camera_photo_e2b0b796.jpg";

interface Project {
  id: string;
  title: string;
  projectType: string;
  eventDate?: string;
  notes?: string;
  status: string;
  createdAt: string;
  leadSource?: string;
  referralName?: string;
  contactId?: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  stage?: {
    id: string;
    name: string;
  };
}

interface Participant {
  id: string;
  projectId: string;
  clientId: string;
  addedAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ProjectSmartFile {
  id: string;
  projectId: string;
  smartFileId: string;
  smartFileName: string;
  token: string;
  status: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  paidAt?: string;
  createdAt: string;
  pagesSnapshot?: any[];
  formAnswers?: any;
}

interface SmartFile {
  id: string;
  name: string;
  description?: string;
  projectType?: string;
  status: string;
  pages?: any[];
}

type TimelineEvent = 
  | {
      type: 'activity';
      id: string;
      title: string;
      description?: string;
      activityType: string;
      metadata?: any;
      createdAt: string;
    }
  | {
      type: 'email';
      id: string;
      title: string;
      description: string;
      status: string;
      sentAt?: string;
      openedAt?: string;
      clickedAt?: string;
      createdAt: string;
    }
  | {
      type: 'sms';
      id: string;
      body: string;
      direction: string;
      createdAt: string;
    };

// Helper to safely get contact info from project
function getContactInfo(project: Project | undefined) {
  if (!project) return null;
  const contact = project.contact || project.client;
  return contact ? {
    id: contact.id || project.contactId || '',
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    email: contact.email || '',
    phone: contact.phone || ''
  } : null;
}

// ProjectNotes component
function ProjectNotes({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [noteText, setNoteText] = useState("");

  const { data: notes, isLoading } = useQuery<Array<{
    id: string;
    noteText: string;
    createdAt: string;
  }>>({
    queryKey: ["/api/projects", projectId, "notes"],
  });

  const createNoteMutation = useMutation({
    mutationFn: async (text: string) => {
      return await apiRequest("POST", `/api/projects/${projectId}/notes`, { noteText: text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "notes"] });
      setNoteText("");
      toast({ title: "Note added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add note", variant: "destructive" });
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "notes"] });
      toast({ title: "Note deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete note", variant: "destructive" });
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Note</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Textarea
              placeholder="Type your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-new-note"
            />
            <Button
              onClick={() => {
                if (noteText.trim()) {
                  createNoteMutation.mutate(noteText);
                }
              }}
              disabled={!noteText.trim() || createNoteMutation.isPending}
              data-testid="button-add-note"
            >
              {createNoteMutation.isPending ? "Adding..." : "Add Note"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Loading notes...</p>
        </div>
      ) : notes && notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{note.noteText}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(note.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    disabled={deleteNoteMutation.isPending}
                    data-testid={`button-delete-note-${note.id}`}
                  >
                    <Trash className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No notes yet</p>
          <p className="text-sm mt-1">Add your first note above</p>
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("activity");
  
  // State for various dialogs
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");
  const [attachSmartFileOpen, setAttachSmartFileOpen] = useState(false);
  const [selectedSmartFileId, setSelectedSmartFileId] = useState("");
  const [smartFileToSend, setSmartFileToSend] = useState<ProjectSmartFile | null>(null);
  const [pendingSmartFileToSend, setPendingSmartFileToSend] = useState<ProjectSmartFile | null>(null);
  const [sendFileDialogOpen, setSendFileDialogOpen] = useState(false);
  const [sendFileTemplateId, setSendFileTemplateId] = useState("");
  const [sendFileMethod, setSendFileMethod] = useState<"email" | "sms">("email");
  const [contractPageToSign, setContractPageToSign] = useState<any>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendToParticipants, setSendToParticipants] = useState(false);
  const [emailFontFamily, setEmailFontFamily] = useState("Default");
  const [emailFontSize, setEmailFontSize] = useState("16");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDuration, setMeetingDuration] = useState("60");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModalType, setAiModalType] = useState<"email" | "sms">("email");
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [aiIsReady, setAiIsReady] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{ subject?: string; body: string } | null>(null);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsBody, setSmsBody] = useState("");
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [showSmartFields, setShowSmartFields] = useState(false);
  const [manualGalleryUrl, setManualGalleryUrl] = useState("");
  const [isEditingGalleryUrl, setIsEditingGalleryUrl] = useState(false);
  const [includePortalLinks, setIncludePortalLinks] = useState(true);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string>("");

  const { data: project, isLoading} = useQuery<Project>({
    queryKey: ["/api/projects", id],
    enabled: !!user && !!id
  });

  const { data: stages } = useQuery<any[]>({
    queryKey: ["/api/stages"],
    enabled: !!user
  });

  const { data: participants } = useQuery<Participant[]>({
    queryKey: ["/api/projects", id, "participants"],
    enabled: !!user && !!id
  });

  const { data: history } = useQuery<TimelineEvent[]>({
    queryKey: ["/api/projects", id, "history"],
    enabled: !!user && !!id
  });

  const { data: smartFiles } = useQuery<ProjectSmartFile[]>({
    queryKey: ["/api/projects", id, "smart-files"],
    enabled: !!user && !!id
  });

  const { data: allSmartFiles } = useQuery<SmartFile[]>({
    queryKey: ["/api/smart-files"],
    enabled: !!user && (attachSmartFileOpen || sendFileDialogOpen)
  });

  // Query to fetch photographer's galleries
  const { data: galleries } = useQuery<Array<{ id: string; title: string; status: string; projectId: string | null }>>({
    queryKey: ["/api/galleries"],
    enabled: !!user && !!id
  });

  // Find gallery linked to this project
  const linkedGallery = galleries?.find(g => g.projectId === id);

  // Initialize includePortalLinks from project data
  useEffect(() => {
    if (project) {
      setIncludePortalLinks(project.includePortalLinks !== false); // Default to true if not set
    }
  }, [project]);

  const updateProjectMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      return await apiRequest("PATCH", `/api/projects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({
        title: "Project updated",
        description: "The project has been updated successfully."
      });
    }
  });

  const addParticipantMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", `/api/projects/${id}/participants`, { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "participants"] });
      setParticipantEmail("");
      setIsAddingParticipant(false);
      toast({
        title: "Participant added",
        description: "The participant has been added successfully."
      });
    }
  });

  const attachSmartFileMutation = useMutation({
    mutationFn: async (smartFileId: string) => {
      return await apiRequest("POST", `/api/projects/${id}/smart-files`, { smartFileId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "smart-files"] });
      setAttachSmartFileOpen(false);
      setSelectedSmartFileId("");
      toast({
        title: "Smart File attached",
        description: "The Smart File has been attached to this project."
      });
    }
  });

  const sendSmartFileMutation = useMutation({
    mutationFn: async (projectSmartFileId: string) => {
      return await apiRequest("POST", `/api/projects/${id}/smart-files/${projectSmartFileId}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "smart-files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      setSmartFileToSend(null);
      setPendingSmartFileToSend(null);
      toast({
        title: "Smart File sent",
        description: "The Smart File has been sent to the client."
      });
    },
    onError: (error: any) => {
      if (error.code === "PHOTOGRAPHER_SIGNATURE_REQUIRED" && smartFileToSend) {
        const pagesSnapshot = smartFileToSend.pagesSnapshot || [];
        const contractPage = pagesSnapshot.find((page: any) => page.pageType === 'CONTRACT');
        
        if (contractPage) {
          setContractPageToSign(contractPage);
          setPendingSmartFileToSend(smartFileToSend);
          setSignatureDialogOpen(true);
          setSmartFileToSend(null);
          return;
        }
      }
      
      toast({
        title: "Failed to send Smart File",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const sendFileFromTemplateMutation = useMutation({
    mutationFn: async (data: { templateId: string; method: "email" | "sms" }) => {
      return await apiRequest("POST", `/api/projects/${id}/send-smart-file`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "smart-files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      setSendFileDialogOpen(false);
      setSendFileTemplateId("");
      toast({
        title: "Smart File sent",
        description: "The Smart File has been sent to the client."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send Smart File",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { subject: string; body: string; recipients: string[] }) => {
      return await apiRequest("POST", `/api/projects/${id}/send-email`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      setMessageSubject("");
      setMessageBody("");
      setMessageDialogOpen(false);
      setSelectedRecipients([]);
      toast({
        title: "Message sent",
        description: "Your email has been sent successfully."
      });
    }
  });

  const generateEmailMutation = useMutation({
    mutationFn: async (data: { prompt: string; existingEmailBody?: string }) => {
      return await apiRequest("POST", `/api/projects/${id}/generate-email`, data);
    },
    onSuccess: (data: { subject: string; body: string }) => {
      setMessageSubject(data.subject);
      setMessageBody(data.body);
      setShowAiModal(false);
      setAiPrompt("");
      toast({
        title: "Draft generated",
        description: "Your AI-generated email draft is ready to review."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate draft",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const generateSMSMutation = useMutation({
    mutationFn: async (data: { prompt: string; existingSMSBody?: string }) => {
      return await apiRequest("POST", `/api/projects/${id}/generate-sms`, data);
    },
    onSuccess: (data: { body: string }) => {
      setSmsBody(data.body);
      setShowAiModal(false);
      setAiPrompt("");
      toast({
        title: "Draft generated",
        description: "Your AI-generated SMS draft is ready to review."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate draft",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const conversationalAIMutation = useMutation({
    mutationFn: async (data: {
      messageType: 'email' | 'sms';
      conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>;
      existingContent?: string;
    }) => {
      const response = await apiRequest("POST", `/api/projects/${id}/conversational-ai`, data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log("=== AI RESPONSE RECEIVED ===", data);
      
      if (!data || !data.type) {
        console.error("Invalid AI response format:", data);
        toast({
          title: "AI Error",
          description: "Received invalid response from AI. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      if (data.type === 'question' && data.message) {
        // AI is asking a clarifying question - reset ready state
        console.log("AI is asking a question:", data.message);
        setAiIsReady(false);
        setGeneratedContent(null);
        setConversationHistory(prev => [...prev, { role: 'assistant', content: data.message! }]);
        setAiPrompt("");
      } else if (data.type === 'ready' && data.content) {
        // AI has generated the content
        console.log("AI has generated content:", data.content);
        setConversationHistory(prev => [...prev, { role: 'assistant', content: data.message || 'Here\'s your draft!' }]);
        setGeneratedContent(data.content);
        setAiIsReady(true);
        setAiPrompt("");
      } else {
        console.error("Unhandled AI response type or missing data:", data);
        toast({
          title: "AI Error",
          description: "AI response was incomplete. Please try again.",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "AI Error",
        description: error.message || "Failed to process your request",
        variant: "destructive"
      });
    }
  });

  const handleSendAIMessage = () => {
    if (!aiPrompt.trim()) return;

    // Reset ready state when sending new message
    setAiIsReady(false);
    setGeneratedContent(null);

    // Add user message to conversation
    const newHistory = [...conversationHistory, { role: 'user' as const, content: aiPrompt }];
    setConversationHistory(newHistory);

    // Call AI
    conversationalAIMutation.mutate({
      messageType: aiModalType,
      conversationHistory: newHistory,
      existingContent: aiModalType === 'email' ? messageBody || undefined : smsBody || undefined
    });
  };

  const handleUseGeneratedContent = () => {
    if (!generatedContent) return;

    if (aiModalType === 'email') {
      if (generatedContent.subject) setMessageSubject(generatedContent.subject);
      setMessageBody(generatedContent.body);
    } else {
      setSmsBody(generatedContent.body);
    }

    // Reset AI modal
    setShowAiModal(false);
    setConversationHistory([]);
    setAiIsReady(false);
    setGeneratedContent(null);
    setAiPrompt("");

    toast({
      title: "Draft ready",
      description: `Your AI-generated ${aiModalType} draft has been added.`
    });
  };

  const sendSMSMutation = useMutation({
    mutationFn: async (data: { body: string; recipient: string }) => {
      return await apiRequest("POST", `/api/projects/${id}/send-sms`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      setSmsBody("");
      setSmsDialogOpen(false);
      toast({
        title: "Message sent",
        description: "Your SMS has been sent successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send SMS",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: { 
      title: string;
      startAt: string;
      endAt: string;
      projectId: string;
      clientId: string;
    }) => {
      return await apiRequest("POST", `/api/bookings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setScheduleDialogOpen(false);
      setSelectedDate("");
      setSelectedTime("");
      setMeetingTitle("");
      setMeetingDuration("60");
      toast({
        title: "Meeting scheduled",
        description: "The meeting has been scheduled successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to schedule meeting",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const createGalleryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${id}/gallery/create`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({
        title: "Gallery created",
        description: "Gallery folder has been created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create gallery",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const shareGalleryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${id}/gallery/share`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      toast({
        title: "Gallery shared",
        description: "Gallery link has been sent to client."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to share gallery",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const updateGalleryUrlMutation = useMutation({
    mutationFn: async (galleryUrl: string) => {
      return await apiRequest("PUT", `/api/projects/${id}/gallery`, { galleryUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      setIsEditingGalleryUrl(false);
      setManualGalleryUrl("");
      toast({
        title: "Gallery URL updated",
        description: "Gallery link has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update gallery URL",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Link gallery to project mutation
  const linkGalleryMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      return await apiRequest("PUT", `/api/galleries/${galleryId}`, { projectId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({
        title: "Gallery linked",
        description: "Gallery has been linked to this project."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to link gallery",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Unlink gallery from project mutation
  const unlinkGalleryMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      return await apiRequest("PUT", `/api/galleries/${galleryId}`, { projectId: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({
        title: "Gallery unlinked",
        description: "Gallery has been unlinked from this project."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to unlink gallery",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Mark gallery as ready and move project to "Gallery Delivered" stage
  const markGalleryReadyMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      // Use the dedicated endpoint that handles gallery status + stage change + automation trigger
      return await apiRequest("POST", `/api/projects/${id}/galleries/ready`, { galleryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      toast({
        title: "Gallery ready",
        description: "Gallery has been marked as ready and project moved to Gallery Delivered."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to mark gallery as ready",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'WEDDING':
        return <Heart className="w-4 h-4" />;
      case 'PORTRAIT':
        return <User className="w-4 h-4" />;
      case 'COMMERCIAL':
        return <Briefcase className="w-4 h-4" />;
      default:
        return <Camera className="w-4 h-4" />;
    }
  };

  const getProjectTypeLabel = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  const getActivityIcon = (event: TimelineEvent) => {
    if (event.type === 'email') return <Mail className="w-4 h-4" />;
    if (event.type === 'sms') return <MessageSquare className="w-4 h-4" />;
    if (event.type === 'activity') {
      if (event.activityType === 'SMART_FILE_SENT') return <FileText className="w-4 h-4" />;
      if (event.activityType === 'SMART_FILE_VIEWED') return <Eye className="w-4 h-4" />;
      if (event.activityType === 'SMS_SENT' || event.activityType === 'SMS_RECEIVED') return <MessageSquare className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  const totalParticipants = (participants?.length || 0) + 1; // +1 for main contact

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-40 md:h-64 bg-gradient-to-br from-slate-500 to-slate-600">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <div className="relative h-full flex flex-col justify-between p-4 md:p-6">
          {/* Breadcrumb & Exit Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <Link href="/projects">
                <button className="hover:bg-white/10 p-1 rounded transition-colors md:hidden" data-testid="button-back-mobile">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
              <Menu className="w-4 h-4 hidden md:block" />
              <span className="uppercase tracking-wider font-medium hidden md:inline">PROJECTS</span>
            </div>
            
            {/* Desktop Exit Button */}
            <Link href="/projects">
              <Button 
                variant="ghost" 
                size="sm" 
                className="hidden md:flex text-white hover:bg-white/10 hover:text-white"
                data-testid="button-exit-project"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Exit Project
              </Button>
            </Link>
          </div>

          {/* Project Title */}
          <div>
            <h1 className="text-2xl md:text-4xl font-semibold text-white mb-1 md:mb-2" data-testid="text-project-title">
              {project.title}
            </h1>
            <div className="flex items-center gap-2 text-white/90 text-sm md:text-base">
              {getProjectTypeIcon(project.projectType)}
              <span className="capitalize">{getProjectTypeLabel(project.projectType)}</span>
              {project.eventDate && (
                <>
                  <span className="mx-1">•</span>
                  <span className="hidden sm:inline">{formatDate(project.eventDate)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Participants Bar */}
      <div className="border-b bg-white px-4 md:px-6 py-2 md:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-xs md:text-sm text-muted-foreground hidden sm:inline">
              Visible to you + {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center -space-x-2">
              {/* Main Contact Avatar */}
              <div 
                className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium border-2 border-white"
                title={`${getContactInfo(project)?.firstName || ''} ${getContactInfo(project)?.lastName || ''}`}
              >
                {getInitials(getContactInfo(project)?.firstName || '', getContactInfo(project)?.lastName || '')}
              </div>
              
              {/* Participant Avatars */}
              {participants?.slice(0, 3).map((participant) => (
                <div 
                  key={participant.id}
                  className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-medium border-2 border-white"
                  title={`${participant.client.firstName} ${participant.client.lastName}`}
                >
                  {getInitials(participant.client.firstName, participant.client.lastName)}
                </div>
              ))}
              
              {/* Add Button */}
              <button 
                onClick={() => setIsAddingParticipant(true)}
                className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-colors"
                data-testid="button-add-participant"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="border-b bg-white px-4 md:px-6 py-2 md:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setScheduleDialogOpen(true)}
              data-testid="button-schedule"
              className="h-8 md:h-9"
              aria-label="Schedule"
            >
              <Calendar className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
              <span className="hidden md:inline">Schedule</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setAttachSmartFileOpen(true)}
              data-testid="button-attach"
              className="h-8 md:h-9"
              aria-label="Attach"
            >
              <LinkIcon className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
              <span className="hidden md:inline">Attach</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-send-message" className="h-8 md:h-9" aria-label="Send Message">
                  <MessageSquare className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                  <span className="hidden sm:inline ml-1">Send Message</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setMessageDialogOpen(true)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSmsDialogOpen(true)}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send SMS
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4"
              onClick={() => setSendFileDialogOpen(true)}
              data-testid="button-send-file"
              aria-label="Send File"
            >
              <Send className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
              <span className="hidden md:inline">SEND FILE</span>
              <span className="md:hidden">SEND</span>
            </Button>
            <Button 
              size="sm" 
              className="bg-black hover:bg-black/90 text-white h-8 md:h-9 text-xs md:text-sm px-3 md:px-4"
              onClick={() => setAttachSmartFileOpen(true)}
              data-testid="button-create-file"
              aria-label="Create File"
            >
              <Plus className="w-3 h-3 md:hidden mr-1" />
              <span className="hidden md:inline">CREATE FILE</span>
              <span className="md:hidden">FILE</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 md:px-6">
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="border-b w-full justify-start rounded-none h-auto p-0 bg-transparent inline-flex min-w-full">
            <TabsTrigger 
              value="activity" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm whitespace-nowrap"
              data-testid="tab-activity"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger 
              value="files" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm whitespace-nowrap"
              data-testid="tab-files"
            >
              Files
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm whitespace-nowrap"
              data-testid="tab-tasks"
            >
              Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="financials" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm whitespace-nowrap"
              data-testid="tab-financials"
            >
              Financials
            </TabsTrigger>
            <TabsTrigger 
              value="notes" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm whitespace-nowrap"
              data-testid="tab-notes"
            >
              Notes
            </TabsTrigger>
            <TabsTrigger 
              value="gallery" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm whitespace-nowrap"
              data-testid="tab-gallery"
            >
              Gallery
            </TabsTrigger>
            <TabsTrigger 
              value="details" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm whitespace-nowrap"
              data-testid="tab-details"
            >
              Details
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Content Area with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            <TabsContent value="activity" className="m-0">
              <div className="space-y-4">
                {/* Email Composer - Collapsed State */}
                {selectedRecipients.length === 0 && (
                  <Card 
                    className="border cursor-pointer hover:border-primary/50 transition-colors" 
                    onClick={() => {
                      const allRecipients = [];
                      const mainContact = getContactInfo(project);
                      if (mainContact?.email) allRecipients.push(mainContact.email);
                      participants?.forEach(p => {
                        if (p.client.email) allRecipients.push(p.client.email);
                      });
                      setSelectedRecipients(allRecipients);
                    }}
                    data-testid="compose-collapsed"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {user?.email?.substring(0, 2).toUpperCase() || "AP"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          Reply to: '{project?.title || 'Contract Agreement'}'
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Expanded Email Editor - Shows when recipients are selected */}
                {selectedRecipients.length > 0 && (
                  <Card className="border-2 border-primary/20">
                    <CardContent className="p-4 space-y-3">
                      {/* Recipient Header Row */}
                      <div className="flex items-center gap-2 pb-3 border-b">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-medium">
                            {user?.email?.substring(0, 2).toUpperCase() || "AP"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-600">Reply to:</span>
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                          {selectedRecipients.map((email) => {
                            // Find contact data for this email
                            const mainContact = getContactInfo(project);
                            const isMainContact = mainContact?.email === email;
                            const participant = participants?.find(p => p.client.email === email);
                            
                            const firstName = isMainContact ? mainContact?.firstName : participant?.client.firstName;
                            const lastName = isMainContact ? mainContact?.lastName : participant?.client.lastName;
                            
                            return (
                              <div 
                                key={email}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-sm"
                                data-testid={`badge-recipient-chip-${email}`}
                              >
                                <span>{firstName} {lastName}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 hover:bg-transparent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRecipients(prev => prev.filter(e => e !== email));
                                  }}
                                >
                                  <X className="w-3 h-3 text-gray-500 hover:text-gray-700" />
                                </Button>
                              </div>
                            );
                          })}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-sm hover:bg-gray-100"
                            onClick={() => {
                              // Open add participant dialog or similar
                            }}
                          >
                            <Plus className="w-4 h-4 text-gray-600" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMessageSubject("");
                            setMessageBody("");
                            setSelectedRecipients([]);
                            setAiPrompt("");
                          }}
                          className="shrink-0 text-sm font-medium"
                          data-testid="button-close-composer"
                        >
                          SEND NEW EMAIL
                          <X className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs font-semibold text-gray-700">SUBJECT</Label>
                          <Input
                            id="email-subject"
                            value={messageSubject}
                            onChange={(e) => setMessageSubject(e.target.value)}
                            placeholder="Re: Contract Agreement"
                            className="mt-1 border-0 border-b border-gray-200 rounded-none focus-visible:ring-0 focus-visible:border-primary px-3"
                            data-testid="input-email-subject"
                          />
                        </div>

                        <div>
                          <Textarea
                            value={messageBody}
                            onChange={(e) => setMessageBody(e.target.value)}
                            placeholder="Type | to add a smart field"
                            rows={6}
                            className="border-0 resize-none focus-visible:ring-0 px-3"
                            style={{
                              fontFamily: emailFontFamily === "Default" ? "inherit" : emailFontFamily,
                              fontSize: `${emailFontSize}px`
                            }}
                            data-testid="textarea-email-body"
                          />
                        </div>

                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAiModal(true)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            data-testid="button-edit-with-ai"
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            Edit with AI
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Change tone
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Make it shorter
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Improve clarity
                          </Button>
                        </div>

                        {/* Formatting Toolbar */}
                        {showFormattingToolbar && (
                          <div className="flex items-center gap-1 py-2 border-b flex-wrap">
                            <Select value={emailFontFamily} onValueChange={setEmailFontFamily}>
                            <SelectTrigger className="w-[120px] h-8 text-xs border-0 focus:ring-0" data-testid="select-font-family">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Default">Default</SelectItem>
                              <SelectItem value="Arial">Arial</SelectItem>
                              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                              <SelectItem value="Courier New">Courier New</SelectItem>
                              <SelectItem value="Georgia">Georgia</SelectItem>
                              <SelectItem value="Verdana">Verdana</SelectItem>
                              <SelectItem value="Helvetica">Helvetica</SelectItem>
                              <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                              <SelectItem value="Impact">Impact</SelectItem>
                              <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                              <SelectItem value="Palatino">Palatino</SelectItem>
                              <SelectItem value="Garamond">Garamond</SelectItem>
                              <SelectItem value="Bookman">Bookman</SelectItem>
                              <SelectItem value="Tahoma">Tahoma</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select value={emailFontSize} onValueChange={setEmailFontSize}>
                            <SelectTrigger className="w-[70px] h-8 text-xs border-0 focus:ring-0" data-testid="select-font-size">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="12">12</SelectItem>
                              <SelectItem value="14">14</SelectItem>
                              <SelectItem value="16">16</SelectItem>
                              <SelectItem value="18">18</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="24">24</SelectItem>
                              <SelectItem value="32">32</SelectItem>
                            </SelectContent>
                          </Select>

                          <div className="w-px h-6 bg-gray-200 mx-1"></div>

                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-format-bold">
                            <Bold className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-format-italic">
                            <Italic className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-format-underline">
                            <Underline className="w-4 h-4" />
                          </Button>

                          <div className="w-px h-6 bg-gray-200 mx-1"></div>

                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-text-color">
                            <Type className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-bg-color">
                            <Palette className="w-4 h-4" />
                          </Button>

                          <div className="w-px h-6 bg-gray-200 mx-1"></div>

                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <AlignLeft className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <List className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ListOrdered className="w-4 h-4" />
                          </Button>

                          <div className="w-px h-6 bg-gray-200 mx-1"></div>

                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <LinkIcon className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Strikethrough className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Code className="w-4 h-4" />
                          </Button>

                          <div className="w-px h-6 bg-gray-200 mx-1"></div>

                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Undo className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Redo className="w-4 h-4" />
                          </Button>
                        </div>
                        )}

                        {/* Bottom Toolbar */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-8 text-xs">
                              Templates
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => setShowFormattingToolbar(!showFormattingToolbar)}
                              data-testid="button-toggle-formatting"
                              title="Toggle formatting toolbar"
                            >
                              <Type className="w-4 h-4" />
                            </Button>
                            <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  data-testid="button-emoji-picker"
                                  title="Insert emoji"
                                >
                                  <Smile className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-64 p-2">
                                <div className="grid grid-cols-8 gap-1">
                                  {["😊", "😂", "❤️", "👍", "🎉", "📸", "📅", "💍", "🌟", "✨", "🎊", "🎈", "🥂", "💐", "🌹", "💕"].map((emoji) => (
                                    <Button
                                      key={emoji}
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-accent"
                                      onClick={() => {
                                        setMessageBody(messageBody + emoji);
                                        setShowEmojiPicker(false);
                                      }}
                                    >
                                      {emoji}
                                    </Button>
                                  ))}
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => setShowLinkDialog(true)}
                              data-testid="button-insert-link"
                              title="Insert link"
                            >
                              <Paperclip className="w-4 h-4" />
                            </Button>
                            <DropdownMenu open={showSmartFields} onOpenChange={setShowSmartFields}>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  data-testid="button-smart-fields"
                                  title="Insert smart field"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => {
                                  setMessageBody(messageBody + "{{firstName}}");
                                  setShowSmartFields(false);
                                }}>
                                  First Name
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setMessageBody(messageBody + "{{lastName}}");
                                  setShowSmartFields(false);
                                }}>
                                  Last Name
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setMessageBody(messageBody + "{{email}}");
                                  setShowSmartFields(false);
                                }}>
                                  Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setMessageBody(messageBody + "{{projectTitle}}");
                                  setShowSmartFields(false);
                                }}>
                                  Project Title
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setMessageBody(messageBody + "{{eventDate}}");
                                  setShowSmartFields(false);
                                }}>
                                  Event Date
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              disabled
                              title="Calendar availability (coming soon)"
                            >
                              <ImageIcon className="w-4 h-4 opacity-40" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                // Insert photographer's email signature
                                const signature = user?.photographer?.emailSignature || "\n\nBest regards,\n" + (user?.photographer?.businessName || user?.email || "");
                                setMessageBody(messageBody + signature);
                              }}
                              data-testid="button-insert-signature"
                              title="Insert email signature"
                            >
                              <Video className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setMessageBody(messageBody + "\n\n{{unsubscribeLink}}");
                              }}
                              data-testid="button-insert-unsubscribe"
                              title="Insert unsubscribe link"
                            >
                              <Code className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Mic className="w-4 h-4" />
                            </Button>
                            <Button 
                              onClick={() => sendEmailMutation.mutate({ 
                                subject: messageSubject, 
                                body: messageBody,
                                recipients: selectedRecipients 
                              })}
                              disabled={!messageSubject || !messageBody || selectedRecipients.length === 0 || sendEmailMutation.isPending}
                              className="h-8 bg-black text-white hover:bg-black/90"
                              data-testid="button-send-email"
                            >
                              {sendEmailMutation.isPending ? "SENDING..." : "SEND"}
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <span className="font-medium">RECENT ACTIVITY</span>
                </div>
                
                {history && history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((event) => (
                      <div 
                        key={event.id} 
                        className="flex gap-4 p-4 bg-gray-50 rounded-lg"
                        data-testid={`activity-${event.id}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center flex-shrink-0">
                          {getActivityIcon(event)}
                        </div>
                        <div className="flex-1 min-w-0">
                          {event.type === 'activity' && (
                            <div>
                              <p className="font-medium text-sm">{event.title}</p>
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                              )}
                              
                              {/* Display full email in HoneyBook-style card for EMAIL_SENT activities */}
                              {event.activityType === 'EMAIL_SENT' && (() => {
                                try {
                                  const metadata = event.metadata ? (typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata) : null;
                                  if (metadata && (metadata.body || metadata.subject)) {
                                    // Render HoneyBook card with timestamp inside - no external timestamp needed
                                    return (
                                      <div className="mt-3 p-4 bg-white border rounded-lg relative">
                                        {/* From/To Header */}
                                        <div className="flex items-start justify-between mb-4">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 text-sm">
                                              <span className="font-semibold">From:</span>
                                              <span>{metadata.from || 'You'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm mt-1">
                                              <span className="font-semibold">To:</span>
                                              <span>{metadata.to || getContactInfo(project)?.email || 'Client'}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <button className="text-muted-foreground hover:text-foreground transition-colors">
                                              <Reply className="w-4 h-4" />
                                            </button>
                                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                              {formatDate(event.createdAt)}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {/* Subject Line */}
                                        {metadata.subject && (
                                          <h3 className="font-semibold text-base mb-4">
                                            {metadata.subject}
                                          </h3>
                                        )}
                                        
                                        {/* Email Body */}
                                        {metadata.body && (
                                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                            {metadata.body}
                                          </div>
                                        )}
                                        
                                        {/* Attachments Section */}
                                        {metadata.attachments && metadata.attachments.length > 0 && (
                                          <div className="mt-6 pt-4 border-t">
                                            {metadata.attachments.map((attachment: any, idx: number) => (
                                              <div key={idx} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                                <FileText className="w-5 h-5 text-muted-foreground" />
                                                <span className="text-sm font-medium truncate">
                                                  {attachment.name || attachment.filename || 'Attachment'}
                                                </span>
                                                <MoreVertical className="w-4 h-4 ml-auto text-muted-foreground" />
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {/* Envelope Icon */}
                                        <div className="absolute bottom-4 right-4">
                                          <Mail className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    // No valid metadata - show simple timestamp
                                    return (
                                      <p className="text-xs text-muted-foreground mt-2">
                                        {formatDate(event.createdAt)}
                                      </p>
                                    );
                                  }
                                } catch (e) {
                                  // Parsing failed - show simple timestamp
                                  return (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {formatDate(event.createdAt)}
                                    </p>
                                  );
                                }
                              })()}
                            </div>
                          )}
                          {event.type === 'email' && (() => {
                            let renderedCard = false;
                            try {
                              const metadata = event.metadata ? (typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata) : null;
                              if (metadata && (metadata.body || metadata.subject)) {
                                renderedCard = true;
                                return (
                                  <div>
                                    <div className="p-4 bg-white border rounded-lg relative">
                                      {/* From/To Header */}
                                      <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 text-sm">
                                            <span className="font-semibold">From:</span>
                                            <span>{metadata.from || 'You'}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-sm mt-1">
                                            <span className="font-semibold">To:</span>
                                            <span>{metadata.to || getContactInfo(project)?.email || 'Client'}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                                            <Reply className="w-4 h-4" />
                                          </button>
                                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                                            {event.sentAt ? formatDate(event.sentAt) : formatDate(event.createdAt)}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Subject Line */}
                                      {(metadata.subject || event.title) && (
                                        <h3 className="font-semibold text-base mb-4">
                                          {metadata.subject || event.title}
                                        </h3>
                                      )}
                                      
                                      {/* Email Body */}
                                      {metadata.body && (
                                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                          {metadata.body}
                                        </div>
                                      )}
                                      
                                      {/* Attachments Section */}
                                      {metadata.attachments && metadata.attachments.length > 0 && (
                                        <div className="mt-6 pt-4 border-t">
                                          {metadata.attachments.map((attachment: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                              <FileText className="w-5 h-5 text-muted-foreground" />
                                              <span className="text-sm font-medium truncate">
                                                {attachment.name || attachment.filename || 'Attachment'}
                                              </span>
                                              <MoreVertical className="w-4 h-4 ml-auto text-muted-foreground" />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Status Badge */}
                                      {event.status && (
                                        <div className="mt-4">
                                          <Badge variant="secondary" className="text-xs">
                                            {event.status}
                                          </Badge>
                                        </div>
                                      )}
                                      
                                      {/* Envelope Icon */}
                                      <div className="absolute bottom-4 right-4">
                                        <Mail className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            } catch (e) {
                              // Parsing failed, show fallback
                            }
                            
                            // Fallback if card wasn't rendered
                            if (!renderedCard) {
                              return (
                                <div>
                                  <p className="font-medium text-sm">{event.title}</p>
                                  {event.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2">
                                    {event.status && (
                                      <Badge variant="secondary" className="text-xs">
                                        {event.status}
                                      </Badge>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                      {event.sentAt ? formatDate(event.sentAt) : formatDate(event.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {event.type === 'sms' && (
                            <div>
                              <p className="text-sm">{event.body}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {event.direction === 'OUTBOUND' ? 'Sent' : 'Received'} • {formatDate(event.createdAt)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No activity yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="files" className="m-0">
              <div className="space-y-4">
                {smartFiles && smartFiles.length > 0 ? (
                  <div className="space-y-3">
                    {smartFiles.map((sf) => (
                      <div 
                        key={sf.id} 
                        className="p-4 border rounded-lg hover:shadow-sm transition-shadow"
                        data-testid={`smart-file-${sf.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="w-10 h-10 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{sf.smartFileName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {sf.status}
                                </Badge>
                                {sf.sentAt && (
                                  <span className="text-xs text-muted-foreground">
                                    Sent {formatDate(sf.sentAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {sf.status === 'DRAFT' && (
                                <DropdownMenuItem onClick={() => setSmartFileToSend(sf)}>
                                  <Send className="w-4 h-4 mr-2" />
                                  Send to Client
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <a 
                                  href={sf.token ? `/smart-file/${sf.token}` : `/smart-files/${sf.smartFileId}?projectId=${project.id}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  data-testid={`preview-smart-file-${sf.smartFileId}`}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Preview
                                </a>
                              </DropdownMenuItem>
                              {sf.token && (
                                <DropdownMenuItem onClick={() => {
                                  const url = `${window.location.origin}/smart-file/${sf.token}`;
                                  navigator.clipboard.writeText(url);
                                  toast({ title: "Link copied to clipboard" });
                                }}>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy Client Link
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No files attached yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => setAttachSmartFileOpen(true)}
                    >
                      Attach Smart File
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="m-0">
              <div className="text-center py-12 text-muted-foreground">
                <p>Tasks feature coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="financials" className="m-0">
              <div className="text-center py-12 text-muted-foreground">
                <p>Financials feature coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="m-0">
              <ProjectNotes projectId={id!} />
            </TabsContent>

            <TabsContent value="gallery" className="m-0">
              <div className="space-y-4">
                {/* Native Gallery Linking Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Native Gallery</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {linkedGallery ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <Camera className="w-5 h-5 text-green-600 mt-0.5" />
                              <div>
                                <p className="font-medium text-green-800 dark:text-green-200">{linkedGallery.title}</p>
                                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                  Status: {linkedGallery.status}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unlinkGalleryMutation.mutate(linkedGallery.id)}
                              disabled={unlinkGalleryMutation.isPending}
                              data-testid="button-unlink-gallery"
                            >
                              {unlinkGalleryMutation.isPending ? "Unlinking..." : "Unlink"}
                            </Button>
                          </div>
                        </div>

                        {linkedGallery.status !== 'READY' && (
                          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div>
                              <p className="font-medium text-blue-800 dark:text-blue-200">Ready to deliver?</p>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                Mark gallery as ready to move project to "Gallery Delivered" stage
                              </p>
                            </div>
                            <Button
                              onClick={() => markGalleryReadyMutation.mutate(linkedGallery.id)}
                              disabled={markGalleryReadyMutation.isPending}
                              data-testid="button-gallery-ready"
                            >
                              {markGalleryReadyMutation.isPending ? "Processing..." : "Gallery Ready"}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center py-4">
                          <Camera className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                          <h3 className="font-medium mb-2">No Native Gallery Linked</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Link a native gallery to this project
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Select value={selectedGalleryId} onValueChange={setSelectedGalleryId}>
                            <SelectTrigger className="flex-1" data-testid="select-gallery">
                              <SelectValue placeholder="Select a gallery..." />
                            </SelectTrigger>
                            <SelectContent>
                              {galleries?.filter(g => !g.projectId).map(gallery => (
                                <SelectItem key={gallery.id} value={gallery.id}>
                                  {gallery.title} ({gallery.status})
                                </SelectItem>
                              ))}
                              {galleries?.filter(g => !g.projectId).length === 0 && (
                                <SelectItem value="none" disabled>No available galleries</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => {
                              if (selectedGalleryId) {
                                linkGalleryMutation.mutate(selectedGalleryId);
                                setSelectedGalleryId("");
                              }
                            }}
                            disabled={!selectedGalleryId || linkGalleryMutation.isPending}
                            data-testid="button-link-gallery"
                          >
                            {linkGalleryMutation.isPending ? "Linking..." : "Link Gallery"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* External Gallery Platform Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>External Gallery Platform</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(project as any)?.galleryUrl ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Camera className="w-5 h-5 text-green-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium text-green-800 dark:text-green-200">Gallery Created</p>
                              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                {(project as any).galleryReady 
                                  ? "Gallery has been shared with client" 
                                  : "Gallery folder is ready for photos"}
                              </p>
                              <div className="mt-3 flex items-center gap-2">
                                <Input 
                                  value={(project as any).galleryUrl} 
                                  readOnly 
                                  className="flex-1 text-sm"
                                  data-testid="input-gallery-url"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText((project as any).galleryUrl);
                                    toast({ title: "Gallery link copied!" });
                                  }}
                                  data-testid="button-copy-gallery-url"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open((project as any).galleryUrl, '_blank')}
                                  data-testid="button-open-gallery"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {!(project as any).galleryReady && (
                          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div>
                              <p className="font-medium text-blue-800 dark:text-blue-200">Ready to share?</p>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                Mark gallery as ready to send the link to your client
                              </p>
                            </div>
                            <Button
                              onClick={() => shareGalleryMutation.mutate()}
                              disabled={shareGalleryMutation.isPending}
                              data-testid="button-share-gallery"
                            >
                              {shareGalleryMutation.isPending ? "Sharing..." : "Share Gallery"}
                            </Button>
                          </div>
                        )}

                        {(project as any).galleryReady && (
                          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>Shared {(project as any).gallerySharedAt ? formatDate((project as any).gallerySharedAt) : 'recently'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center py-8">
                          <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <h3 className="font-medium mb-2">No Gallery Created Yet</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Create a gallery folder or add a link manually
                          </p>
                          <div className="flex flex-col gap-3 max-w-md mx-auto">
                            <Button
                              onClick={() => createGalleryMutation.mutate()}
                              disabled={createGalleryMutation.isPending}
                              data-testid="button-create-gallery"
                              className="w-full"
                            >
                              {createGalleryMutation.isPending ? "Creating..." : "Auto-Create Gallery"}
                            </Button>
                            {!isEditingGalleryUrl ? (
                              <Button
                                variant="outline"
                                onClick={() => setIsEditingGalleryUrl(true)}
                                data-testid="button-add-manual-gallery"
                                className="w-full"
                              >
                                Add Gallery Link Manually
                              </Button>
                            ) : (
                              <div className="flex gap-2">
                                <Input
                                  placeholder="https://..."
                                  value={manualGalleryUrl}
                                  onChange={(e) => setManualGalleryUrl(e.target.value)}
                                  data-testid="input-manual-gallery-url"
                                />
                                <Button
                                  onClick={() => updateGalleryUrlMutation.mutate(manualGalleryUrl)}
                                  disabled={!manualGalleryUrl || updateGalleryUrlMutation.isPending}
                                  data-testid="button-save-manual-gallery"
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setIsEditingGalleryUrl(false);
                                    setManualGalleryUrl("");
                                  }}
                                  data-testid="button-cancel-manual-gallery"
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-start gap-2">
                            <LinkIcon className="w-4 h-4 text-blue-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-blue-800 dark:text-blue-200">Automatic gallery creation</p>
                              <p className="text-blue-700 dark:text-blue-300 mt-1">
                                Galleries are automatically created when clients pay their deposit. Configure your gallery platform in Settings → Integrations.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="details" className="m-0">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium">
                        {getContactInfo(project)?.firstName} {getContactInfo(project)?.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Mail className="w-4 h-4" />
                        <span>{getContactInfo(project)?.email}</span>
                      </div>
                      {getContactInfo(project)?.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Phone className="w-4 h-4" />
                          <span>{getContactInfo(project)?.phone}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Client Portal Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium">Client portal</CardTitle>
                <Settings className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span className="text-sm text-muted-foreground truncate flex-1">
                    https://lazyphotog.com/p/{project.id.slice(0, 8)}...
                  </span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/p/${project.id}`);
                        toast({ title: "Link copied to clipboard" });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Include client portal links in files and emails</span>
                  <Switch defaultChecked />
                </div>
                <Button variant="link" className="text-sm p-0 h-auto">
                  What is the client portal?
                </Button>
              </CardContent>
            </Card>

            {/* About This Project Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <CardTitle className="text-sm font-medium">About this project</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Only visible to you and your team
                </p>
                
                {/* Stage */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Stage</Label>
                  <Select 
                    value={project.stage?.id || ''} 
                    onValueChange={(value) => updateProjectMutation.mutate({ stageId: value })}
                  >
                    <SelectTrigger data-testid="select-stage">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages?.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lead Source */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Lead Source</Label>
                  <Select 
                    value={project.leadSource || ''} 
                    onValueChange={(value) => updateProjectMutation.mutate({ leadSource: value })}
                  >
                    <SelectTrigger data-testid="select-lead-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="Client Referral">Client Referral</SelectItem>
                      <SelectItem value="Vendor Referral">Vendor Referral</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {project.leadSource === 'Client Referral' && (
                    <Input 
                      placeholder="Who's your referral?"
                      value={project.referralName || ''}
                      onChange={(e) => updateProjectMutation.mutate({ referralName: e.target.value })}
                      className="mt-2"
                      data-testid="input-referral-name"
                    />
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tags</Label>
                  <Select>
                    <SelectTrigger data-testid="select-tags">
                      <SelectValue placeholder="Add tags..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="follow-up">Follow Up</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage company tags
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isAddingParticipant} onOpenChange={setIsAddingParticipant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Participant</DialogTitle>
            <DialogDescription>
              Add a participant to this project. They will receive automated emails.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="participant-email">Email Address</Label>
              <Input
                id="participant-email"
                type="email"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                placeholder="participant@example.com"
                data-testid="input-participant-email"
              />
            </div>
            <Button 
              onClick={() => addParticipantMutation.mutate(participantEmail)}
              disabled={!participantEmail || addParticipantMutation.isPending}
              data-testid="button-add-participant-submit"
            >
              Add Participant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={attachSmartFileOpen} onOpenChange={setAttachSmartFileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Smart File</DialogTitle>
            <DialogDescription>
              Select a Smart File to attach to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedSmartFileId} onValueChange={setSelectedSmartFileId}>
              <SelectTrigger data-testid="select-smart-file">
                <SelectValue placeholder="Select Smart File" />
              </SelectTrigger>
              <SelectContent>
                {allSmartFiles?.map((sf) => (
                  <SelectItem key={sf.id} value={sf.id}>
                    {sf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => attachSmartFileMutation.mutate(selectedSmartFileId)}
              disabled={!selectedSmartFileId || attachSmartFileMutation.isPending}
              data-testid="button-attach-submit"
            >
              Attach
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sendFileDialogOpen} onOpenChange={setSendFileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Smart File</DialogTitle>
            <DialogDescription>
              Select a Smart File template to send to the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="send-file-template">Smart File Template</Label>
              <Select value={sendFileTemplateId} onValueChange={setSendFileTemplateId}>
                <SelectTrigger id="send-file-template" data-testid="select-send-file-template">
                  <SelectValue placeholder="Select Template" />
                </SelectTrigger>
                <SelectContent>
                  {allSmartFiles?.map((sf) => (
                    <SelectItem key={sf.id} value={sf.id}>
                      {sf.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="send-method">Delivery Method</Label>
              <Select value={sendFileMethod} onValueChange={(v) => setSendFileMethod(v as "email" | "sms")}>
                <SelectTrigger id="send-method" data-testid="select-send-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => sendFileFromTemplateMutation.mutate({ templateId: sendFileTemplateId, method: sendFileMethod })}
              disabled={!sendFileTemplateId || sendFileFromTemplateMutation.isPending}
              data-testid="button-send-file-submit"
            >
              {sendFileFromTemplateMutation.isPending ? "Sending..." : "Send File"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              Send an email to the project contact{participants && participants.length > 0 ? ' and participants' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="message-subject">Subject</Label>
              <Input
                id="message-subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Email subject"
                data-testid="input-message-subject"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="message-body">Message</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAiModalType("email");
                    setShowAiModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7"
                  data-testid="button-edit-email-with-ai"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Write with AI
                </Button>
              </div>
              <Textarea
                id="message-body"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Email body"
                rows={8}
                data-testid="textarea-message-body"
              />
            </div>
            {participants && participants.length > 0 && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="send-to-participants"
                  checked={sendToParticipants}
                  onCheckedChange={setSendToParticipants}
                />
                <Label htmlFor="send-to-participants">
                  Also send to participants
                </Label>
              </div>
            )}
            <Button 
              onClick={() => {
                const recipients: string[] = [];
                const mainContact = getContactInfo(project);
                if (mainContact?.email) recipients.push(mainContact.email);
                if (sendToParticipants && participants) {
                  participants.forEach(p => {
                    if (p.client.email && !recipients.includes(p.client.email)) {
                      recipients.push(p.client.email);
                    }
                  });
                }
                sendEmailMutation.mutate({ subject: messageSubject, body: messageBody, recipients });
              }}
              disabled={!messageSubject || !messageBody || sendEmailMutation.isPending}
              data-testid="button-send-email"
            >
              Send Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMS Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send SMS</DialogTitle>
            <DialogDescription>
              Send an SMS message to {project?.contact?.firstName || project?.client?.firstName} {project?.contact?.lastName || project?.client?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="sms-body">Message</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAiModalType("sms");
                    setShowAiModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7"
                  data-testid="button-edit-sms-with-ai"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Write with AI
                </Button>
              </div>
              <Textarea
                id="sms-body"
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                placeholder="Type your message here..."
                rows={6}
                maxLength={1000}
                data-testid="textarea-sms-body"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {smsBody.length}/1000 characters
              </div>
            </div>
            <Button 
              onClick={() => {
                const mainContact = getContactInfo(project);
                const recipient = mainContact?.phone || '';
                if (!recipient) {
                  toast({
                    title: "No phone number",
                    description: "The contact doesn't have a phone number.",
                    variant: "destructive"
                  });
                  return;
                }
                sendSMSMutation.mutate({ body: smsBody, recipient });
              }}
              disabled={!smsBody || sendSMSMutation.isPending}
              className="w-full"
              data-testid="button-send-sms"
            >
              {sendSMSMutation.isPending ? "Sending..." : "Send SMS"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Meeting Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule a Meeting</DialogTitle>
            <DialogDescription>
              Schedule a meeting with {project?.contact?.firstName || project?.client?.firstName} {project?.contact?.lastName || project?.client?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="meeting-title">Meeting Title</Label>
              <Input
                id="meeting-title"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g., Initial Consultation"
                data-testid="input-meeting-title"
              />
            </div>
            
            <div>
              <Label htmlFor="meeting-date">Date</Label>
              <Input
                id="meeting-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                data-testid="input-meeting-date"
              />
            </div>

            <div>
              <Label htmlFor="meeting-time">Time</Label>
              <Input
                id="meeting-time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                data-testid="input-meeting-time"
              />
            </div>

            <div>
              <Label htmlFor="meeting-duration">Duration (minutes)</Label>
              <Select value={meetingDuration} onValueChange={setMeetingDuration}>
                <SelectTrigger id="meeting-duration" data-testid="select-meeting-duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => {
                if (!project || !selectedDate || !selectedTime || !meetingTitle) return;
                
                const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
                const endDateTime = new Date(startDateTime.getTime() + parseInt(meetingDuration) * 60000);
                
                createBookingMutation.mutate({
                  title: meetingTitle,
                  startAt: startDateTime.toISOString(),
                  endAt: endDateTime.toISOString(),
                  projectId: project.id,
                  clientId: project.contact?.id || project.client?.id || project.contactId || ''
                });
              }}
              disabled={!meetingTitle || !selectedDate || !selectedTime || createBookingMutation.isPending}
              className="w-full"
              data-testid="button-schedule-submit"
            >
              {createBookingMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!smartFileToSend} onOpenChange={() => setSmartFileToSend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Smart File to Client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send "{smartFileToSend?.smartFileName}" to the client via email. They will receive a link to view and interact with the Smart File.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => smartFileToSend && sendSmartFileMutation.mutate(smartFileToSend.id)}
              data-testid="button-confirm-send"
            >
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pendingSmartFileToSend && (
        <PhotographerSignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          projectId={project.id}
          projectSmartFileId={pendingSmartFileToSend.id}
          contractPage={contractPageToSign}
          projectData={{
            clientName: `${getContactInfo(project)?.firstName || ''} ${getContactInfo(project)?.lastName || ''}`,
            photographerName: user?.photographerName || '',
            projectTitle: project.title,
            projectType: project.projectType,
            eventDate: project.eventDate || null,
            selectedPackages: '',
            selectedAddOns: '',
            totalAmount: '',
            depositAmount: '',
            depositPercent: ''
          }}
          onSignatureComplete={() => {
            if (pendingSmartFileToSend) {
              sendSmartFileMutation.mutate(pendingSmartFileToSend.id);
            }
            setSignatureDialogOpen(false);
            setContractPageToSign(null);
            setPendingSmartFileToSend(null);
          }}
        />
      )}

      {/* Link Insertion Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-insert-link">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Add a hyperlink to your email message.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="link-text">Link Text</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Click here"
                data-testid="input-link-text"
              />
            </div>
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                data-testid="input-link-url"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowLinkDialog(false);
                setLinkText("");
                setLinkUrl("");
              }}
              data-testid="button-cancel-link"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (linkUrl && linkText) {
                  const linkMarkdown = `[${linkText}](${linkUrl})`;
                  setMessageBody(messageBody + linkMarkdown);
                  setShowLinkDialog(false);
                  setLinkText("");
                  setLinkUrl("");
                }
              }}
              disabled={!linkUrl || !linkText}
              className="bg-black text-white hover:bg-black/90"
              data-testid="button-insert-link-confirm"
            >
              Insert Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Conversational Assistant (Email & SMS) */}
      <Dialog 
        open={showAiModal} 
        onOpenChange={(open) => {
          setShowAiModal(open);
          if (!open) {
            // Reset on close
            setConversationHistory([]);
            setAiIsReady(false);
            setGeneratedContent(null);
            setAiPrompt("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col" data-testid="dialog-ai-writer">
          <DialogHeader>
            <DialogTitle>AI Assistant - {aiModalType === 'email' ? 'Email' : 'SMS'} Draft</DialogTitle>
            <DialogDescription>
              Tell me what you want to say, and I'll ask questions if I need more details.
            </DialogDescription>
          </DialogHeader>

          {/* Portal Links Toggle - Only for emails */}
          {aiModalType === 'email' && (
            <div className="flex items-center justify-between px-1 py-2 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex flex-col gap-1">
                <Label htmlFor="portal-links-toggle" className="text-sm font-medium">
                  Include portal links
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically add a magic link for clients to access their project
                </p>
              </div>
              <Switch
                id="portal-links-toggle"
                checked={includePortalLinks}
                onCheckedChange={(checked) => {
                  setIncludePortalLinks(checked);
                  updateProjectMutation.mutate({ includePortalLinks: checked });
                }}
                data-testid="switch-portal-links"
              />
            </div>
          )}
          
          {/* Chat conversation area */}
          <div className="flex-1 overflow-y-auto space-y-3 py-4 px-1">
            {conversationHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div className="space-y-2">
                  <Sparkles className="w-12 h-12 mx-auto text-blue-500" />
                  <p className="text-sm">Start a conversation with AI</p>
                  <p className="text-xs">Tell me what you want to communicate to your client</p>
                </div>
              </div>
            ) : (
              conversationHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`chat-message-${msg.role}-${idx}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            
            {/* Show generated content preview if ready */}
            {aiIsReady && generatedContent && (
              <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50" data-testid="generated-content-preview">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Draft Ready!</span>
                </div>
                {aiModalType === 'email' && generatedContent.subject && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-600">Subject:</span>
                    <p className="text-sm font-semibold">{generatedContent.subject}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-medium text-gray-600">Message:</span>
                  <p className="text-sm whitespace-pre-wrap">{generatedContent.body}</p>
                </div>
              </div>
            )}
            
            {conversationalAIMutation.isPending && (
              <div className="flex justify-start" data-testid="ai-typing-indicator">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendAIMessage();
                  }
                }}
                placeholder={
                  conversationHistory.length === 0
                    ? aiModalType === "email"
                      ? "E.g., Tell them their gallery is ready to view"
                      : "E.g., Confirm meeting tomorrow at 2pm"
                    : "Type your response..."
                }
                disabled={conversationalAIMutation.isPending || aiIsReady}
                className="flex-1"
                maxLength={500}
                data-testid="input-ai-chat"
              />
              <Button
                onClick={handleSendAIMessage}
                disabled={!aiPrompt.trim() || conversationalAIMutation.isPending || aiIsReady}
                className="bg-blue-600 text-white hover:bg-blue-700"
                data-testid="button-send-ai-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {aiPrompt.length}/500
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAiModal(false);
                    setConversationHistory([]);
                    setAiIsReady(false);
                    setGeneratedContent(null);
                    setAiPrompt("");
                  }}
                  data-testid="button-cancel-ai"
                >
                  Cancel
                </Button>
                {aiIsReady && (
                  <Button
                    onClick={handleUseGeneratedContent}
                    className="bg-green-600 text-white hover:bg-green-700"
                    data-testid="button-use-draft"
                  >
                    Use This Draft
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
