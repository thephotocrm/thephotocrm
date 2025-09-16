/**
 * Shared template rendering utility that supports both {variable} and {{variable}} formats
 * Fixes the critical bug where single-brace tokens were replaced before double-brace tokens
 */

/**
 * Escapes special regex characters in a string
 */
function escapeRegexKey(key: string): string {
  return key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Renders template variables in both {variable} and {{variable}} formats
 * Double-brace format takes precedence to avoid corruption during replacement
 * 
 * @param template - Template string containing variables
 * @param variables - Object mapping variable names to values
 * @returns Rendered template with variables replaced
 * 
 * @example
 * renderTemplate("Hello {{firstName}} {lastName}!", { firstName: "John", lastName: "Doe" })
 * // Returns: "Hello John Doe!"
 */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const escapedKey = escapeRegexKey(key);
    
    // Single regex pattern that handles both formats with optional whitespace
    // Double braces pattern comes first to take precedence
    const pattern = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}|\\{\\s*${escapedKey}\\s*\\}`, 'g');
    
    rendered = rendered.replace(pattern, value);
  }
  
  return rendered;
}