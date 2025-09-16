import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Package } from "lucide-react";

const estimateItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  qty: z.number().min(1, "Quantity must be at least 1"),
  unitCents: z.number().min(0, "Unit price must be positive"),
  lineTotalCents: z.number().min(0),
});

const estimateFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  clientId: z.string().min(1, "Client is required"),
  notes: z.string().optional(),
  items: z.array(estimateItemSchema).min(1, "At least one item is required"),
  discountCents: z.number().min(0).default(0),
  taxCents: z.number().min(0).default(0),
  depositPercent: z.number().min(0).max(100).optional(),
  validUntil: z.string().optional(),
});

type EstimateFormData = z.infer<typeof estimateFormSchema>;
type EstimateItem = z.infer<typeof estimateItemSchema>;

// Separate component to handle unit price input without hooks violations
interface UnitPriceInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
  index: number;
}

function UnitPriceInput({ value, onChange, onBlur, index }: UnitPriceInputProps) {
  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const parsePrice = (value: string) => {
    const parsed = parseFloat(value || "0");
    return isFinite(parsed) ? Math.round(parsed * 100) : 0;
  };

  const [displayValue, setDisplayValue] = useState(formatPrice(value));

  // Sync display value when prop changes (e.g., from package import)
  useEffect(() => {
    setDisplayValue(formatPrice(value));
  }, [value]);

  return (
    <FormItem>
      <FormLabel>Unit Price</FormLabel>
      <FormControl>
        <Input 
          type="text"
          placeholder="0.00"
          value={displayValue}
          onChange={(e) => {
            const inputValue = e.target.value;
            // Allow typing decimal numbers, empty string, or just a decimal point
            if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
              setDisplayValue(inputValue);
            }
          }}
          onBlur={(e) => {
            const inputValue = e.target.value;
            // Handle edge cases: empty string or just '.' should be treated as 0
            const cleanValue = inputValue === '' || inputValue === '.' ? '0' : inputValue;
            const parsed = parsePrice(cleanValue);
            onChange(parsed);
            setDisplayValue(formatPrice(parsed));
            onBlur();
          }}
          onFocus={() => {
            // Remove formatting when focused for easier editing
            const rawValue = value ? (value / 100).toString() : '0';
            setDisplayValue(rawValue.endsWith('.00') ? rawValue.slice(0, -3) : rawValue);
          }}
          data-testid={`input-item-unit-price-${index}`}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

interface EstimateFormProps {
  initialData?: Partial<EstimateFormData>;
  clients: Array<{ id: string; firstName: string; lastName: string }>;
  packages?: Array<{ id: string; name: string; basePriceCents: number; items?: Array<any> }>;
  onSubmit: (data: EstimateFormData) => void;
  isLoading?: boolean;
  submitText?: string;
}

export default function EstimateForm({ 
  initialData, 
  clients,
  packages = [],
  onSubmit, 
  isLoading = false,
  submitText = "Save Estimate"
}: EstimateFormProps) {
  const form = useForm<EstimateFormData>({
    resolver: zodResolver(estimateFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      clientId: initialData?.clientId || "",
      notes: initialData?.notes || "",
      items: initialData?.items || [
        {
          name: "",
          description: "",
          qty: 1,
          unitCents: 0,
          lineTotalCents: 0,
        }
      ],
      discountCents: initialData?.discountCents || 0,
      taxCents: initialData?.taxCents || 0,
      depositPercent: initialData?.depositPercent || undefined,
      validUntil: initialData?.validUntil || "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const discountCents = form.watch("discountCents");
  const taxCents = form.watch("taxCents");

  // Calculate totals
  const subtotalCents = watchedItems.reduce((sum, item) => sum + ((item.qty || 0) * (item.unitCents || 0)), 0);
  const autoTaxCents = Math.round(subtotalCents * 0.0825); // 8.25% automatic tax
  const totalCents = subtotalCents - discountCents + autoTaxCents;
  const depositPercent = form.watch("depositPercent");
  const depositCents = depositPercent ? Math.round(totalCents * (depositPercent / 100)) : 0;

  // Update line total when qty or unit price changes
  useEffect(() => {
    watchedItems.forEach((item, index) => {
      const lineTotal = (item.qty || 0) * (item.unitCents || 0);
      if (lineTotal !== item.lineTotalCents) {
        form.setValue(`items.${index}.lineTotalCents`, lineTotal, { shouldValidate: false });
      }
    });
  }, [watchedItems, form]);

  // Auto-update tax when subtotal changes
  useEffect(() => {
    const newTaxCents = Math.round(subtotalCents * 0.0825);
    if (newTaxCents !== taxCents) {
      form.setValue("taxCents", newTaxCents);
    }
  }, [subtotalCents, taxCents, form]);

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const parsePrice = (value: string) => {
    return Math.round(parseFloat(value || "0") * 100);
  };

  const addItem = () => {
    append({
      name: "",
      description: "",
      qty: 1,
      unitCents: 0,
      lineTotalCents: 0,
    });
  };

  const importPackage = (packageId: string) => {
    const selectedPackage = packages.find(pkg => pkg.id === packageId);
    if (selectedPackage) {
      // Clear existing items and add package items
      form.setValue("items", []);
      
      // Add main package item
      append({
        name: selectedPackage.name,
        description: `Complete package - ${selectedPackage.name}`,
        qty: 1,
        unitCents: selectedPackage.basePriceCents,
        lineTotalCents: selectedPackage.basePriceCents,
      });

      // If package has items, add them as well
      if (selectedPackage.items) {
        selectedPackage.items.forEach((item: any) => {
          append({
            name: item.name,
            description: item.description || "",
            qty: item.qty || 1,
            unitCents: item.unitCents || 0,
            lineTotalCents: item.lineTotalCents || 0,
          });
        });
      }
    }
  };

  const handleFormSubmit = (data: EstimateFormData) => {
    // Ensure line totals are calculated correctly before submission
    const updatedData = {
      ...data,
      items: data.items.map(item => ({
        ...item,
        lineTotalCents: (item.qty || 0) * (item.unitCents || 0)
      }))
    };
    onSubmit(updatedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Estimate Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimate Title</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Gold Wedding Package"
                        data-testid="input-estimate-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-client">
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.firstName} {client.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="depositPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit Percentage</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="number"
                        min="0"
                        max="100"
                        placeholder="50"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        value={field.value || ""}
                        data-testid="input-deposit-percent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="date"
                        data-testid="input-valid-until"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Additional terms or information..."
                      rows={3}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Package Import */}
        {packages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Import Package
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Select onValueChange={importPackage}>
                  <SelectTrigger className="flex-1" data-testid="select-package">
                    <SelectValue placeholder="Select a package to import" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - ${formatPrice(pkg.basePriceCents)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" onClick={addItem} size="sm" data-testid="button-add-item">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 border border-border rounded-lg">
                <div className="md:col-span-4">
                  <FormField
                    control={form.control}
                    name={`items.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Service or product name"
                            data-testid={`input-item-name-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="md:col-span-3">
                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Optional description"
                            data-testid={`input-item-description-${index}`}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="md:col-span-1">
                  <FormField
                    control={form.control}
                    name={`items.${index}.qty`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qty</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="number"
                            min="1"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            data-testid={`input-item-qty-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitCents`}
                    render={({ field }) => (
                      <UnitPriceInput
                        value={field.value || 0}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        index={index}
                      />
                    )}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Line Total</Label>
                  <div className="h-10 px-3 py-2 border border-input rounded-md bg-muted flex items-center">
                    ${formatPrice((watchedItems[index]?.qty || 0) * (watchedItems[index]?.unitCents || 0))}
                  </div>
                </div>

                <div className="md:col-span-1 flex items-end">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                      data-testid={`button-remove-item-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Subtotal</Label>
                <div className="h-10 px-3 py-2 border border-input rounded-md bg-muted flex items-center">
                  ${formatPrice(subtotalCents)}
                </div>
              </div>

              <FormField
                control={form.control}
                name="discountCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        value={formatPrice(field.value || 0)}
                        onChange={(e) => field.onChange(parsePrice(e.target.value))}
                        data-testid="input-discount"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax (8.25% automatic)</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        value={formatPrice(autoTaxCents)}
                        readOnly
                        className="bg-muted"
                        data-testid="input-tax"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total</span>
              <span data-testid="total-amount">${formatPrice(totalCents)}</span>
            </div>

            {depositPercent && depositPercent > 0 && (
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Deposit ({depositPercent}%)</span>
                <span data-testid="deposit-amount">${formatPrice(depositCents)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading}
          data-testid="button-submit-estimate"
        >
          {isLoading ? "Saving..." : submitText}
        </Button>
      </form>
    </Form>
  );
}
