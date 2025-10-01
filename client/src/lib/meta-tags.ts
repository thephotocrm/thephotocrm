/**
 * Utility functions for dynamically setting meta tags for SEO and social sharing
 */

interface MetaTagOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

/**
 * Updates Open Graph and Twitter meta tags dynamically
 * Useful for client-facing pages that need custom branding per photographer
 */
export function updateMetaTags(options: MetaTagOptions) {
  const { title, description, image, url } = options;

  // Update page title
  if (title) {
    document.title = title;
    updateOrCreateMeta('og:title', title, 'property');
    updateOrCreateMeta('twitter:title', title, 'name');
  }

  // Update description
  if (description) {
    updateOrCreateMeta('description', description, 'name');
    updateOrCreateMeta('og:description', description, 'property');
    updateOrCreateMeta('twitter:description', description, 'name');
  }

  // Update image (for link previews)
  if (image) {
    updateOrCreateMeta('og:image', image, 'property');
    updateOrCreateMeta('twitter:image', image, 'name');
    updateOrCreateMeta('twitter:card', 'summary_large_image', 'name');
  }

  // Update URL
  if (url) {
    updateOrCreateMeta('og:url', url, 'property');
  }

  // Set type
  updateOrCreateMeta('og:type', 'website', 'property');
}

/**
 * Helper function to update or create a meta tag
 */
function updateOrCreateMeta(key: string, value: string, attribute: 'name' | 'property') {
  let element = document.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement;
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  
  element.content = value;
}

/**
 * Removes dynamically added meta tags (useful for cleanup)
 */
export function clearDynamicMetaTags() {
  const metaKeys = [
    'og:title',
    'og:description', 
    'og:image',
    'og:url',
    'og:type',
    'twitter:title',
    'twitter:description',
    'twitter:image',
    'twitter:card'
  ];

  metaKeys.forEach(key => {
    const property = document.querySelector(`meta[property="${key}"]`);
    const name = document.querySelector(`meta[name="${key}"]`);
    if (property) property.remove();
    if (name) name.remove();
  });
}
