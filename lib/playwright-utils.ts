/**
 * Playwright MCP Token Limit Utilities
 * 
 * These utilities help prevent MCP tool responses from exceeding the 25,000 token limit
 * by providing data filtering, pagination, and size limiting functions.
 */

/**
 * Maximum allowed response size in characters (approximate)
 * 25,000 tokens ≈ 75,000-100,000 characters depending on content
 */
const MAX_RESPONSE_SIZE = 75000;

/**
 * Truncates a string to stay within token limits
 */
export function truncateResponse(data: string, maxSize: number = MAX_RESPONSE_SIZE): string {
  if (data.length <= maxSize) return data;
  
  return data.substring(0, maxSize - 100) + '\n\n... [TRUNCATED DUE TO SIZE LIMIT]';
}

/**
 * Safely converts object to JSON with size checking
 */
export function safeStringify(obj: any, maxSize: number = MAX_RESPONSE_SIZE): string {
  try {
    const json = JSON.stringify(obj, null, 2);
    return truncateResponse(json, maxSize);
  } catch (error) {
    return `Error serializing object: ${error}`;
  }
}

/**
 * Limits array results with pagination
 */
export function paginateArray<T>(
  array: T[], 
  page: number = 0, 
  pageSize: number = 50
): { data: T[]; totalItems: number; currentPage: number; totalPages: number } {
  const start = page * pageSize;
  const end = start + pageSize;
  
  return {
    data: array.slice(start, end),
    totalItems: array.length,
    currentPage: page,
    totalPages: Math.ceil(array.length / pageSize)
  };
}

/**
 * Safe browser evaluate function that limits response size
 */
export function createSafeBrowserEvaluate() {
  return {
    // Get page title and basic info
    getPageInfo: () => ({
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      readyState: document.readyState,
      elementCount: document.getElementsByTagName('*').length
    }),

    // Get limited DOM elements
    getElements: (selector: string, limit: number = 20) => {
      const elements = Array.from(document.querySelectorAll(selector));
      return elements.slice(0, limit).map((el, index) => ({
        index,
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        textContent: el.textContent?.substring(0, 200) || '',
        attributes: Array.from(el.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {} as Record<string, string>)
      }));
    },

    // Get form data safely
    getFormData: (formSelector: string) => {
      const form = document.querySelector(formSelector) as HTMLFormElement;
      if (!form) return null;
      
      const formData = new FormData(form);
      const data: Record<string, string> = {};
      
      for (const [key, value] of formData.entries()) {
        data[key] = typeof value === 'string' ? value.substring(0, 500) : '[File]';
      }
      
      return {
        action: form.action,
        method: form.method,
        data,
        elementCount: form.elements.length
      };
    },

    // Get console logs safely
    getConsoleLogs: () => {
      // Note: This requires console.log override to capture logs
      return {
        message: 'Console logs must be captured during page evaluation',
        suggestion: 'Use browser_console_messages tool instead'
      };
    },

    // Get network requests summary
    getNetworkSummary: () => {
      // This is limited as we can't access network requests directly from page context
      return {
        message: 'Network requests must be accessed via browser_network_requests tool',
        performanceEntries: performance.getEntriesByType('navigation').length,
        resourceEntries: performance.getEntriesByType('resource').length
      };
    },

    // Get page performance metrics
    getPerformanceMetrics: () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || null,
        largestContentfulPaint: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime || null
      };
    },

    // Check for specific text on page
    hasText: (text: string) => {
      return {
        found: document.body.textContent?.includes(text) || false,
        count: (document.body.textContent?.match(new RegExp(text, 'g')) || []).length
      };
    },

    // Get page errors
    getPageErrors: () => {
      // This requires error event listeners to be set up
      return {
        message: 'Page errors must be captured via error event listeners',
        suggestion: 'Set up error handlers during page navigation'
      };
    }
  };
}

/**
 * Safe network requests filter
 */
