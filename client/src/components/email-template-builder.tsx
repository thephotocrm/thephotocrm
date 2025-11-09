import { useState, useRef, useEffect } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GripVertical,
  Type,
  AlignLeft,
  MoveVertical,
  Image as ImageIcon,
  MousePointerClick,
  Trash2,
  Plus,
  ChevronDown,
  Edit,
  Crown,
  PenLine
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { generateEmailHeader, generateEmailSignature } from "@shared/email-branding-shared";

export type ContentBlock = {
  id: string;
  type: 'HEADING' | 'TEXT' | 'BUTTON' | 'IMAGE' | 'SPACER' | 'HEADER' | 'SIGNATURE';
  content: any;
};

type ButtonLinkType = 'CUSTOM' | 'SMART_FILE' | 'GALLERY' | 'CALENDAR';

const BLOCK_TYPES = {
  HEADING: { icon: Type, label: 'Heading' },
  TEXT: { icon: AlignLeft, label: 'Text' },
  BUTTON: { icon: MousePointerClick, label: 'Button' },
  IMAGE: { icon: ImageIcon, label: 'Image' },
  SPACER: { icon: MoveVertical, label: 'Spacer' },
  HEADER: { icon: Crown, label: 'Email Header' },
  SIGNATURE: { icon: PenLine, label: 'Email Signature' }
} as const;

const VARIABLES = [
  { value: '{{first_name}}', label: 'First Name' },
  { value: '{{last_name}}', label: 'Last Name' },
  { value: '{{full_name}}', label: 'Full Name' },
  { value: '{{email}}', label: 'Email Address' },
  { value: '{{phone}}', label: 'Phone Number' },
  { value: '{{project_type}}', label: 'Project Type' },
  { value: '{{event_date}}', label: 'Event Date' },
  { value: '{{business_name}}', label: 'Business Name' },
  { value: '{{photographer_name}}', label: 'Photographer Name' },
];

const HEADER_STYLES = [
  { value: 'simple', label: 'Simple', description: 'Clean text-based header' },
  { value: 'professional', label: 'Professional', description: 'Logo with business name' },
  { value: 'bold', label: 'Bold', description: 'Large logo with brand colors' },
];

const SIGNATURE_STYLES = [
  { value: 'simple', label: 'Simple', description: 'Clean text-based signature' },
  { value: 'professional', label: 'Professional', description: 'Includes headshot and social icons' },
  { value: 'minimal', label: 'Minimal', description: 'Just name and contact info' },
];

