/**
 * Avatar utility functions for consistent avatar handling across the app
 */

/**
 * Get avatar URL with fallback to default avatar
 * @param {string} profilePictureUrl - User's profile picture URL
 * @returns {string} Avatar URL or default avatar path
 */
export const getAvatarUrl = (profilePictureUrl) => {
  return profilePictureUrl || '/default-avatar.svg'
}

/**
 * Handle avatar image error by setting default avatar
 * @param {Event} event - Image error event
 */
export const handleAvatarError = (event) => {
  event.target.src = '/default-avatar.svg'
}

/**
 * Get user initials for avatar fallback
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @returns {string} User initials (max 2 characters)
 */
export const getUserInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return first + last
}

/**
 * Component for rendering user avatar with fallbacks
 * @param {Object} props - Component props
 * @param {string} props.src - Avatar image source
 * @param {string} props.alt - Alt text for image
 * @param {string} props.className - CSS class name
 * @param {string} props.firstName - User's first name (for initials fallback)
 * @param {string} props.lastName - User's last name (for initials fallback)
 * @param {boolean} props.showInitials - Whether to show initials as fallback
 */
export const Avatar = ({ 
  src, 
  alt, 
  className = '', 
  firstName = '', 
  lastName = '', 
  showInitials = false,
  ...props 
}) => {
  const initials = getUserInitials(firstName, lastName)
  
  if (src) {
    return (
      <img 
        src={getAvatarUrl(src)}
        alt={alt}
        className={className}
        onError={handleAvatarError}
        {...props}
      />
    )
  }
  
  if (showInitials && initials) {
    return (
      <div className={`${className} avatar-initials`} {...props}>
        {initials}
      </div>
    )
  }
  
  return (
    <img 
      src="/default-avatar.svg"
      alt={alt}
      className={className}
      {...props}
    />
  )
}

export default {
  getAvatarUrl,
  handleAvatarError,
  getUserInitials,
  Avatar
}
