import { CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SelectedPackage {
  pageId: string;
  packageId: string;
  name: string;
  priceCents: number;
  description?: string;
  features?: string[];
  imageUrl?: string;
}

interface SelectedAddOn {
  pageId: string;
  addOnId: string;
  name: string;
  priceCents: number;
  quantity: number;
  description?: string;
  imageUrl?: string;
}

interface ContractRendererProps {
  template: string;
  variables: Record<string, string>;
  selectedPackages: Map<string, SelectedPackage>;
  selectedAddOns: Map<string, SelectedAddOn>;
}

export function ContractRenderer({ 
  template, 
  variables, 
  selectedPackages, 
  selectedAddOns 
}: ContractRendererProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Parse template and create renderable segments
  const parseTemplate = () => {
    const segments: Array<{ type: 'text' | 'packages' | 'addons'; content?: string }> = [];
    
    // Split by {{selected_packages}} and {{selected_addons}}
    let remaining = template;
    let currentIndex = 0;

    while (remaining.length > 0) {
      // Find the next variable placeholder
      const packagesMatch = remaining.match(/\{\{selected_packages\}\}/);
      const addonsMatch = remaining.match(/\{\{selected_addons\}\}/);
      
      let nextMatch: { type: 'packages' | 'addons'; index: number } | null = null;
      
      if (packagesMatch && addonsMatch) {
        // Both exist, find which comes first
        const packagesIndex = packagesMatch.index!;
        const addonsIndex = addonsMatch.index!;
        nextMatch = packagesIndex < addonsIndex 
          ? { type: 'packages', index: packagesIndex }
          : { type: 'addons', index: addonsIndex };
      } else if (packagesMatch) {
        nextMatch = { type: 'packages', index: packagesMatch.index! };
      } else if (addonsMatch) {
        nextMatch = { type: 'addons', index: addonsMatch.index! };
      }

      if (nextMatch) {
        // Add text before the variable
        if (nextMatch.index > 0) {
          segments.push({
            type: 'text',
            content: remaining.substring(0, nextMatch.index)
          });
        }

        // Add the variable segment
        segments.push({ type: nextMatch.type });

        // Move past the variable
        const variableLength = nextMatch.type === 'packages' 
          ? '{{selected_packages}}'.length 
          : '{{selected_addons}}'.length;
        remaining = remaining.substring(nextMatch.index + variableLength);
      } else {
        // No more variables, add remaining text
        if (remaining.length > 0) {
          segments.push({ type: 'text', content: remaining });
        }
        break;
      }
    }

    return segments;
  };

  // Replace simple variables in text
  const replaceVariables = (text: string) => {
    let replaced = text;
    Object.entries(variables).forEach(([key, value]) => {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      replaced = replaced.replace(pattern, value || `[${key}]`);
    });
    return replaced;
  };

  const segments = parseTemplate();

  return (
    <div className="space-y-4">
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <div key={index} className="whitespace-pre-wrap text-sm leading-relaxed">
              {replaceVariables(segment.content || '')}
            </div>
          );
        }

        if (segment.type === 'packages') {
          const packages = Array.from(selectedPackages.values());
          if (packages.length === 0) {
            return (
              <div key={index} className="text-sm text-muted-foreground italic">
                No packages selected
              </div>
            );
          }

          return (
            <div key={index} className="space-y-3 my-6">
              {packages.map((pkg) => (
                <Card 
                  key={`${pkg.pageId}-${pkg.packageId}`}
                  className="overflow-hidden border-2 border-primary/50 bg-primary/5"
                  data-testid={`contract-package-${pkg.packageId}`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Package Image */}
                      {pkg.imageUrl && (
                        <div className="w-full md:w-32 h-32 flex-shrink-0 overflow-hidden rounded-lg border">
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
                      
                      {/* Content */}
                      <div className="flex-1 flex flex-col min-w-0">
                        {/* Package Title & Price */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h4 className="text-lg font-bold break-words">
                            {pkg.name}
                          </h4>
                          <div className="text-lg font-bold text-primary whitespace-nowrap">
                            {formatPrice(pkg.priceCents)}
                          </div>
                        </div>
                        
                        {/* Package Description */}
                        {pkg.description && (
                          <div className="mb-3">
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                              {pkg.description}
                            </p>
                          </div>
                        )}
                        
                        {/* Package Features */}
                        {pkg.features && pkg.features.length > 0 && (
                          <ul className="space-y-1.5">
                            {pkg.features.map((feature: string, idx: number) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="flex-1">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        }

        if (segment.type === 'addons') {
          const addons = Array.from(selectedAddOns.values());
          if (addons.length === 0) {
            return (
              <div key={index} className="text-sm text-muted-foreground italic">
                No add-ons selected
              </div>
            );
          }

          return (
            <div key={index} className="space-y-3 my-6">
              {addons.map((addon) => (
                <Card 
                  key={`${addon.pageId}-${addon.addOnId}`}
                  className="overflow-hidden border-2 border-primary/50 bg-primary/5"
                  data-testid={`contract-addon-${addon.addOnId}`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Add-on Image */}
                      {addon.imageUrl && (
                        <div className="w-full md:w-32 h-32 flex-shrink-0 overflow-hidden rounded-lg border">
                          <img 
                            src={addon.imageUrl} 
                            alt={addon.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Content */}
                      <div className="flex-1 flex flex-col min-w-0">
                        {/* Add-on Title, Quantity & Total */}
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h4 className="text-lg font-bold break-words">
                              {addon.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Quantity: {addon.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">
                              {formatPrice(addon.priceCents)} each
                            </div>
                            <div className="text-lg font-bold text-primary whitespace-nowrap">
                              {formatPrice(addon.priceCents * addon.quantity)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Add-on Description */}
                        {addon.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                            {addon.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
