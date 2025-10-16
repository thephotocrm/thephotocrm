import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";

interface EmailBrandingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photographer: any;
  onSave: (data: {
    emailHeaderStyle: string | null;
    emailSignatureStyle: string | null;
    headshotUrl: string;
    website: string;
    businessAddress: string;
    socialLinksJson: any;
  }) => void;
}

const headerStyles = [
  { value: "none", label: "None", description: "No header" },
  { value: "minimal", label: "Minimal", description: "Simple logo centered" },
  { value: "professional", label: "Professional", description: "Logo + business name with divider" },
  { value: "bold", label: "Bold", description: "Full-width colored banner" },
  { value: "classic", label: "Classic", description: "Logo left, name right" },
];

const signatureStyles = [
  { value: "none", label: "None", description: "No signature" },
  { value: "simple", label: "Simple", description: "Basic contact info" },
  { value: "professional", label: "Professional ⭐", description: "With your photo + contact details" },
  { value: "detailed", label: "Detailed", description: "Full contact card with all info" },
  { value: "branded", label: "Branded", description: "Styled with brand colors" },
];

export function EmailBrandingModal({ open, onOpenChange, photographer, onSave }: EmailBrandingModalProps) {
  const [headerStyle, setHeaderStyle] = useState<string>(photographer?.emailHeaderStyle || "none");
  const [signatureStyle, setSignatureStyle] = useState<string>(photographer?.emailSignatureStyle || "none");
  const [headshotUrl, setHeadshotUrl] = useState(photographer?.headshotUrl || "");
  const [website, setWebsite] = useState(photographer?.website || "");
  const [businessAddress, setBusinessAddress] = useState(photographer?.businessAddress || "");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");

  useEffect(() => {
    if (photographer) {
      setHeaderStyle(photographer.emailHeaderStyle || "none");
      setSignatureStyle(photographer.emailSignatureStyle || "none");
      setHeadshotUrl(photographer.headshotUrl || "");
      setWebsite(photographer.website || "");
      setBusinessAddress(photographer.businessAddress || "");
      const socialLinks = photographer.socialLinksJson || {};
      setFacebook(socialLinks.facebook || "");
      setInstagram(socialLinks.instagram || "");
      setTwitter(socialLinks.twitter || "");
      setLinkedin(socialLinks.linkedin || "");
    }
  }, [photographer]);

  const handleSave = () => {
    const socialLinksJson = {
      ...(facebook && { facebook }),
      ...(instagram && { instagram }),
      ...(twitter && { twitter }),
      ...(linkedin && { linkedin })
    };

    onSave({
      emailHeaderStyle: headerStyle === "none" ? null : headerStyle,
      emailSignatureStyle: signatureStyle === "none" ? null : signatureStyle,
      headshotUrl: headshotUrl || "",
      website: website || "",
      businessAddress: businessAddress || "",
      socialLinksJson: Object.keys(socialLinksJson).length > 0 ? socialLinksJson : {}
    });
    onOpenChange(false);
  };

  const generatePreviewHTML = (type: 'header' | 'signature', style: string) => {
    const primaryColor = photographer?.brandPrimary || '#3b82f6';
    const secondaryColor = photographer?.brandSecondary || '#64748b';
    const businessName = photographer?.businessName || 'Your Business';
    const photographerName = photographer?.photographerName || 'Your Name';
    const defaultHeadshot = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=faces';
    const currentHeadshot = headshotUrl || defaultHeadshot;

    if (type === 'header') {
      switch (style) {
        case 'none':
          return '<div style="padding: 20px; text-align: center; color: #999; font-style: italic;">No header</div>';
        case 'minimal':
          return `<div style="text-align: center; padding: 10px 0;"><div style="width: 60px; height: 30px; background: ${primaryColor}; margin: 0 auto; border-radius: 4px;"></div></div>`;
        case 'professional':
          return `<div style="text-align: center; padding: 10px 0; border-bottom: 2px solid ${primaryColor};"><div style="width: 60px; height: 30px; background: ${primaryColor}; margin: 0 auto 5px; border-radius: 4px;"></div><div style="font-size: 12px; font-weight: 600; color: ${primaryColor};">${businessName}</div></div>`;
        case 'bold':
          return `<div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 15px; text-align: center;"><div style="font-size: 14px; font-weight: 700; color: white;">${businessName}</div></div>`;
        case 'classic':
          return `<div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0;"><div style="width: 50px; height: 25px; background: ${primaryColor}; border-radius: 4px;"></div><div style="font-size: 11px; font-weight: 600; color: ${primaryColor};">${businessName}</div></div>`;
        default:
          return '';
      }
    } else {
      switch (style) {
        case 'none':
          return '<div style="padding: 20px; text-align: center; color: #999; font-style: italic;">No signature</div>';
        case 'simple':
          return `<div style="padding: 10px; border-top: 1px solid #e0e0e0; font-size: 11px;"><div style="font-weight: 600; color: ${primaryColor};">${photographerName}</div><div>📞 (555) 123-4567</div><div>✉️ hello@example.com</div></div>`;
        case 'professional':
          return `<div style="padding: 10px; border-top: 2px solid ${primaryColor}; font-size: 11px; display: flex; gap: 10px;"><img src="${currentHeadshot}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 1px solid ${primaryColor};" /><div><div style="font-weight: 600; color: ${primaryColor};">${photographerName}</div><div>📞 (555) 123-4567</div><div>✉️ hello@example.com</div></div></div>`;
        case 'detailed':
          return `<div style="padding: 12px; background: linear-gradient(to bottom, #fff 0%, #f8f9fa 100%); border: 1px solid #e0e0e0; border-radius: 4px; font-size: 10px;"><div style="text-align: center; border-bottom: 1px solid ${primaryColor}; padding-bottom: 8px; margin-bottom: 8px;"><div style="font-weight: 600; color: ${primaryColor};">${businessName}</div></div><div>📞 (555) 123-4567</div><div>✉️ hello@example.com</div></div>`;
        case 'branded':
          return `<div><div style="background: ${primaryColor}; padding: 8px; text-align: center;"><div style="width: 30px; height: 15px; background: white; margin: 0 auto; border-radius: 2px;"></div></div><div style="background: #f8f9fa; padding: 10px; border-left: 3px solid ${primaryColor}; font-size: 10px;"><div style="font-weight: 600; color: ${primaryColor};">${photographerName}</div><div>📞 (555) 123-4567</div></div></div>`;
        default:
          return '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Email Branding</DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Header Styles */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Header Style</h3>
              <p className="text-sm text-muted-foreground">Choose how your emails will start</p>
            </div>
            <RadioGroup value={headerStyle} onValueChange={setHeaderStyle}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {headerStyles.map((style) => (
                  <div key={style.value}>
                    <Label
                      htmlFor={`header-${style.value}`}
                      className="cursor-pointer"
                    >
                      <Card className={`p-4 cursor-pointer transition-all ${headerStyle === style.value ? 'ring-2 ring-primary' : 'hover:border-primary'}`}>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value={style.value} id={`header-${style.value}`} />
                          <div className="flex-1 space-y-2">
                            <div>
                              <div className="font-medium">{style.label}</div>
                              <div className="text-sm text-muted-foreground">{style.description}</div>
                            </div>
                            <div 
                              className="border rounded p-2 bg-white dark:bg-gray-900"
                              dangerouslySetInnerHTML={{ __html: generatePreviewHTML('header', style.value) }}
                            />
                          </div>
                        </div>
                      </Card>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Signature Styles */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Signature Style</h3>
              <p className="text-sm text-muted-foreground">Choose how your emails will end</p>
            </div>
            <RadioGroup value={signatureStyle} onValueChange={setSignatureStyle}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {signatureStyles.map((style) => (
                  <div key={style.value}>
                    <Label
                      htmlFor={`signature-${style.value}`}
                      className="cursor-pointer"
                    >
                      <Card className={`p-4 cursor-pointer transition-all ${signatureStyle === style.value ? 'ring-2 ring-primary' : 'hover:border-primary'}`}>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value={style.value} id={`signature-${style.value}`} />
                          <div className="flex-1 space-y-2">
                            <div>
                              <div className="font-medium">{style.label}</div>
                              <div className="text-sm text-muted-foreground">{style.description}</div>
                            </div>
                            <div 
                              className="border rounded p-2 bg-white dark:bg-gray-900"
                              dangerouslySetInnerHTML={{ __html: generatePreviewHTML('signature', style.value) }}
                            />
                          </div>
                        </div>
                      </Card>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Headshot Upload */}
          {signatureStyle === 'professional' && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h3 className="text-lg font-semibold">Your Photo</h3>
                <p className="text-sm text-muted-foreground">Add a professional headshot for your signature</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img 
                    src={headshotUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=faces'} 
                    alt="Headshot preview" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="headshotUrl">Photo URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="headshotUrl"
                      type="url"
                      value={headshotUrl}
                      onChange={(e) => setHeadshotUrl(e.target.value)}
                      placeholder="https://example.com/your-photo.jpg"
                      data-testid="input-headshot-url"
                    />
                    <Button type="button" variant="outline" size="icon">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Enter a URL to your professional headshot photo</p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="text-lg font-semibold">Contact Information</h3>
              <p className="text-sm text-muted-foreground">This info will appear in your email signatures</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modal-website">Website</Label>
                <Input
                  id="modal-website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  data-testid="input-modal-website"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-businessAddress">Business Address</Label>
                <Input
                  id="modal-businessAddress"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="123 Main St, City, State"
                  data-testid="input-modal-business-address"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Social Media</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modal-facebook">Facebook</Label>
                  <Input
                    id="modal-facebook"
                    type="url"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="https://facebook.com/yourpage"
                    data-testid="input-modal-facebook"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-instagram">Instagram</Label>
                  <Input
                    id="modal-instagram"
                    type="url"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="https://instagram.com/yourprofile"
                    data-testid="input-modal-instagram"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-twitter">Twitter</Label>
                  <Input
                    id="modal-twitter"
                    type="url"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="https://twitter.com/yourhandle"
                    data-testid="input-modal-twitter"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-linkedin">LinkedIn</Label>
                  <Input
                    id="modal-linkedin"
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                    data-testid="input-modal-linkedin"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-branding">
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="button-save-branding">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
