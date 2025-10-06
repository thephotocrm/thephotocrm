import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  FileText, 
  Package, 
  Plus, 
  DollarSign, 
  GripVertical, 
  Trash, 
  Copy,
  Save,
  Loader2,
  Eye,
  Image as ImageIcon,
  Type,
  AlignLeft,
  MoveVertical,
  Sparkles,
  CheckCircle,
  Camera,
  Shield,
  CreditCard
} from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import type { SmartFileWithPages, SmartFilePage, InsertSmartFilePage } from "@shared/schema";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

// Page type configurations
const PAGE_TYPES = {
  TEXT: {
    icon: FileText,
    label: "Text Page",
    color: "bg-blue-500"
  },
  PACKAGE: {
    icon: Package,
    label: "Package Selection",
    color: "bg-purple-500"
  },
  ADDON: {
    icon: Plus,
    label: "Add-ons",
    color: "bg-green-500"
  },
  PAYMENT: {
    icon: DollarSign,
    label: "Payment",
    color: "bg-orange-500"
  }
} as const;

type PageType = keyof typeof PAGE_TYPES;

// Type definitions for page content
type ImageContent = {
  url: string;
  borderRadius?: 'straight' | 'rounded';
  size?: 'small' | 'medium' | 'large';
};

type ContentBlock = {
  id: string;
  type: 'HEADING' | 'TEXT' | 'SPACER' | 'IMAGE';
  content: any; // string for HEADING/TEXT, null for SPACER, ImageContent for IMAGE
  column?: number; // For 2-column sections: 0 (left) or 1 (right)
};

type Section = {
  id: string;
  columns: 1 | 2;
  blocks: ContentBlock[];
};

type HeroSection = {
  backgroundImage?: string;
  title?: string;
  description?: string;
};

type TextPageContent = {
  hero?: HeroSection;
  sections?: Section[];
  // Legacy fields (for backwards compatibility)
  blocks?: ContentBlock[];
  heading?: string;
  content?: string;
};

type PackagePageContent = {
  heading: string;
  description: string;
  packageIds: string[];
};

type AddOnPageContent = {
  heading: string;
  description: string;
  items: {
    name: string;
    description: string;
    priceCents: number;
  }[];
};

type PaymentPageContent = {
  heading: string;
  description: string;
  depositPercent: number;
  paymentTerms: string;
  acceptOnlinePayments: boolean;
};

// Block types for text pages
const BLOCK_TYPES = {
  HEADING: { icon: Type, label: 'Heading', placeholder: 'Enter heading...' },
  TEXT: { icon: AlignLeft, label: 'Text', placeholder: 'Enter text content...' },
  SPACER: { icon: MoveVertical, label: 'Spacer', placeholder: '' },
  IMAGE: { icon: ImageIcon, label: 'Image', placeholder: '' }
} as const;