function HeaderBlockEditor({ style, onStyleChange }: { style: string; onStyleChange: (style: string) => void }) {
  const { data: photographer } = useQuery({
    queryKey: ['/api/photographers/me']
  });

  const brandingData = photographer ? {
    businessName: photographer.businessName,
    photographerName: photographer.photographerName,
    logoUrl: photographer.logoUrl,
    headshotUrl: photographer.headshotUrl,
    brandPrimary: photographer.brandPrimary,
    brandSecondary: photographer.brandSecondary,
    phone: photographer.phone,
    email: photographer.email,
    website: photographer.website,
    businessAddress: photographer.businessAddress,
    socialLinks: photographer.socialLinks
  } : undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Header Style</Label>
        <Select value={style} onValueChange={onStyleChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HEADER_STYLES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {brandingData && (
        <div className="border rounded-md overflow-hidden bg-muted/30">
          <div dangerouslySetInnerHTML={{ __html: generateEmailHeader(style, brandingData) }} />
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Header pulls from your Email Settings. Edit your logo and branding there.
      </p>
    </div>
  );
}

function SignatureBlockEditor({ style, onStyleChange }: { style: string; onStyleChange: (style: string) => void }) {
  const { data: photographer } = useQuery({
    queryKey: ['/api/photographers/me']
  });

  const brandingData = photographer ? {
    businessName: photographer.businessName,
    photographerName: photographer.photographerName,
    logoUrl: photographer.logoUrl,
    headshotUrl: photographer.headshotUrl,
    brandPrimary: photographer.brandPrimary,
    brandSecondary: photographer.brandSecondary,
    phone: photographer.phone,
    email: photographer.email,
    website: photographer.website,
    businessAddress: photographer.businessAddress,
    socialLinks: photographer.socialLinks
  } : undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Signature Style</Label>
        <Select value={style} onValueChange={onStyleChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIGNATURE_STYLES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {brandingData && (
        <div className="border rounded-md overflow-hidden bg-muted/30">
          <div dangerouslySetInnerHTML={{ __html: generateEmailSignature(style, brandingData) }} />
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Signature pulls from your Email Settings. Edit your contact info and photo there.
      </p>
    </div>
  );
}

function BlockEditor({
  block,
  onUpdate,
  onDelete
}: {
  block: ContentBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
}) {
  const [localContent, setLocalContent] = useState(block.content);
  const dragControls = useDragControls();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalContent(block.content);
  }, [block.id, block.content]);

  const handleBlur = () => {
    if (JSON.stringify(localContent) !== JSON.stringify(block.content)) {
      onUpdate(localContent);
    }
  };

  const insertVariable = (variable: string, fieldName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = localContent[fieldName] || '';
    const newText = currentText.substring(0, start) + variable + currentText.substring(end);
    
    setLocalContent({ ...localContent, [fieldName]: newText });
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + variable.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Fetch Smart Files for button link selector
  const { data: smartFiles = [] } = useQuery({
    queryKey: ["/api/smart-files"],
    enabled: block.type === 'BUTTON'
  });

  // Fetch Projects (with galleries) for button link selector
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    enabled: block.type === 'BUTTON'
  });

  const { data: photographerData } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: block.type === 'BUTTON'
  }) as { data: { publicToken?: string } | undefined };

  const galleriesWithUrl = (projects as any[]).filter(p => p.galleryUrl);

  return (
    <Reorder.Item
      value={block}
      id={block.id}
      dragListener={false}
      dragControls={dragControls}
      className="mb-3"
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing pt-2"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            
            <div className="flex-1">
              {block.type === 'HEADING' && (
                <div className="space-y-2">
                  <Input
                    value={localContent?.text || ''}
                    onChange={(e) => {
                      const updated = { ...localContent, text: e.target.value };
                      setLocalContent(updated);
                      onUpdate(updated);
                    }}
                    placeholder="Enter heading text..."
                    className="text-lg font-semibold"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="w-3 h-3 mr-1" />
                        Insert Variable
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {VARIABLES.map((variable) => (
                        <DropdownMenuItem
                          key={variable.value}
                          onClick={() => {
                            const input = document.activeElement as HTMLInputElement;
                            const currentText = localContent?.text || '';
                            const newText = currentText + variable.value;
                            setLocalContent({ ...localContent, text: newText });
                            onUpdate({ ...localContent, text: newText });
                          }}
                        >
                          <span className="text-xs font-mono text-muted-foreground mr-2">
                            {variable.value}
                          </span>
                          {variable.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {block.type === 'TEXT' && (
                <div className="space-y-2">
                  <Textarea
                    ref={textareaRef}
                    value={localContent?.text || ''}
                    onChange={(e) => {
                      const updated = { ...localContent, text: e.target.value };
                      setLocalContent(updated);
                      onUpdate(updated);
                    }}
                    placeholder="Enter text content..."
                    rows={4}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="w-3 h-3 mr-1" />
                        Insert Variable
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {VARIABLES.map((variable) => (
                        <DropdownMenuItem
                          key={variable.value}
                          onClick={() => insertVariable(variable.value, 'text')}
                        >
                          <span className="text-xs font-mono text-muted-foreground mr-2">
                            {variable.value}
                          </span>
                          {variable.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {block.type === 'BUTTON' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Button Text</Label>
                      <Input
                        value={localContent?.text || ''}
                        onChange={(e) => {
                          const updated = { ...localContent, text: e.target.value };
                          setLocalContent(updated);
                          onUpdate(updated);
                        }}
                        placeholder="Click Here"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Button Style</Label>
                      <Select
                        value={localContent?.variant || 'default'}
                        onValueChange={(value) => {
                          const updated = { ...localContent, variant: value };
                          setLocalContent(updated);
                          onUpdate(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Primary</SelectItem>
                          <SelectItem value="secondary">Secondary</SelectItem>
                          <SelectItem value="outline">Outline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Link To</Label>
                    <Select
                      value={localContent?.linkType || 'CUSTOM'}
                      onValueChange={(value: ButtonLinkType) => {
                        const updated = { ...localContent, linkType: value, linkValue: '' };
                        setLocalContent(updated);
                        onUpdate(updated);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUSTOM">Custom URL</SelectItem>
                        <SelectItem value="SMART_FILE">Smart File</SelectItem>
                        <SelectItem value="GALLERY">Gallery</SelectItem>
                        <SelectItem value="CALENDAR">Booking Calendar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {localContent?.linkType === 'CUSTOM' && (
                    <div className="space-y-1">
                      <Label className="text-xs">URL</Label>
                      <Input
                        value={localContent?.linkValue || ''}
                        onChange={(e) => {
                          const updated = { ...localContent, linkValue: e.target.value };
                          setLocalContent(updated);
                          onUpdate(updated);
                        }}
                        onBlur={handleBlur}
                        placeholder="https://example.com"
                        data-testid={`input-custom-url-${block.id}`}
                      />
                    </div>
                  )}

                  {localContent?.linkType === 'SMART_FILE' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Select Smart File</Label>
                      <Select
                        value={localContent?.linkValue || ''}
                        onValueChange={(value) => {
                          const updated = { ...localContent, linkValue: value };
                          setLocalContent(updated);
                          onUpdate(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a Smart File" />
                        </SelectTrigger>
                        <SelectContent>
                          {smartFiles.map((sf: any) => (
                            <SelectItem key={sf.id} value={sf.id}>
                              {sf.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {localContent?.linkType === 'GALLERY' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Select Gallery</Label>
                      {galleriesWithUrl.length > 0 ? (
                        <Select
                          value={localContent?.linkValue || ''}
                          onValueChange={(value) => {
                            const updated = { ...localContent, linkValue: value };
                            setLocalContent(updated);
                            onUpdate(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a Gallery" />
                          </SelectTrigger>
                          <SelectContent>
                            {galleriesWithUrl.map((project: any) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.title} Gallery
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                          ⚠ No galleries available. Create galleries on the Galleries page first.
                        </div>
                      )}
                    </div>
                  )}

                  {localContent?.linkType === 'CALENDAR' && (
                    photographerData?.publicToken ? (
                      <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                        ✓ Will link to your public booking calendar
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                        ⚠ Set up your booking calendar in Settings → Scheduling to enable this link
                      </div>
                    )
                  )}
                </div>
              )}

              {block.type === 'IMAGE' && (
                <div className="space-y-2">
                  <Input
                    value={localContent?.url || ''}
                    onChange={(e) => {
                      const updated = { ...localContent, url: e.target.value };
                      setLocalContent(updated);
                      onUpdate(updated);
                    }}
                    placeholder="Image URL"
                  />
                  {localContent?.url && (
                    <img src={localContent.url} alt="Preview" className="max-w-full h-auto rounded" />
                  )}
                </div>
              )}

              {block.type === 'SPACER' && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Spacer Size</Label>
                  <Select
                    value={localContent?.size || 'medium'}
                    onValueChange={(value) => {
                      const heightMap = { small: 20, medium: 40, large: 60 };
                      const updated = { 
                        ...localContent, 
                        size: value,
                        height: heightMap[value as keyof typeof heightMap] || 40
                      };
                      setLocalContent(updated);
                      onUpdate(updated);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {block.type === 'HEADER' && (
                <HeaderBlockEditor
                  style={localContent?.style || 'professional'}
                  onStyleChange={(style) => {
                    const updated = { ...localContent, style };
                    setLocalContent(updated);
                    onUpdate(updated);
                  }}
                />
              )}

              {block.type === 'SIGNATURE' && (
                <SignatureBlockEditor
                  style={localContent?.style || 'professional'}
                  onStyleChange={(style) => {
                    const updated = { ...localContent, style };
                    setLocalContent(updated);
                    onUpdate(updated);
                  }}
                />
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Reorder.Item>
  );
}

interface EmailTemplateBuilderProps {
  blocks: ContentBlock[];
  onBlocksChange: (blocks: ContentBlock[]) => void;
  includeHeader?: boolean;
  headerStyle?: string;
  includeSignature?: boolean;
  signatureStyle?: string;
  onBrandingChange?: (branding: {
    includeHeader: boolean;
    headerStyle: string;
    includeSignature: boolean;
    signatureStyle: string;
  }) => void;
}

export function EmailTemplateBuilder({ 
  blocks, 
  onBlocksChange,
  includeHeader = false,
  headerStyle = 'professional',
  includeSignature = false,
  signatureStyle = 'professional',
  onBrandingChange
}: EmailTemplateBuilderProps) {
  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);

  const { data: photographer } = useQuery({
    queryKey: ['/api/photographers/me']
  });

  const brandingData = photographer ? {
    businessName: photographer.businessName,
    photographerName: photographer.photographerName,
    logoUrl: photographer.logoUrl,
    headshotUrl: photographer.headshotUrl,
    brandPrimary: photographer.brandPrimary,
    brandSecondary: photographer.brandSecondary,
    phone: photographer.phone,
    email: photographer.email,
    website: photographer.website,
    businessAddress: photographer.businessAddress,
    socialLinks: photographer.socialLinks
  } : {
    businessName: 'Your Business Name',
    photographerName: 'Your Name',
    phone: '(555) 123-4567',
    email: 'hello@yourbusiness.com',
    website: 'www.yourbusiness.com'
  };

  const addBlock = (type: ContentBlock['type']) => {
    let content: any;
    
    if (type === 'SPACER') {
      content = { size: 'medium', height: 40 };
    } else if (type === 'BUTTON') {
      content = { text: '', linkType: 'CUSTOM', linkValue: '', variant: 'default' };
    } else if (type === 'HEADER') {
      content = { style: 'professional' };
    } else if (type === 'SIGNATURE') {
      content = { style: 'professional' };
    } else {
      content = { text: '' };
    }
    
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}-${Math.random()}`,
      type,
      content
    };
    onBlocksChange([...blocks, newBlock]);
  };

  const updateBlock = (id: string, content: any) => {
    onBlocksChange(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const deleteBlock = (id: string) => {
    onBlocksChange(blocks.filter(b => b.id !== id));
  };

  const headerStyles = [
    { value: 'minimal', label: 'Minimal', description: 'Clean and simple centered header' },
    { value: 'professional', label: 'Professional', description: 'Centered with bottom border' },
    { value: 'bold', label: 'Bold', description: 'Eye-catching gradient background' },
    { value: 'classic', label: 'Classic', description: 'Traditional layout with text' }
  ];

  const signatureStyles = [
    { value: 'simple', label: 'Simple', description: 'Clean text-based signature' },
    { value: 'professional', label: 'Professional', description: 'Includes headshot and social icons' },
    { value: 'detailed', label: 'Detailed', description: 'Full contact card with all details' },
    { value: 'branded', label: 'Branded', description: 'Brand-focused with color accents' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(BLOCK_TYPES).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <Button
              key={type}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addBlock(type as ContentBlock['type'])}
              data-testid={`button-add-${type.toLowerCase()}`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {config.label}
            </Button>
          );
        })}
      </div>

      {blocks.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No content blocks yet. Click a button above to add your first block.</p>
        </Card>
      ) : (
        <Reorder.Group axis="y" values={blocks} onReorder={onBlocksChange}>
          {blocks.map((block) => (
            <BlockEditor
              key={block.id}
              block={block}
              onUpdate={(content) => updateBlock(block.id, content)}
              onDelete={() => deleteBlock(block.id)}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}
