/**
 * Joins multiple URL parts and ensures no double slashes
 * @param {string} base - The base URL
 * @param {...string} parts - Additional URL parts to join
 * @returns {string} The joined URL
 */

const APPEND_SLASH = `${process.env.APPEND_SLASH}` === 'true' ? true : `${process.env.APPEND_SLASH}` === 'false' ? false : true;

export function urlJoin(base, ...parts) {
  try {
    // Start with the base URL
    let url = new URL(base);
    
    // Flatten arrays and handle nested parts
    const flatParts = parts.flat();
    
    const cleanParts = flatParts
      .filter(Boolean)
      .map(part => String(part).trim())
      .filter(part => part !== '/');  // Filter out standalone slashes
    
    // Append parts to pathname instead of creating new URL
    if (cleanParts.length > 0) {
      url.pathname = [
        url.pathname,
        ...cleanParts
      ].map(part => part.replace(/^\/+|\/+$/g, '')) // Remove leading/trailing slashes
       .filter(Boolean)
       .join('/');
    }
    
    // Ensure pathname starts with /
    if (!url.pathname.startsWith('/')) {
      url.pathname = '/' + url.pathname;
    }

    // Append trailing slash if APPEND_SLASH is true
    if (APPEND_SLASH && !url.pathname.endsWith('/')) {
      url.pathname += '/';
    }
    
    return url.toString();
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }
}

export default urlJoin;