import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Star, Check, X, Sparkles, Trash2, Copy, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface Testimonial {
  id: string;
  photographerId: string;
  clientName: string;
  clientEmail: string | null;
  rating: number;
  testimonialText: string;
  projectId: string | null;
  contactId: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isFeatured: boolean;
  eventDate: string | null;
  eventType: string | null;
  createdAt: string;
  approvedAt: string | null;
}

export default function Testimonials() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<string>("pending");
  
  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ['/api/testimonials'],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/testimonials/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/testimonials'] });
      toast({
        title: "Review approved",
        description: "The review is now visible on your public testimonials page.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve review",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/testimonials/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/testimonials'] });
      toast({
        title: "Review rejected",
        description: "The review has been rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject review",
        variant: "destructive",
      });
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/testimonials/${id}/toggle-featured`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/testimonials'] });
      toast({
        title: "Featured status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update featured status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/testimonials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/testimonials'] });
      toast({
        title: "Review deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete review",
        variant: "destructive",
      });
    },
  });

  const pendingReviews = testimonials.filter(t => t.status === 'PENDING');
  const approvedReviews = testimonials.filter(t => t.status === 'APPROVED');
  const rejectedReviews = testimonials.filter(t => t.status === 'REJECTED');

  const copyReviewLink = () => {
    const link = `${window.location.origin}/reviews/submit/${user?.photographerId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Share this link with your clients to collect reviews.",
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300 dark:text-gray-600"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderTestimonialCard = (testimonial: Testimonial) => {
    return (
      <Card key={testimonial.id} data-testid={`card-testimonial-${testimonial.id}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg">{testimonial.clientName}</CardTitle>
                {testimonial.isFeatured && (
                  <Badge variant="default" className="bg-purple-500">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
                <Badge
                  variant={
                    testimonial.status === 'APPROVED'
                      ? 'default'
                      : testimonial.status === 'PENDING'
                      ? 'secondary'
                      : 'destructive'
                  }
                  data-testid={`badge-status-${testimonial.id}`}
                >
                  {testimonial.status}
                </Badge>
              </div>
              {renderStars(testimonial.rating)}
            </div>
          </div>
          {testimonial.eventType && (
            <CardDescription>
              {testimonial.eventType}
              {testimonial.eventDate && ` • ${format(new Date(testimonial.eventDate), 'MMM d, yyyy')}`}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            "{testimonial.testimonialText}"
          </p>
          <div className="text-xs text-gray-500 mb-4">
            Submitted {format(new Date(testimonial.createdAt), 'MMM d, yyyy')}
            {testimonial.approvedAt && ` • Approved ${format(new Date(testimonial.approvedAt), 'MMM d, yyyy')}`}
          </div>

          <div className="flex flex-wrap gap-2">
            {testimonial.status === 'PENDING' && (
              <>
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(testimonial.id)}
                  disabled={approveMutation.isPending}
                  data-testid={`button-approve-${testimonial.id}`}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => rejectMutation.mutate(testimonial.id)}
                  disabled={rejectMutation.isPending}
                  data-testid={`button-reject-${testimonial.id}`}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {testimonial.status === 'APPROVED' && (
              <Button
                size="sm"
                variant={testimonial.isFeatured ? "secondary" : "outline"}
                onClick={() => toggleFeaturedMutation.mutate(testimonial.id)}
                disabled={toggleFeaturedMutation.isPending}
                data-testid={`button-toggle-featured-${testimonial.id}`}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                {testimonial.isFeatured ? "Unfeature" : "Feature"}
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid={`button-delete-${testimonial.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Review</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this review? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(testimonial.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Testimonials & Reviews
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Manage client reviews and build social proof for your business.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Collect Reviews</CardTitle>
          <CardDescription>
            Share this link with your clients to collect testimonials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm font-mono break-all">
              {`${window.location.origin}/reviews/submit/${user?.photographerId}`}
            </div>
            <Button
              onClick={copyReviewLink}
              data-testid="button-copy-review-link"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingReviews.length})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved ({approvedReviews.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            Rejected ({rejectedReviews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : pendingReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No pending reviews</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingReviews.map(renderTestimonialCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : approvedReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No approved reviews yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {approvedReviews.map(renderTestimonialCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : rejectedReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No rejected reviews</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rejectedReviews.map(renderTestimonialCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
