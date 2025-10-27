/**
 * Utility functions for consistent avatar display across the application
 */

/**
 * Generate a consistent color for each contact based on their ID
 * This ensures the same contact always has the same color across all pages
 */
export const getAvatarColor = (contactId: string) => {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500',
  ];
  
  // Simple hash function to get consistent color for same ID
  let hash = 0;
  for (let i = 0; i < contactId.length; i++) {
    hash = contactId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

/**
 * Generate initials from first and last name
 */
export const getInitials = (firstName?: string, lastName?: string) => {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return (first + last).toUpperCase() || '?';
};
