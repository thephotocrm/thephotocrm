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
  MoveVertical
} from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import type { SmartFileWithPages, SmartFilePage, InsertSmartFilePage } from "@shared/schema";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
type ContentBlock = {
  id: string;
  type: 'HEADING' | 'TEXT' | 'SPACER' | 'IMAGE';
  content: any;
};

type TextPageContent = {
  blocks?: ContentBlock[];
  // Legacy fields (for backwards compatibility)
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
  IMAGE: { icon: ImageIcon, label: 'Image', placeholder: 'Image URL...' }
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
                <Input
                  value={localContent || ''}
                  onChange={(e) => setLocalContent(e.target.value)}
                  onBlur={handleBlur}
                  placeholder={BLOCK_TYPES.IMAGE.placeholder}
                  data-testid={`block-image-${block.id}`}
                />
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              data-testid={`button-delete-block-${block.id}`}
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Reorder.Item>
  );
}

// Text Page Editor Component (Block-based)
function TextPageEditor({ 
  page, 
  onUpdate 
}: { 
  page: SmartFilePage; 
  onUpdate: (content: TextPageContent) => void;
}) {
  const content = page.content as TextPageContent;
  
  // Convert legacy format to blocks on load
  const initializeBlocks = (): ContentBlock[] => {
    if (content.blocks && content.blocks.length > 0) {
      return content.blocks;
    }
    
    // Legacy format conversion
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
    
    return legacyBlocks.length > 0 ? legacyBlocks : [];
  };

  const [blocks, setBlocks] = useState<ContentBlock[]>(initializeBlocks);

  useEffect(() => {
    setBlocks(initializeBlocks());
  }, [page.id]);

  useEffect(() => {
    // Auto-save blocks when they change
    const timeout = setTimeout(() => {
      onUpdate({ blocks });
    }, 500);
    return () => clearTimeout(timeout);
  }, [blocks]);

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: type === 'SPACER' ? null : ''
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (blockId: string, content: any) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, content } : b));
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
  };

  const handleReorder = (newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks);
  };

  return (
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
              data-testid={`button-add-${type.toLowerCase()}-block`}
            >
              <Icon className="w-4 h-4 mr-2" />
              Add {config.label}
            </Button>
          );
        })}
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No content blocks yet. Add a block to get started.</p>
        </div>
      ) : (
        <Reorder.Group axis="y" values={blocks} onReorder={handleReorder}>
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
    queryKey: ['/api/packages']
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
          <div className="space-y-2 mt-2">
            {packages && packages.length > 0 ? (
              packages.map((pkg) => (
                <Card 
                  key={pkg.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    (localContent.packageIds || []).includes(pkg.id) && "border-primary bg-primary/5"
                  )}
                  onClick={() => togglePackage(pkg.id)}
                  data-testid={`card-package-${pkg.id}`}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium" data-testid={`text-package-name-${pkg.id}`}>{pkg.name}</p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-package-price-${pkg.id}`}>
                        ${(pkg.priceCents / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center",
                      (localContent.packageIds || []).includes(pkg.id) ? "border-primary bg-primary" : "border-muted"
                    )}>
                      {(localContent.packageIds || []).includes(pkg.id) && (
                        <div className="w-2 h-2 bg-white rounded-sm" />
                      )}
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
            <Label data-testid="label-selected-packages">Selected Packages</Label>
            <div className="space-y-2 mt-2">
              {selectedPackages.map((pkg) => (
                <div 
                  key={pkg.id} 
                  className="flex items-center justify-between p-2 bg-muted rounded"
                  data-testid={`selected-package-${pkg.id}`}
                >
                  <span className="font-medium">{pkg.name}</span>
                  <span className="text-sm">${(pkg.priceCents / 100).toFixed(2)}</span>
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

  const { data: smartFile, isLoading } = useQuery<SmartFileWithPages>({
    queryKey: ["/api/smart-files", id],
    enabled: !!id
  });

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
        <DialogContent className="max-w-full w-screen h-screen m-0 p-0 rounded-none">
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
              {/* Navigation Buttons - Top Right */}
              <div className="absolute top-6 right-6 z-10 flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setCurrentPreviewPageIndex(Math.max(0, currentPreviewPageIndex - 1))}
                  disabled={currentPreviewPageIndex === 0}
                  data-testid="button-prev-top"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setCurrentPreviewPageIndex(Math.min(pages.length - 1, currentPreviewPageIndex + 1))}
                  disabled={currentPreviewPageIndex === pages.length - 1}
                  data-testid="button-next-top"
                >
                  Next
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Button>
              </div>

              {/* Current Page Display - Full Screen */}
              {(() => {
                const currentPage = pages[currentPreviewPageIndex];
                return (
                <div className="h-full w-full flex items-center justify-center p-8">
                <Card className="w-full max-w-4xl" key={currentPage.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {PAGE_TYPES[currentPage.pageType as PageType] && (
                        (() => {
                          const Icon = PAGE_TYPES[currentPage.pageType as PageType].icon;
                          return <Icon className="w-5 h-5" />;
                        })()
                      )}
                      {currentPage.displayTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Text Page Preview */}
                    {currentPage.pageType === 'TEXT' && currentPage.content && (
                      <div className="space-y-4">
                        {currentPage.content.blocks && currentPage.content.blocks.length > 0 ? (
                          currentPage.content.blocks.map((block: ContentBlock, idx: number) => (
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
                              {block.type === 'IMAGE' && block.content && (
                                <img src={block.content} alt="" className="w-full rounded-lg" />
                              )}
                            </div>
                          ))
                        ) : (
                          // Legacy format fallback
                          <>
                            {currentPage.content.heading && (
                              <h3 className="text-xl font-semibold">{currentPage.content.heading}</h3>
                            )}
                            {currentPage.content.content && (
                              <p className="text-muted-foreground whitespace-pre-wrap">{currentPage.content.content}</p>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Package Page Preview */}
                    {currentPage.pageType === 'PACKAGE' && currentPage.content && (
                      <div className="space-y-4">
                        {currentPage.content.heading && (
                          <h3 className="text-xl font-semibold">{currentPage.content.heading}</h3>
                        )}
                        {currentPage.content.description && (
                          <p className="text-muted-foreground">{currentPage.content.description}</p>
                        )}
                        {currentPage.content.packageIds && currentPage.content.packageIds.length > 0 ? (
                          <div className="text-sm text-muted-foreground">
                            {currentPage.content.packageIds.length} package(s) configured
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No packages selected yet</p>
                        )}
                      </div>
                    )}

                    {/* Add-on Page Preview */}
                    {currentPage.pageType === 'ADDON' && currentPage.content && (
                      <div className="space-y-4">
                        {currentPage.content.heading && (
                          <h3 className="text-xl font-semibold">{currentPage.content.heading}</h3>
                        )}
                        {currentPage.content.description && (
                          <p className="text-muted-foreground">{currentPage.content.description}</p>
                        )}
                        {currentPage.content.items && currentPage.content.items.length > 0 ? (
                          <div className="space-y-2">
                            {currentPage.content.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center p-3 border rounded-lg">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                  )}
                                </div>
                                <p className="font-semibold">
                                  ${(item.priceCents / 100).toFixed(2)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No add-ons configured yet</p>
                        )}
                      </div>
                    )}

                    {/* Payment Page Preview */}
                    {currentPage.pageType === 'PAYMENT' && currentPage.content && (
                      <div className="space-y-4">
                        {currentPage.content.heading && (
                          <h3 className="text-xl font-semibold">{currentPage.content.heading}</h3>
                        )}
                        {currentPage.content.description && (
                          <p className="text-muted-foreground">{currentPage.content.description}</p>
                        )}
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Deposit Required:</span>
                            <span className="font-medium">{currentPage.content.depositPercent || 50}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Online Payments:</span>
                            <span className="font-medium">
                              {currentPage.content.acceptOnlinePayments ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          {currentPage.content.paymentTerms && (
                            <div className="mt-4 p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium mb-1">Payment Terms:</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {currentPage.content.paymentTerms}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </div>
                );
              })()}

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
