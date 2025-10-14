import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, Calendar, Mail, Phone, MapPin, Filter, Search, Plus, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { format } from "date-fns";

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  leadSource: string;
  projectType: string;
  createdAt: string;
}

export default function LeadHub() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all");

  // Fetch contacts (leads)
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts']
  });

  // Calculate stats
  const totalLeads = contacts.length;
  const thisMonth = contacts.filter(c => {
    const createdDate = new Date(c.createdAt);
    const now = new Date();
    return createdDate.getMonth() === now.getMonth() && 
           createdDate.getFullYear() === now.getFullYear();
  }).length;

  const leadSources = Array.from(new Set(contacts.map(c => c.leadSource)));

  // Filter contacts
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSource = filterSource === "all" || contact.leadSource === filterSource;
    
    let matchesDate = true;
    if (filterDate !== "all") {
      const createdDate = new Date(contact.createdAt);
      const now = new Date();
      
      if (filterDate === "today") {
        matchesDate = createdDate.toDateString() === now.toDateString();
      } else if (filterDate === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = createdDate >= weekAgo;
      } else if (filterDate === "month") {
        matchesDate = createdDate.getMonth() === now.getMonth() && 
                     createdDate.getFullYear() === now.getFullYear();
      }
    }

    return matchesSearch && matchesSource && matchesDate;
  });

  // Get source badge color
  const getSourceBadgeVariant = (source: string) => {
    if (source.includes('WEBSITE') || source.includes('WIDGET')) return 'default';
    if (source.includes('ADVERTISING')) return 'destructive';
    if (source.includes('REFERRAL')) return 'secondary';
    return 'outline';
  };

  // Get initials for avatar
  const getInitials = (firstName: string, lastName: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Lead Hub</h1>
          <p className="text-muted-foreground">
            Manage and track all your exclusive leads in one place
          </p>
        </div>
        <Button 
          onClick={() => setLocation('/contacts')}
          data-testid="button-add-contact"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-3xl font-bold" data-testid="text-total-leads">{totalLeads}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-3xl font-bold" data-testid="text-monthly-leads">{thisMonth}</div>
                <p className="text-xs text-muted-foreground">New leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-3xl font-bold" data-testid="text-lead-sources">{leadSources.length}</div>
                <p className="text-xs text-muted-foreground">Active sources</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>Search and filter your leads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-leads"
                />
              </div>
            </div>
            
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-filter-source">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {leadSources.map(source => (
                  <SelectItem key={source} value={source}>{source.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDate} onValueChange={setFilterDate}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-filter-date">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lead Cards */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading leads...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No leads found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterSource !== "all" || filterDate !== "all" 
                  ? "Try adjusting your filters"
                  : "Your leads will appear here once they start coming in"}
              </p>
              {!searchQuery && filterSource === "all" && filterDate === "all" && (
                <Button onClick={() => setLocation('/budget-estimator')} variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Set Up Advertising
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredContacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow" data-testid={`card-lead-${contact.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold">
                      {getInitials(contact.firstName, contact.lastName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="text-lg font-semibold" data-testid={`text-lead-name-${contact.id}`}>
                          {contact.firstName} {contact.lastName || ''}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getSourceBadgeVariant(contact.leadSource)} data-testid={`badge-source-${contact.id}`}>
                            {contact.leadSource.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant="outline">{contact.projectType}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(contact.createdAt), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(contact.createdAt), 'h:mm a')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {contact.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline truncate">
                            {contact.email}
                          </a>
                        </div>
                      )}
                      
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                            {contact.phone}
                          </a>
                        </div>
                      )}

                      {(contact.city || contact.state) && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {[contact.city, contact.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setLocation(`/contacts`)}
                        data-testid={`button-view-contact-${contact.id}`}
                      >
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setLocation(`/projects`)}
                        data-testid={`button-create-project-${contact.id}`}
                      >
                        Create Project
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
