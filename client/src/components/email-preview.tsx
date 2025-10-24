import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContentBlock } from "./email-template-builder";

interface EmailPreviewProps {
  subject?: string;
  blocks: ContentBlock[];
  className?: string;
  includeHeroImage?: boolean;
  heroImageUrl?: string;
  includeHeader?: boolean;
  headerStyle?: string;
  includeSignature?: boolean;
  signatureStyle?: string;
}

export function EmailPreview({ 
  subject, 
  blocks, 
  className,
  includeHeroImage,
  heroImageUrl,
  includeHeader,
  headerStyle,
  includeSignature,
  signatureStyle
}: EmailPreviewProps) {
  const renderBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'HEADING':
        return (
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {block.content?.text || 'Heading'}
          </h2>
        );
      
      case 'TEXT':
        return (
          <p className="text-gray-700 mb-4 whitespace-pre-wrap">
            {block.content?.text || 'Text content'}
          </p>
        );
      
      case 'BUTTON':
        const variant = block.content?.variant || 'default';
        const buttonClasses = cn(
          "inline-block px-6 py-3 rounded-md font-semibold text-center no-underline",
          {
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'default',
            'bg-gray-600 text-white hover:bg-gray-700': variant === 'secondary',
            'bg-transparent text-blue-600 border-2 border-blue-600 hover:bg-blue-50': variant === 'outline'
          }
        );
        
        let linkPreview = block.content?.linkValue || '#';
        if (block.content?.linkType === 'SMART_FILE') {
          linkPreview = '{{smart_file_link}}';
        } else if (block.content?.linkType === 'GALLERY') {
          linkPreview = '{{gallery_link}}';
        } else if (block.content?.linkType === 'CALENDAR') {
          linkPreview = '{{calendar_link}}';
        }
        
        return (
          <div className="mb-4">
            <a href={linkPreview} className={buttonClasses}>
              {block.content?.text || 'Button Text'}
            </a>
          </div>
        );
      
      case 'IMAGE':
        return block.content?.url ? (
          <div className="mb-4">
            <img 
              src={block.content.url} 
              alt="Email content" 
              className="max-w-full h-auto rounded"
            />
          </div>
        ) : (
          <div className="mb-4 p-8 bg-gray-100 rounded text-center text-gray-400">
            No image URL provided
          </div>
        );
      
      case 'SPACER':
        return (
          <div 
            style={{ height: `${block.content?.height || 20}px` }} 
            className="mb-4"
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-muted/50 border-b">
        <CardTitle className="text-base">Email Preview</CardTitle>
        {subject && (
          <div className="text-sm text-muted-foreground mt-2">
            <span className="font-semibold">Subject:</span> {subject}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-white rounded-lg border max-w-2xl mx-auto" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          {/* Hero Image */}
          {includeHeroImage && heroImageUrl && (
            <div className="w-full">
              <img src={heroImageUrl} alt="Hero" className="w-full h-auto" />
            </div>
          )}
          
          {/* Header */}
          {includeHeader && (
            <div className="px-8 py-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  L
                </div>
                <div>
                  <div className="font-bold text-lg">Your Business Name</div>
                  <div className="text-sm text-gray-600">{headerStyle || 'professional'} style</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Content */}
          <div className="p-8">
            {blocks.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <p>No content blocks to preview</p>
                <p className="text-sm mt-2">Add blocks to see them here</p>
              </div>
            ) : (
              blocks.map((block) => (
                <div key={block.id}>
                  {renderBlock(block)}
                </div>
              ))
            )}
          </div>
          
          {/* Signature */}
          {includeSignature && (
            <div className="px-8 py-6 border-t bg-gray-50">
              <div className="text-sm text-gray-700">
                <div className="font-semibold mb-2">Your Name</div>
                <div className="text-gray-600">Photographer</div>
                <div className="text-gray-600 mt-2">
                  {signatureStyle || 'professional'} style signature
                </div>
                <div className="flex gap-3 mt-3">
                  <span className="text-xs text-gray-500">📧 Email</span>
                  <span className="text-xs text-gray-500">📞 Phone</span>
                  <span className="text-xs text-gray-500">🌐 Website</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
