import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Heart, Share2, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function GalleryDetail() {
  const { galleryId } = useParams();
  const [, setLocation] = useLocation();

  const { data: photographer } = useQuery<any>({
    queryKey: ['/api/photographer'],
  });

  const { data: projects } = useQuery<any[]>({
    queryKey: ['/api/projects'],
  });

  const isShootProofConnected = !!photographer?.shootproofAccessToken;

  // Generate placeholder photos for demo galleries
  const generateDemoPhotos = (galleryId: string, count: number = 24) => {
    const weddingPhotoIds = [
      'photo-1519741497674-611481863552', // Bride portrait
      'photo-1606216794079-e06c86c28c73', // Couple kiss
      'photo-1511285560929-80b456fea0bc', // Rustic wedding
      'photo-1465495976277-4387d4b0b4c6', // Garden wedding
      'photo-1591604466107-ec97de577aff', // Ceremony
      'photo-1464366400600-7168b8af9bc3', // Rings
      'photo-1522673607200-164d1b6ce486', // Reception
      'photo-1583939003579-730e3918a45a', // First dance
      'photo-1529636798458-92182e662485', // Wedding details
      'photo-1523438885200-e635ba2c371e', // Bouquet
      'photo-1532712938310-34cb3982ef74', // Venue
      'photo-1525258592283-2f1df0984c18', // Couple walking
      'photo-1519225421980-715cb0215aed', // Bridal party
      'photo-1460978812857-470ed1c77af0', // Groom
      'photo-1520854221256-17451cc331bf', // Table setting
      'photo-1517457373958-b7bdd4587205', // Outdoor ceremony
      'photo-1469371670807-013ccf25f16a', // Couple portrait
      'photo-1543599538-a6c4ed79c582', // Wedding cake
      'photo-1515934751635-c81c6bc9a2d8', // Dance floor
      'photo-1522413452208-996ff3f3e740', // Toast
      'photo-1545569341-9eb8b30979d9', // Candid moment
      'photo-1544161515-4ab6ce6db874', // Bride getting ready
      'photo-1522413452208-996ff3f3e740', // Reception details
      'photo-1520854221256-17451cc331bf', // Floral centerpiece
    ];

    return Array.from({ length: count }, (_, i) => ({
      id: `${galleryId}-photo-${i}`,
      url: `https://images.unsplash.com/${weddingPhotoIds[i % weddingPhotoIds.length]}?w=800&q=80`,
      thumbnail: `https://images.unsplash.com/${weddingPhotoIds[i % weddingPhotoIds.length]}?w=400&q=80`,
      // Vary the aspect ratio for visual interest
      aspectRatio: i % 4 === 0 ? 'portrait' : i % 4 === 1 ? 'landscape' : i % 4 === 2 ? 'square' : 'landscape',
    }));
  };

  // Default sample galleries
  const defaultGalleries = [
    { id: 'default-1', title: 'Summer Beach Wedding', client: { firstName: 'Sample', lastName: 'Client' }, galleryCreatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), galleryReady: true, galleryUrl: '#', imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80', height: 'tall' },
    { id: 'default-2', title: 'Mountain Engagement', client: { firstName: 'Demo', lastName: 'Couple' }, galleryCreatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), galleryReady: true, galleryUrl: '#', imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80', height: 'short' },
    { id: 'default-3', title: 'Rustic Barn Wedding', client: { firstName: 'Example', lastName: 'Bride' }, galleryCreatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), galleryReady: false, galleryUrl: '#', imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80', height: 'medium' },
    { id: 'default-4', title: 'City Skyline Portraits', client: { firstName: 'Test', lastName: 'User' }, galleryCreatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), galleryReady: true, galleryUrl: '#', imageUrl: 'https://images.unsplash.com/photo-1606216794079-e06c86c28c73?w=800&q=80', height: 'tall' },
    { id: 'default-5', title: 'Garden Party Wedding', client: { firstName: 'Preview', lastName: 'Client' }, galleryCreatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), galleryReady: true, galleryUrl: '#', imageUrl: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80', height: 'medium' },
    { id: 'default-6', title: 'Downtown Loft Wedding', client: { firstName: 'Sample', lastName: 'Couple' }, galleryCreatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), galleryReady: true, galleryUrl: '#', imageUrl: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800&q=80', height: 'short' },
  ];

  const actualProjectsWithGalleries = (projects?.filter((project: any) => project.galleryUrl) || []).map((project: any, index: number) => ({
    ...project,
    height: index % 3 === 0 ? 'tall' : index % 3 === 1 ? 'short' : 'medium'
  }));

  const projectsWithGalleries = isShootProofConnected ? actualProjectsWithGalleries : defaultGalleries;
  const gallery = projectsWithGalleries.find((g: any) => g.id === galleryId);

  if (!gallery) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Gallery not found</h1>
          <Button onClick={() => setLocation('/galleries')} data-testid="button-back-galleries">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Galleries
          </Button>
        </div>
      </div>
    );
  }

  const photos = isShootProofConnected ? [] : generateDemoPhotos(galleryId!);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/galleries')}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold" data-testid="text-gallery-title">
                    {gallery.title}
                  </h1>
                  {!isShootProofConnected && (
                    <Badge variant="secondary" className="text-xs" data-testid="badge-demo">
                      Demo
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span data-testid="text-client-name">
                      {gallery.client.firstName} {gallery.client.lastName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span data-testid="text-gallery-date">
                      {format(new Date(gallery.galleryCreatedAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {!isShootProofConnected && (
                    <Badge variant="outline" className="text-xs" data-testid="badge-photo-count">
                      {photos.length} photos
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" data-testid="button-share">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" data-testid="button-download-all">
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isShootProofConnected && photos.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {photos.map((photo, index) => (
              <Card
                key={photo.id}
                className="break-inside-avoid hover:shadow-xl transition-all duration-300 group cursor-pointer mb-4 overflow-hidden"
                data-testid={`photo-card-${index}`}
              >
                <div className="relative">
                  <img
                    src={photo.url}
                    alt={`Photo ${index + 1}`}
                    className={`w-full object-cover ${
                      photo.aspectRatio === 'portrait' ? 'h-96' :
                      photo.aspectRatio === 'square' ? 'h-64' :
                      'h-80'
                    }`}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" data-testid={`button-favorite-${index}`}>
                        <Heart className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="secondary" data-testid={`button-download-${index}`}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {isShootProofConnected
                ? 'Connect ShootProof to view gallery photos'
                : 'No photos available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