export function filterNetworkRequests(requests: any[], options: {
  limit?: number;
  method?: string;
  status?: number;
  urlPattern?: string;
} = {}) {
  let filtered = requests;
  
  if (options.method) {
    filtered = filtered.filter(req => req.method === options.method);
  }
  
  if (options.status) {
    filtered = filtered.filter(req => req.status === options.status);
  }
  
  if (options.urlPattern) {
    const pattern = new RegExp(options.urlPattern, 'i');
    filtered = filtered.filter(req => pattern.test(req.url));
  }
  
  if (options.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  
  // Truncate large response bodies and headers
  return filtered.map(req => ({
    ...req,
    headers: req.headers ? Object.fromEntries(
      Object.entries(req.headers).slice(0, 10)
    ) : {},
    body: req.body ? (req.body.length > 1000 ? req.body.substring(0, 1000) + '...' : req.body) : null
  }));
}

/**
 * Safe console messages filter
 */
export function filterConsoleMessages(messages: any[], options: {
  limit?: number;
  level?: string;
  textPattern?: string;
} = {}) {
  let filtered = messages;
  
  if (options.level) {
    filtered = filtered.filter(msg => msg.type === options.level);
  }
  
  if (options.textPattern) {
    const pattern = new RegExp(options.textPattern, 'i');
    filtered = filtered.filter(msg => pattern.test(msg.text));
  }
  
  if (options.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  
  // Truncate long messages
  return filtered.map(msg => ({
    ...msg,
    text: msg.text && msg.text.length > 500 ? msg.text.substring(0, 500) + '...' : msg.text,
    args: msg.args ? msg.args.slice(0, 5) : [] // Limit args array
  }));
}

/**
 * Safe snapshot data processor
 */
export function processBrowserSnapshot(snapshot: any) {
  if (!snapshot) return null;
  
  const processNode = (node: any, depth: number = 0): any => {
    if (depth > 10) return { type: 'truncated', reason: 'max_depth' }; // Prevent infinite recursion
    
    const processed: any = {
      role: node.role,
      name: node.name,
      value: node.value,
      description: node.description,
      keyshortcuts: node.keyshortcuts,
      roledescription: node.roledescription,
      valuetext: node.valuetext
    };
    
    // Truncate long text values
    if (processed.name && processed.name.length > 200) {
      processed.name = processed.name.substring(0, 200) + '...';
    }
    if (processed.value && processed.value.length > 200) {
      processed.value = processed.value.substring(0, 200) + '...';
    }
    
    // Process children with limits
    if (node.children && Array.isArray(node.children)) {
      processed.children = node.children
        .slice(0, 50) // Limit number of children
        .map((child: any) => processNode(child, depth + 1));
    }
    
    return processed;
  };
  
  return processNode(snapshot);
}

/**
 * Example usage functions for common Playwright MCP scenarios
 */
export const playwrightHelpers = {
  // Safe way to get page content
  getPageContent: `(() => {
    const helpers = ${createSafeBrowserEvaluate.toString()}();
    const safeEval = helpers();
    return {
      pageInfo: safeEval.getPageInfo(),
      headings: safeEval.getElements('h1, h2, h3, h4, h5, h6', 10),
      links: safeEval.getElements('a[href]', 15),
      buttons: safeEval.getElements('button, input[type="submit"], input[type="button"]', 10),
      forms: safeEval.getElements('form', 5),
      errors: safeEval.getElements('.error, .alert-danger, [role="alert"]', 5)
    };
  })()`,

  // Safe way to check for specific elements
  checkElements: (selector: string) => `(() => {
    const elements = document.querySelectorAll('${selector}');
    return {
      count: elements.length,
      found: elements.length > 0,
      first10: Array.from(elements).slice(0, 10).map((el, i) => ({
        index: i,
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        textContent: (el.textContent || '').substring(0, 100)
      }))
    };
  })()`,

  // Safe way to get form status
  getFormStatus: (formSelector: string) => `(() => {
    const helpers = ${createSafeBrowserEvaluate.toString()}();
    const safeEval = helpers();
    return safeEval.getFormData('${formSelector}');
  })()`
};