// Block Editor Component
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

  useEffect(() => {
    setLocalContent(block.content);
  }, [block.id, block.content]);

  const handleBlur = () => {
    if (JSON.stringify(localContent) !== JSON.stringify(block.content)) {
      onUpdate(localContent);
    }
  };

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
                <Input
                  value={localContent || ''}
                  onChange={(e) => setLocalContent(e.target.value)}
                  onBlur={handleBlur}
                  placeholder={BLOCK_TYPES.HEADING.placeholder}
                  className="text-lg font-semibold"
                  data-testid={`block-heading-${block.id}`}
                />
              )}
              
              {block.type === 'TEXT' && (
                <Textarea
                  value={localContent || ''}
                  onChange={(e) => setLocalContent(e.target.value)}
                  onBlur={handleBlur}
                  placeholder={BLOCK_TYPES.TEXT.placeholder}
                  rows={4}
                  data-testid={`block-text-${block.id}`}
                />
              )}
              
              {block.type === 'SPACER' && (
                <div className="py-4 border-t-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Spacer</span>
                </div>
              )}
              
              {block.type === 'IMAGE' && (
                <div className="space-y-3">
                  {/* Handle legacy string format and convert to ImageContent */}
                  {(() => {
                    const imageData: ImageContent = typeof localContent === 'string' 
                      ? { url: localContent, borderRadius: 'straight', size: 'medium' }
                      : (localContent || { url: '', borderRadius: 'straight', size: 'medium' });
                    
                    const updateImageData = (updates: Partial<ImageContent>) => {
                      const newData = { ...imageData, ...updates };
                      setLocalContent(newData);
                      onUpdate(newData);
                    };

                    return !imageData.url ? (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <Label
                          htmlFor={`image-upload-${block.id}`}
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-primary hover:underline">
                              Click to upload image
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">
                              PNG, JPG, GIF up to 10MB
                            </p>
                          </div>
                        </Label>
                        <input
                          id={`image-upload-${block.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                updateImageData({ url: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <img 
                            src={imageData.url} 
                            alt="Uploaded" 
                            className={cn(
                              "w-full object-cover border",
                              imageData.borderRadius === 'rounded' ? 'rounded-full aspect-square' : 'rounded-none object-contain',
                              imageData.size === 'small' ? 'max-h-32 max-w-32' : imageData.size === 'large' ? 'max-h-96 max-w-96' : 'max-h-48 max-w-48'
                            )} 
                          />
                          <div className="flex gap-2 mt-2">
                            <Label
                              htmlFor={`image-upload-${block.id}`}
                              className="cursor-pointer text-sm text-primary hover:underline"
                            >
                              Change Image
                            </Label>
                            <input
                              id={`image-upload-${block.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    updateImageData({ url: reader.result as string });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* Image Options */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Border Radius</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={imageData.borderRadius === 'straight' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateImageData({ borderRadius: 'straight' })}
                                className="flex-1"
                                data-testid={`button-border-straight-${block.id}`}
                              >
                                Straight
                              </Button>
                              <Button
                                type="button"
                                variant={imageData.borderRadius === 'rounded' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateImageData({ borderRadius: 'rounded' })}
                                className="flex-1"
                                data-testid={`button-border-rounded-${block.id}`}
                              >
                                Rounded
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Size</Label>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant={imageData.size === 'small' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateImageData({ size: 'small' })}
                                className="flex-1 text-xs"
                                data-testid={`button-size-small-${block.id}`}
                              >
                                S
                              </Button>
                              <Button
                                type="button"
                                variant={imageData.size === 'medium' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateImageData({ size: 'medium' })}
                                className="flex-1 text-xs"
                                data-testid={`button-size-medium-${block.id}`}
                              >
                                M
                              </Button>
                              <Button
                                type="button"
                                variant={imageData.size === 'large' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateImageData({ size: 'large' })}
                                className="flex-1 text-xs"
                                data-testid={`button-size-large-${block.id}`}
                              >
                                L
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                data-testid={`button-delete-block-${block.id}`}
              >
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Reorder.Item>
  );
}

// Section Editor Component
function SectionEditor({
  section,
  onUpdate,
  onDelete,
  dragControls
}: {
  section: Section;
  onUpdate: (section: Section) => void;
  onDelete: () => void;
  dragControls: ReturnType<typeof useDragControls>;
}) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(section.blocks || []);

  useEffect(() => {
    setBlocks(section.blocks || []);
  }, [section.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onUpdate({ ...section, blocks });
    }, 300);
    return () => clearTimeout(timeout);
  }, [blocks]);

  const addBlock = (type: ContentBlock['type'], column?: number) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: type === 'SPACER' ? null : '',
      column: section.columns === 2 ? column : undefined
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (blockId: string, content: any) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, content } : b));
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
  };

  const handleReorderColumn = (columnIndex: number, newBlocks: ContentBlock[]) => {
    // Replace blocks for this column
    const otherColumnBlocks = blocks.filter(b => b.column !== columnIndex);
    setBlocks([...otherColumnBlocks, ...newBlocks]);
  };

  const handleReorder = (newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks);
  };

  // For 2-column sections, separate blocks by column
  const column0Blocks = section.columns === 2 ? blocks.filter(b => b.column === 0) : [];
  const column1Blocks = section.columns === 2 ? blocks.filter(b => b.column === 1) : [];

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            <Badge variant="outline">
              {section.columns === 1 ? '1 Column' : '2 Columns'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            data-testid={`button-delete-section-${section.id}`}
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {section.columns === 1 ? (
          // 1-Column Layout
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(BLOCK_TYPES).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => addBlock(type as ContentBlock['type'])}
                    data-testid={`button-add-${type.toLowerCase()}-block-${section.id}`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {config.label}
                  </Button>
                );
              })}
            </div>

            {blocks.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground">No blocks yet. Add content above.</p>
              </div>
            ) : (
              <Reorder.Group axis="y" values={blocks} onReorder={handleReorder} className="space-y-3">
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
        ) : (
          // 2-Column Layout
          <div className="grid grid-cols-2 gap-4">
            {/* Column 0 (Left) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">Column 1</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(BLOCK_TYPES).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      onClick={() => addBlock(type as ContentBlock['type'], 0)}
                      data-testid={`button-add-${type.toLowerCase()}-block-col0-${section.id}`}
                      className="text-xs px-2 py-1 h-7"
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Button>
                  );
                })}
              </div>
              {column0Blocks.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground">Add content to column 1</p>
                </div>
              ) : (
                <Reorder.Group 
                  axis="y" 
                  values={column0Blocks} 
                  onReorder={(newBlocks) => handleReorderColumn(0, newBlocks)}
                  className="space-y-3"
                >
                  {column0Blocks.map((block) => (
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

            {/* Column 1 (Right) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">Column 2</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(BLOCK_TYPES).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      onClick={() => addBlock(type as ContentBlock['type'], 1)}
                      data-testid={`button-add-${type.toLowerCase()}-block-col1-${section.id}`}
                      className="text-xs px-2 py-1 h-7"
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Button>
                  );
                })}
              </div>
              {column1Blocks.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground">Add content to column 2</p>
                </div>
              ) : (
                <Reorder.Group 
                  axis="y" 
                  values={column1Blocks} 
                  onReorder={(newBlocks) => handleReorderColumn(1, newBlocks)}
                  className="space-y-3"
                >
                  {column1Blocks.map((block) => (
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hero Section Editor Component
function HeroSectionEditor({
  hero,
  onUpdate
}: {
  hero?: HeroSection;
  onUpdate: (hero?: HeroSection) => void;
}) {
  const [localHero, setLocalHero] = useState<HeroSection | undefined>(hero);
  const [isExpanded, setIsExpanded] = useState(!!hero?.backgroundImage);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onUpdate(localHero);
    }, 300);
    return () => clearTimeout(timeout);
  }, [localHero]);

  if (!isExpanded) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Button
            variant="outline"
            onClick={() => setIsExpanded(true)}
            data-testid="button-add-hero-section"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Add Hero Section
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <span className="font-semibold">Hero Section</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setLocalHero(undefined);
              setIsExpanded(false);
            }}
            data-testid="button-remove-hero-section"
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Background Image Upload */}
        <div className="space-y-2">
          <Label>Background Image</Label>
          {!localHero?.backgroundImage ? (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Label
                htmlFor="hero-background-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <span className="text-sm font-medium text-primary hover:underline">
                    Click to upload background image
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: Wide landscape image (1920x600px)
                  </p>
                </div>
              </Label>
              <input
                id="hero-background-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setLocalHero({ ...localHero, backgroundImage: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          ) : (
            <div className="relative">
              <img 
                src={localHero.backgroundImage} 
                alt="Hero background" 
                className="w-full h-32 object-cover rounded border" 
              />
              <div className="flex gap-2 mt-2">
                <Label
                  htmlFor="hero-background-upload"
                  className="cursor-pointer text-sm text-primary hover:underline"
                >
                  Change Image
                </Label>
                <input
                  id="hero-background-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setLocalHero({ ...localHero, backgroundImage: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <Label>Title (optional)</Label>
          <Input
            value={localHero?.title || ''}
            onChange={(e) => setLocalHero({ ...localHero, title: e.target.value })}
            placeholder="Enter hero title..."
            data-testid="input-hero-title"
          />
        </div>

        {/* Description Input */}
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea
            value={localHero?.description || ''}
            onChange={(e) => setLocalHero({ ...localHero, description: e.target.value })}
            placeholder="Enter hero description..."
            rows={3}
            data-testid="input-hero-description"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Section Item Component (wrapper with drag controls)
function SectionItem({
  section,
  onUpdate,
  onDelete
}: {
  section: Section;
  onUpdate: (section: Section) => void;
  onDelete: () => void;
}) {
  const dragControls = useDragControls();
  
  return (
    <Reorder.Item 
      key={section.id} 
      value={section} 
      dragListener={false}
      dragControls={dragControls}
    >
      <SectionEditor
        section={section}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragControls={dragControls}
      />
    </Reorder.Item>
  );
}

// Text Page Editor Component (Section-based)
function TextPageEditor({ 
  page, 
  onUpdate 
}: { 
  page: SmartFilePage; 
  onUpdate: (content: TextPageContent) => void;
}) {
  const content = page.content as TextPageContent;
  
  // Convert legacy format to sections on load
  const initializeSections = (): Section[] => {
    if (content.sections && content.sections.length > 0) {
      return content.sections;
    }
    
    // Legacy block format conversion
    if (content.blocks && content.blocks.length > 0) {
      return [{
        id: `section-${Date.now()}`,
        columns: 1,
        blocks: content.blocks
      }];
    }
    
    // Legacy heading/content format conversion
    const legacyBlocks: ContentBlock[] = [];
    if (content.heading) {
      legacyBlocks.push({
        id: `block-${Date.now()}-heading`,
        type: 'HEADING',
        content: content.heading
      });
    }
    if (content.content) {
      legacyBlocks.push({
        id: `block-${Date.now()}-text`,
        type: 'TEXT',
        content: content.content
      });
    }
    
    if (legacyBlocks.length > 0) {
      return [{
        id: `section-${Date.now()}`,
        columns: 1,
        blocks: legacyBlocks
      }];
    }
    
    return [];
  };

  const [hero, setHero] = useState<HeroSection | undefined>(content.hero);
  const [sections, setSections] = useState<Section[]>(initializeSections);

  useEffect(() => {
    setHero(content.hero);
    setSections(initializeSections());
  }, [page.id]);

  useEffect(() => {
    // Auto-save hero and sections when they change
    const timeout = setTimeout(() => {
      onUpdate({ hero, sections });
    }, 500);
    return () => clearTimeout(timeout);
  }, [hero, sections]);

  const addSection = (columns: 1 | 2) => {
    const newSection: Section = {
      id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      columns,
      blocks: []
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (sectionId: string, updatedSection: Section) => {
    setSections(sections.map(s => s.id === sectionId ? updatedSection : s));
  };

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const handleReorder = (newSections: Section[]) => {
    setSections(newSections);
  };

  return (
    <div className="space-y-4">
      {/* Hero Section Editor */}
      <HeroSectionEditor hero={hero} onUpdate={setHero} />

      {/* Section Controls */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => addSection(1)}
          data-testid="button-add-1-column-section"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add 1-Column Section
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addSection(2)}
          data-testid="button-add-2-column-section"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add 2-Column Section
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No sections yet. Add a section to get started.</p>
        </div>
      ) : (
        <Reorder.Group axis="y" values={sections} onReorder={handleReorder} className="space-y-4">
          {sections.map((section) => (
            <SectionItem
              key={section.id}
              section={section}
              onUpdate={(updatedSection) => updateSection(section.id, updatedSection)}
              onDelete={() => deleteSection(section.id)}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}

// Package Page Editor Component
function PackagePageEditor({ 
  page, 
  onUpdate 
}: { 
  page: SmartFilePage; 
  onUpdate: (content: PackagePageContent) => void;
}) {
  const content = page.content as PackagePageContent;
  const [localContent, setLocalContent] = useState(content);

  const { data: packages, isLoading } = useQuery<any[]>({
    queryKey: ['/api/packages'],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  useEffect(() => {
    setLocalContent(content);
  }, [page.id]);

  const handleBlur = () => {
    if (JSON.stringify(localContent) !== JSON.stringify(content)) {
      onUpdate(localContent);
    }
  };

  const togglePackage = (packageId: string) => {
    const packageIds = localContent.packageIds || [];
    const newPackageIds = packageIds.includes(packageId)
      ? packageIds.filter(id => id !== packageId)
      : [...packageIds, packageId];
    
    const newContent = { ...localContent, packageIds: newPackageIds };
    setLocalContent(newContent);
    onUpdate(newContent);
  };

  const selectedPackages = packages?.filter(pkg => 
    (localContent.packageIds || []).includes(pkg.id)
  ) || [];

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="package-heading" data-testid="label-package-heading">Heading</Label>
        <Input
          id="package-heading"
          value={localContent.heading || ''}
          onChange={(e) => setLocalContent({ ...localContent, heading: e.target.value })}
          onBlur={handleBlur}
          placeholder="Enter page heading"
          data-testid="input-package-heading"
        />
      </div>
      <div>
        <Label htmlFor="package-description" data-testid="label-package-description">Description</Label>
        <Textarea
          id="package-description"
          value={localContent.description || ''}
          onChange={(e) => setLocalContent({ ...localContent, description: e.target.value })}
          onBlur={handleBlur}
          placeholder="Enter description"
          rows={3}
          data-testid="textarea-package-description"
        />
      </div>
      <Separator />
      <div>
        <Label data-testid="label-packages">Packages</Label>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" data-testid="loading-packages" />
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {packages && packages.length > 0 ? (
              packages.map((pkg) => (
                <Card 
                  key={pkg.id}
                  className={cn(
                    "cursor-pointer transition-all overflow-hidden",
                    (localContent.packageIds || []).includes(pkg.id) 
                      ? "border-2 border-primary bg-primary/5" 
                      : "border hover:border-primary/50"
                  )}
                  onClick={() => togglePackage(pkg.id)}
                  data-testid={`card-package-${pkg.id}`}
                >
                  {pkg.imageUrl && (
                    <div className="aspect-video w-full overflow-hidden border-b">
                      <img 
                        src={pkg.imageUrl} 
                        alt={pkg.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base mb-1" data-testid={`text-package-name-${pkg.id}`}>
                          {pkg.name}
                        </p>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2" data-testid={`text-package-description-${pkg.id}`}>
                            {pkg.description}
                          </p>
                        )}
                        <p className="text-base font-semibold text-primary" data-testid={`text-package-price-${pkg.id}`}>
                          ${(pkg.basePriceCents / 100).toFixed(2)}
                        </p>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1",
                        (localContent.packageIds || []).includes(pkg.id) ? "border-primary bg-primary" : "border-muted"
                      )}>
                        {(localContent.packageIds || []).includes(pkg.id) && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-no-packages">
                No packages available. Create packages first.
              </p>
            )}
          </div>
        )}
      </div>
      {selectedPackages.length > 0 && (
        <>
          <Separator />
          <div>
            <Label data-testid="label-selected-packages">Selected Packages ({selectedPackages.length})</Label>
            <div className="space-y-2 mt-2">
              {selectedPackages.map((pkg) => (
                <div 
                  key={pkg.id} 
                  className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg"
                  data-testid={`selected-package-${pkg.id}`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="font-medium">{pkg.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">${(pkg.basePriceCents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Add-on Page Editor Component
function AddOnPageEditor({ 
  page, 
  onUpdate 
}: { 
  page: SmartFilePage; 
  onUpdate: (content: AddOnPageContent) => void;
}) {
  const content = page.content as AddOnPageContent;
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [page.id]);

  const handleBlur = () => {
    if (JSON.stringify(localContent) !== JSON.stringify(content)) {
      onUpdate(localContent);
    }
  };

  const addItem = () => {
    const items = [...(localContent.items || []), { name: '', description: '', priceCents: 0 }];
    const newContent = { ...localContent, items };
    setLocalContent(newContent);
    onUpdate(newContent);
  };

  const removeItem = (index: number) => {
    const items = (localContent.items || []).filter((_, i) => i !== index);
    const newContent = { ...localContent, items };
    setLocalContent(newContent);
    onUpdate(newContent);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...(localContent.items || [])];
    items[index] = { ...items[index], [field]: value };
    setLocalContent({ ...localContent, items });
  };

  const saveItem = () => {
    handleBlur();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="addon-heading" data-testid="label-addon-heading">Heading</Label>
        <Input
          id="addon-heading"
          value={localContent.heading || ''}
          onChange={(e) => setLocalContent({ ...localContent, heading: e.target.value })}
          onBlur={handleBlur}
          placeholder="Enter page heading"
          data-testid="input-addon-heading"
        />
      </div>
      <div>
        <Label htmlFor="addon-description" data-testid="label-addon-description">Description</Label>
        <Textarea
          id="addon-description"
          value={localContent.description || ''}
          onChange={(e) => setLocalContent({ ...localContent, description: e.target.value })}
          onBlur={handleBlur}
          placeholder="Enter description"
          rows={3}
          data-testid="textarea-addon-description"
        />
      </div>
      <Separator />
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label data-testid="label-addon-items">Add-on Items</Label>
          <Button 
            onClick={addItem} 
            size="sm"
            data-testid="button-add-item"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
        <div className="space-y-4">
          {(localContent.items || []).map((item, index) => (
            <Card key={index} data-testid={`card-addon-item-${index}`}>
              <CardContent className="p-4 space-y-3">
                <div>
                  <Label htmlFor={`item-name-${index}`} data-testid={`label-item-name-${index}`}>
                    Name
                  </Label>
                  <Input
                    id={`item-name-${index}`}
                    value={item.name}
                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                    onBlur={saveItem}
                    placeholder="Item name"
                    data-testid={`input-item-name-${index}`}
                  />
                </div>
                <div>
                  <Label htmlFor={`item-description-${index}`} data-testid={`label-item-description-${index}`}>
                    Description
                  </Label>
                  <Input
                    id={`item-description-${index}`}
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    onBlur={saveItem}
                    placeholder="Item description"
                    data-testid={`input-item-description-${index}`}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`item-price-${index}`} data-testid={`label-item-price-${index}`}>
                      Price (USD)
                    </Label>
                    <Input
                      id={`item-price-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={(item.priceCents / 100).toFixed(2)}
                      onChange={(e) => updateItem(index, 'priceCents', Math.round(parseFloat(e.target.value || '0') * 100))}
                      onBlur={saveItem}
                      placeholder="0.00"
                      data-testid={`input-item-price-${index}`}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removeItem(index)}
                    data-testid={`button-remove-item-${index}`}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!localContent.items || localContent.items.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-items">
              No add-on items yet. Click "Add Item" to create one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Payment Page Editor Component
function PaymentPageEditor({ 
  page, 
  onUpdate 
}: { 
  page: SmartFilePage; 
  onUpdate: (content: PaymentPageContent) => void;
}) {
  const content = page.content as PaymentPageContent;
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [page.id]);

  const handleBlur = () => {
    if (JSON.stringify(localContent) !== JSON.stringify(content)) {
      onUpdate(localContent);
    }
  };

  const handleToggle = (checked: boolean) => {
    const newContent = { ...localContent, acceptOnlinePayments: checked };
    setLocalContent(newContent);
    onUpdate(newContent);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="payment-heading" data-testid="label-payment-heading">Heading</Label>
        <Input
          id="payment-heading"
          value={localContent.heading || ''}
          onChange={(e) => setLocalContent({ ...localContent, heading: e.target.value })}
          onBlur={handleBlur}
          placeholder="Enter page heading"
          data-testid="input-payment-heading"
        />
      </div>
      <div>
        <Label htmlFor="payment-description" data-testid="label-payment-description">Description</Label>
        <Textarea
          id="payment-description"
          value={localContent.description || ''}
          onChange={(e) => setLocalContent({ ...localContent, description: e.target.value })}
          onBlur={handleBlur}
          placeholder="Enter description"
          rows={3}
          data-testid="textarea-payment-description"
        />
      </div>
      <div>
        <Label htmlFor="deposit-percent" data-testid="label-deposit-percent">
          Deposit Percentage (%)
        </Label>
        <Input
          id="deposit-percent"
          type="number"
          min="0"
          max="100"
          value={localContent.depositPercent || 0}
          onChange={(e) => setLocalContent({ ...localContent, depositPercent: parseInt(e.target.value || '0') })}
          onBlur={handleBlur}
          placeholder="50"
          data-testid="input-deposit-percent"
        />
      </div>
      <div>
        <Label htmlFor="payment-terms" data-testid="label-payment-terms">Payment Terms</Label>
        <Textarea
          id="payment-terms"
          value={localContent.paymentTerms || ''}
          onChange={(e) => setLocalContent({ ...localContent, paymentTerms: e.target.value })}
          onBlur={handleBlur}
          placeholder="Enter payment terms and conditions"
          rows={4}
          data-testid="textarea-payment-terms"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="accept-online-payments"
          checked={localContent.acceptOnlinePayments || false}
          onCheckedChange={handleToggle}
          data-testid="switch-accept-online-payments"
        />
        <Label htmlFor="accept-online-payments" data-testid="label-accept-online-payments">
          Accept online payments
        </Label>
      </div>
    </div>
  );
}

// Page Card Component for the draggable list
function PageCard({ 
  page, 
  isSelected, 
  onSelect, 
  onDelete, 
  onDuplicate 
}: { 
  page: SmartFilePage; 
  isSelected: boolean; 
  onSelect: () => void; 
  onDelete: () => void; 
  onDuplicate: () => void;
}) {
  const controls = useDragControls();
  const pageConfig = PAGE_TYPES[page.pageType as PageType];
  const Icon = pageConfig?.icon || FileText;

  return (
    <Reorder.Item
      value={page}
      dragListener={false}
      dragControls={controls}
    >
      <Card 
        className={cn(
          "cursor-pointer transition-all mb-2",
          isSelected && "border-primary shadow-md"
        )}
        onClick={onSelect}
        data-testid={`card-page-${page.id}`}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <button
            className="cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={(e) => controls.start(e)}
            data-testid={`button-drag-${page.id}`}
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className={cn("p-2 rounded", pageConfig?.color)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium" data-testid={`text-page-title-${page.id}`}>
              {page.displayTitle}
            </p>
            <p className="text-sm text-muted-foreground" data-testid={`text-page-type-${page.id}`}>
              {pageConfig?.label || page.pageType}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              data-testid={`button-duplicate-${page.id}`}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              data-testid={`button-delete-${page.id}`}
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Reorder.Item>
  );
}

export default function SmartFileBuilder() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pages, setPages] = useState<SmartFilePage[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentPreviewPageIndex, setCurrentPreviewPageIndex] = useState(0);

  const { user } = useAuth();

  const { data: smartFile, isLoading } = useQuery<SmartFileWithPages>({
    queryKey: ["/api/smart-files", id],
    enabled: !!id
  });

  const { data: packages, refetch: refetchPackages } = useQuery<any[]>({
    queryKey: ['/api/packages'],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true
  });

  // Refetch packages when preview opens to ensure fresh data
  useEffect(() => {
    if (isPreviewOpen) {
      refetchPackages();
    }
  }, [isPreviewOpen, refetchPackages]);

  useEffect(() => {
    if (smartFile?.pages) {
      const sortedPages = [...smartFile.pages].sort((a, b) => a.pageOrder - b.pageOrder);
      setPages(sortedPages);
      if (!selectedPageId && sortedPages.length > 0) {
        setSelectedPageId(sortedPages[0].id);
      }
    }
  }, [smartFile?.pages]);

  const createPageMutation = useMutation({
    mutationFn: async (data: { pageType: PageType; displayTitle: string; content: any }) => {
      const maxOrder = pages.length > 0 ? Math.max(...pages.map(p => p.pageOrder)) : -1;
      return apiRequest('POST', `/api/smart-files/${id}/pages`, {
        smartFileId: id,
        pageType: data.pageType,
        pageOrder: maxOrder + 1,
        displayTitle: data.displayTitle,
        content: data.content
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smart-files", id] });
      toast({
        title: "Page created",
        description: "New page has been added to your Smart File"
      });
    }
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({ pageId, updates }: { pageId: string; updates: Partial<SmartFilePage> }) => {
      return apiRequest('PATCH', `/api/smart-files/${id}/pages/${pageId}`, updates);
    },
    onMutate: () => {
      setSaveStatus('saving');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smart-files", id] });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  });

  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return apiRequest('DELETE', `/api/smart-files/${id}/pages/${pageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smart-files", id] });
      toast({
        title: "Page deleted",
        description: "Page has been removed from your Smart File"
      });
    }
  });

  const reorderPagesMutation = useMutation({
    mutationFn: async (pageOrders: { id: string; pageOrder: number }[]) => {
      return apiRequest('POST', `/api/smart-files/${id}/pages/reorder`, { pageOrders });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smart-files", id] });
    }
  });

  const handleAddPage = (pageType: PageType) => {
    let defaultContent: any = {};
    let displayTitle = '';

    switch (pageType) {
      case 'TEXT':
        defaultContent = { 
          blocks: [
            {
              id: `block-${Date.now()}-heading`,
              type: 'HEADING',
              content: 'New Text Page'
            }
          ]
        };
        displayTitle = 'New Text Page';
        break;
      case 'PACKAGE':
        defaultContent = { heading: 'Select Your Package', description: '', packageIds: [] };
        displayTitle = 'Package Selection';
        break;
      case 'ADDON':
        defaultContent = { heading: 'Add-ons', description: '', items: [] };
        displayTitle = 'Add-ons';
        break;
      case 'PAYMENT':
        defaultContent = { heading: 'Payment', description: '', depositPercent: 50, paymentTerms: '', acceptOnlinePayments: true };
        displayTitle = 'Payment';
        break;
    }

    createPageMutation.mutate({ pageType, displayTitle, content: defaultContent });
  };

  const handleUpdatePage = (pageId: string, content: any) => {
    updatePageMutation.mutate({ pageId, updates: { content } });
  };

  const handleDeletePage = (pageId: string) => {
    if (selectedPageId === pageId && pages.length > 1) {
      const currentIndex = pages.findIndex(p => p.id === pageId);
      const nextPage = pages[currentIndex + 1] || pages[currentIndex - 1];
      setSelectedPageId(nextPage?.id || null);
    }
    deletePageMutation.mutate(pageId);
  };

  const handleDuplicatePage = (page: SmartFilePage) => {
    createPageMutation.mutate({
      pageType: page.pageType as PageType,
      displayTitle: `${page.displayTitle} (Copy)`,
      content: page.content
    });
  };

  const handleReorder = (newOrder: SmartFilePage[]) => {
    setPages(newOrder);
    const pageOrders = newOrder.map((page, index) => ({
      id: page.id,
      pageOrder: index
    }));
    reorderPagesMutation.mutate(pageOrders);
  };

  const selectedPage = pages.find(p => p.id === selectedPageId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!smartFile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Smart File not found</h2>
          <Button onClick={() => setLocation("/smart-files")} data-testid="button-back-to-list">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Smart Files
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold mb-4" data-testid="text-add-page">Add Page</h3>
          <div className="space-y-2">
            {Object.entries(PAGE_TYPES).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={type}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAddPage(type as PageType)}
                  data-testid={`button-add-${type.toLowerCase()}`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            <h3 className="font-semibold mb-4" data-testid="text-pages">
              Pages ({pages.length})
            </h3>
            {pages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-pages">
                No pages yet. Add a page to get started.
              </p>
            ) : (
              <Reorder.Group axis="y" values={pages} onReorder={handleReorder}>
                {pages.map((page) => (
                  <PageCard
                    key={page.id}
                    page={page}
                    isSelected={selectedPageId === page.id}
                    onSelect={() => setSelectedPageId(page.id)}
                    onDelete={() => handleDeletePage(page.id)}
                    onDuplicate={() => handleDuplicatePage(page)}
                  />
                ))}
              </Reorder.Group>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger 
                data-testid="button-menu-toggle" 
                className="hidden md:inline-flex" 
              />
              <div>
                <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-smart-file-name">
                  {smartFile.name}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  {smartFile.projectType || "Universal"} • {pages.length} pages
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {saveStatus !== 'idle' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-save-status">
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Saved</span>
                    </>
                  )}
                </div>
              )}
              <Button 
                variant="outline" 
                onClick={() => setIsPreviewOpen(true)}
                data-testid="button-preview"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation("/smart-files")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </header>

        {/* Editor Area */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {selectedPage ? (
              <Card>
                <CardHeader>
                  <CardTitle data-testid="text-editor-title">
                    {PAGE_TYPES[selectedPage.pageType as PageType]?.label || selectedPage.pageType} Editor
                  </CardTitle>
                  <CardDescription data-testid="text-editor-description">
                    Configure the content and settings for this page
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedPage.pageType === 'TEXT' && (
                    <TextPageEditor 
                      page={selectedPage} 
                      onUpdate={(content) => handleUpdatePage(selectedPage.id, content)}
                    />
                  )}
                  {selectedPage.pageType === 'PACKAGE' && (
                    <PackagePageEditor 
                      page={selectedPage} 
                      onUpdate={(content) => handleUpdatePage(selectedPage.id, content)}
                    />
                  )}
                  {selectedPage.pageType === 'ADDON' && (
                    <AddOnPageEditor 
                      page={selectedPage} 
                      onUpdate={(content) => handleUpdatePage(selectedPage.id, content)}
                    />
                  )}
                  {selectedPage.pageType === 'PAYMENT' && (
                    <PaymentPageEditor 
                      page={selectedPage} 
                      onUpdate={(content) => handleUpdatePage(selectedPage.id, content)}
                    />
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center" data-testid="text-no-page-selected">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No page selected</h3>
                  <p className="text-muted-foreground">
                    Select a page from the sidebar or add a new one to get started
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Preview Dialog - Full Screen Paginated */}
      <Dialog open={isPreviewOpen} onOpenChange={(open) => {
        setIsPreviewOpen(open);
        if (!open) setCurrentPreviewPageIndex(0);
      }}>
        <DialogContent className="max-w-full w-screen h-screen m-0 p-0 rounded-none flex flex-col">
          {pages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No pages added yet. Add pages to see them in the preview.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header with Logo and Page Indicator */}
              <div className="bg-card border-b px-8 py-4 flex-shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <Camera className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold">{user?.businessName || 'Photography Studio'}</h1>
                      <p className="text-xs text-muted-foreground">Photography Proposal</p>
                    </div>
                  </div>
                  {/* Page Indicator */}
                  <div className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                    Page {currentPreviewPageIndex + 1} of {pages.length}
                  </div>
                </div>
              </div>

              {/* Current Page Display - Full Screen */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-7xl mx-auto pb-8">
                  {(() => {
                    const currentPage = pages[currentPreviewPageIndex];
                    return (
                    <div className="space-y-6">
                    {/* Text Page Preview */}
                    {currentPage.pageType === 'TEXT' && currentPage.content && (
                      <div className="space-y-0">
                        {/* Hero Section */}
                        {currentPage.content.hero?.backgroundImage && (
                          <div 
                            className="relative w-full h-[400px] flex items-center justify-center bg-cover bg-center"
                            style={{ backgroundImage: `url(${currentPage.content.hero.backgroundImage})` }}
                          >
                            <div className="absolute inset-0 bg-black/30" />
                            <div className="relative z-10 text-center text-white px-6 max-w-3xl">
                              {currentPage.content.hero.title && (
                                <h1 className="text-5xl font-bold mb-4">{currentPage.content.hero.title}</h1>
                              )}
                              {currentPage.content.hero.description && (
                                <p className="text-xl">{currentPage.content.hero.description}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Content Sections */}
                        <div className="max-w-[800px] mx-auto space-y-6 py-6">
                        {currentPage.content.sections && currentPage.content.sections.length > 0 ? (
                          // Sections-based rendering
                          currentPage.content.sections.map((section: Section, secIdx: number) => (
                            <div key={secIdx}>
                              {section.columns === 1 ? (
                                <div className="space-y-4">
                                  {section.blocks.map((block: ContentBlock, blockIdx: number) => (
                                    <div key={blockIdx}>
                                      {block.type === 'HEADING' && block.content && (
                                        <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                      )}
                                      {block.type === 'TEXT' && block.content && (
                                        <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
                                      )}
                                      {block.type === 'SPACER' && (
                                        <div className="py-6" />
                                      )}
                                      {block.type === 'IMAGE' && block.content && (() => {
                                        const imageData: ImageContent = typeof block.content === 'string' 
                                          ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                          : block.content;
                                        return (
                                          <img 
                                            src={imageData.url} 
                                            alt="" 
                                            className={cn(
                                              "w-full",
                                              imageData.borderRadius === 'rounded' ? 'rounded-full aspect-square object-cover' : 'rounded-none object-contain',
                                              imageData.size === 'small' ? 'max-h-[100px] max-w-[100px]' : imageData.size === 'large' ? 'max-h-[300px] max-w-[300px]' : 'max-h-[150px] max-w-[150px]'
                                            )} 
                                          />
                                        );
                                      })()}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-4">
                                    {section.blocks.filter((b: ContentBlock) => b.column === 0).map((block: ContentBlock, blockIdx: number) => (
                                      <div key={blockIdx}>
                                        {block.type === 'HEADING' && block.content && (
                                          <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                        )}
                                        {block.type === 'TEXT' && block.content && (
                                          <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
                                        )}
                                        {block.type === 'SPACER' && (
                                          <div className="py-6" />
                                        )}
                                        {block.type === 'IMAGE' && block.content && (() => {
                                          const imageData: ImageContent = typeof block.content === 'string' 
                                            ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                            : block.content;
                                          return (
                                            <img 
                                              src={imageData.url} 
                                              alt="" 
                                              className={cn(
                                                "w-full object-contain",
                                                imageData.borderRadius === 'rounded' ? 'rounded-3xl' : 'rounded-none',
                                                imageData.size === 'small' ? 'max-h-[100px]' : imageData.size === 'large' ? 'max-h-[300px]' : 'max-h-[150px]'
                                              )} 
                                            />
                                          );
                                        })()}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="space-y-4">
                                    {section.blocks.filter((b: ContentBlock) => b.column === 1).map((block: ContentBlock, blockIdx: number) => (
                                      <div key={blockIdx}>
                                        {block.type === 'HEADING' && block.content && (
                                          <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                        )}
                                        {block.type === 'TEXT' && block.content && (
                                          <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
                                        )}
                                        {block.type === 'SPACER' && (
                                          <div className="py-6" />
                                        )}
                                        {block.type === 'IMAGE' && block.content && (() => {
                                          const imageData: ImageContent = typeof block.content === 'string' 
                                            ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                            : block.content;
                                          return (
                                            <img 
                                              src={imageData.url} 
                                              alt="" 
                                              className={cn(
                                                "w-full object-contain",
                                                imageData.borderRadius === 'rounded' ? 'rounded-3xl' : 'rounded-none',
                                                imageData.size === 'small' ? 'max-h-[100px]' : imageData.size === 'large' ? 'max-h-[300px]' : 'max-h-[150px]'
                                              )} 
                                            />
                                          );
                                        })()}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        ) : currentPage.content.blocks && currentPage.content.blocks.length > 0 ? (
                          // Legacy blocks format
                          <div className="space-y-4">
                            {currentPage.content.blocks.map((block: ContentBlock, idx: number) => (
                              <div key={idx}>
                                {block.type === 'HEADING' && block.content && (
                                  <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                )}
                                {block.type === 'TEXT' && block.content && (
                                  <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
                                )}
                                {block.type === 'SPACER' && (
                                  <div className="py-6" />
                                )}
                                {block.type === 'IMAGE' && block.content && (() => {
                                  const imageData: ImageContent = typeof block.content === 'string' 
                                    ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                    : block.content;
                                  return (
                                    <img 
                                      src={imageData.url} 
                                      alt="" 
                                      className={cn(
                                        "w-full object-contain",
                                        imageData.borderRadius === 'rounded' ? 'rounded-lg' : 'rounded-none',
                                        imageData.size === 'small' ? 'max-h-[100px]' : imageData.size === 'large' ? 'max-h-[300px]' : 'max-h-[150px]'
                                      )} 
                                    />
                                  );
                                })()}
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Legacy heading/content format
                          <div className="space-y-4">
                            {currentPage.content.heading && (
                              <h3 className="text-xl font-semibold">{currentPage.content.heading}</h3>
                            )}
                            {currentPage.content.content && (
                              <p className="text-muted-foreground whitespace-pre-wrap">{currentPage.content.content}</p>
                            )}
                          </div>
                        )}
                        </div>
                      </div>
                    )}

                    {/* Package Page Preview */}
                    {currentPage.pageType === 'PACKAGE' && currentPage.content && (
                      <div className="space-y-6">
                        {currentPage.content.heading && (
                          <h3 className="text-4xl font-bold mb-4 text-center">{currentPage.content.heading}</h3>
                        )}
                        {currentPage.content.description && (
                          <p className="text-xl text-muted-foreground mb-6 leading-relaxed text-center">{currentPage.content.description}</p>
                        )}
                        {currentPage.content.packageIds && currentPage.content.packageIds.length > 0 ? (
                          <div className="space-y-4">
                            {packages && currentPage.content.packageIds.map((pkgId: string) => {
                              const pkg = packages.find((p: any) => p.id === pkgId);
                              if (!pkg) return null;
                              return (
                                <Card key={pkg.id} className="overflow-hidden border-2 hover:border-primary/40 hover:shadow-lg transition-all duration-300 max-w-[800px] mx-auto">
                                  <CardContent className="p-6">
                                    <div className="flex gap-6">
                                      {/* Package Image - Left Side */}
                                      {pkg.imageUrl && (
                                        <div className="w-48 h-48 flex-shrink-0 overflow-hidden rounded-lg border">
                                          <img 
                                            src={pkg.imageUrl} 
                                            alt={pkg.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                      )}
                                      
                                      {/* Content - Right Side */}
                                      <div className="flex-1 flex flex-col min-w-0">
                                        {/* Package Title */}
                                        <h4 className="text-xl font-bold mb-4 break-words">{pkg.name}</h4>
                                        
                                        {/* Package Description */}
                                        {pkg.description && (
                                          <div className="mb-4">
                                            <p className="font-semibold text-sm mb-2">Includes:</p>
                                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                                              {pkg.description}
                                            </p>
                                          </div>
                                        )}
                                        
                                        {/* Package Features */}
                                        {pkg.features && pkg.features.length > 0 && (
                                          <ul className="space-y-2 mb-4">
                                            {pkg.features.map((feature: string, idx: number) => (
                                              <li key={idx} className="text-sm flex items-start gap-2">
                                                <span className="text-primary mt-1 flex-shrink-0">•</span>
                                                <span className="break-words">{feature}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                        
                                        {/* Price and Selection */}
                                        <div className="flex items-center justify-between gap-4 pt-4 border-t mt-auto">
                                          <div className="text-2xl font-bold text-primary flex-shrink-0">
                                            ${(pkg.basePriceCents / 100).toFixed(2)}
                                          </div>
                                          <Button 
                                            variant="default" 
                                            size="default" 
                                            disabled 
                                            className="pointer-events-none flex-shrink-0"
                                          >
                                            Select
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2 pl-1">
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                              Clients will select one of these packages
                            </p>
                          </div>
                        ) : (
                          <div className="p-6 border-2 border-dashed border-border rounded-xl text-center">
                            <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground font-medium">
                              No packages selected yet
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Add packages to show them to clients
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Add-on Page Preview */}
                    {currentPage.pageType === 'ADDON' && currentPage.content && (
                      <div className="space-y-4">
                        {currentPage.content.heading && (
                          <h3 className="text-2xl font-bold mb-2">{currentPage.content.heading}</h3>
                        )}
                        {currentPage.content.description && (
                          <p className="text-muted-foreground mb-4 leading-relaxed">{currentPage.content.description}</p>
                        )}
                        {currentPage.content.items && currentPage.content.items.length > 0 ? (
                          <div className="space-y-3">
                            {currentPage.content.items.map((item: any, idx: number) => (
                              <div key={idx} className="group flex items-start justify-between gap-4 p-4 border-2 border-border rounded-xl bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="mt-1">
                                    <Checkbox 
                                      disabled 
                                      className="pointer-events-none opacity-50" 
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-bold text-base group-hover:text-primary transition-colors">{item.name}</p>
                                    {item.description && (
                                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{item.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="px-3 py-1.5 rounded-lg bg-muted font-semibold text-sm flex-shrink-0">
                                  ${(item.priceCents / 100).toFixed(2)}
                                </div>
                              </div>
                            ))}
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2 pl-1">
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                              Clients can select add-ons with quantity controls
                            </p>
                          </div>
                        ) : (
                          <div className="p-6 border-2 border-dashed border-border rounded-xl text-center">
                            <Plus className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground font-medium">
                              No add-ons configured yet
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Add items to show them to clients
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payment Page Preview */}
                    {currentPage.pageType === 'PAYMENT' && currentPage.content && (
                      <div className="max-w-2xl mx-auto">
                        {/* Payment Card */}
                        <Card className="border-2">
                          <CardContent className="p-8 space-y-6">
                            {/* Payment Header */}
                            <div className="flex items-center justify-between pb-6 border-b">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                                  <CreditCard className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <div>
                                  <div className="font-semibold text-sm">Payment 1 of 4</div>
                                  <div className="text-xs text-muted-foreground">Due: Oct 8, 2025</div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="text-sm">
                                View Invoice
                              </Button>
                            </div>

                            {/* Amount Due */}
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Amount due</div>
                              <div className="text-4xl font-bold">$450.00</div>
                            </div>

                            {/* Tip Section */}
                            <div className="space-y-3">
                              <div className="text-sm font-medium">Would you like to leave a tip?</div>
                              <div className="flex gap-2 flex-wrap">
                                <Button variant="outline" size="sm" className="flex-1 min-w-[80px]">
                                  No thanks
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1 min-w-[80px]">
                                  <div className="text-center">
                                    <div className="font-semibold">10%</div>
                                    <div className="text-xs text-muted-foreground">$45</div>
                                  </div>
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1 min-w-[80px]">
                                  <div className="text-center">
                                    <div className="font-semibold">15%</div>
                                    <div className="text-xs text-muted-foreground">$67.50</div>
                                  </div>
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1 min-w-[80px]">
                                  <div className="text-center">
                                    <div className="font-semibold">20%</div>
                                    <div className="text-xs text-muted-foreground">$90</div>
                                  </div>
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1 min-w-[80px]">
                                  Custom
                                </Button>
                              </div>
                            </div>

                            {/* Autopay Notice */}
                            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                              <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-muted-foreground">
                                Use Autopay, never make a late payment
                              </div>
                            </div>

                            {/* Overpay Checkbox */}
                            <div className="flex items-start gap-2">
                              <input type="checkbox" className="mt-1" />
                              <label className="text-xs text-muted-foreground leading-relaxed">
                                Overpay? Pay the invoice now. Upcoming payments will be charged automatically per the invoice payment schedule.
                              </label>
                            </div>

                            {/* Google Pay Button (Mock) */}
                            <Button className="w-full bg-black hover:bg-black/90 text-white h-12">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">G Pay</span>
                                <span>•••• 7303</span>
                              </div>
                            </Button>

                            {/* Divider */}
                            <div className="relative">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t"></div>
                              </div>
                              <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">OR</span>
                              </div>
                            </div>

                            {/* Payment Method Tabs */}
                            <div className="flex gap-2">
                              <Button variant="outline" className="flex-1 h-11">
                                Debit or credit card
                              </Button>
                              <Button variant="ghost" className="flex-1 h-11">
                                Bank account
                              </Button>
                            </div>

                            {/* Card Input Fields (Mock) */}
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">Card number</label>
                                <div className="relative">
                                  <input 
                                    type="text" 
                                    placeholder="1234 1234 1234 1234" 
                                    className="w-full px-3 py-2 border rounded-md"
                                    disabled
                                  />
                                  <div className="absolute right-3 top-2.5 flex gap-1">
                                    <CreditCard className="w-5 h-5 text-blue-600" />
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium mb-2 block">Expiration date</label>
                                  <input 
                                    type="text" 
                                    placeholder="MM / YY" 
                                    className="w-full px-3 py-2 border rounded-md"
                                    disabled
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium mb-2 block">Security code</label>
                                  <input 
                                    type="text" 
                                    placeholder="CVC" 
                                    className="w-full px-3 py-2 border rounded-md"
                                    disabled
                                  />
                                </div>
                              </div>
                            </div>

                            {/* SSL Security Badge */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t">
                              <Shield className="w-4 h-4" />
                              <span>We use the same SSL encryption technology that banks use to protect your sensitive data.</span>
                            </div>

                            {/* Pay Button */}
                            <div className="flex items-center justify-end gap-3 pt-4">
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                <span>Secured by <span className="font-semibold">HONEYBOOK</span></span>
                              </div>
                              <Button className="bg-primary hover:bg-primary/90 h-11 px-8">
                                Pay $450.00
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    </div>
                    );
                  })()}
                </div>
              </div>

              {/* Navigation Buttons - Bottom Right */}
              <div className="absolute bottom-6 right-6 z-10 flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setCurrentPreviewPageIndex(Math.max(0, currentPreviewPageIndex - 1))}
                  disabled={currentPreviewPageIndex === 0}
                  data-testid="button-prev-bottom"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setCurrentPreviewPageIndex(Math.min(pages.length - 1, currentPreviewPageIndex + 1))}
                  disabled={currentPreviewPageIndex === pages.length - 1}
                  data-testid="button-next-bottom"
                >
                  Next
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
