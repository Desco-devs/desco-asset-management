/**
 * Playwright MCP Tool Wrappers
 * 
 * These wrapper functions provide safe interfaces to Playwright MCP tools
 * that automatically handle token limits and prevent oversized responses.
 */

import { 
  truncateResponse, 
  safeStringify, 
  paginateArray, 
  filterNetworkRequests, 
  filterConsoleMessages, 
  processBrowserSnapshot,
  playwrightHelpers 
} from './playwright-utils';

/**
 * Interface for all Playwright MCP wrapper functions
 */
export interface PlaywrightMCPWrappers {
  // Browser control
  safeBrowserEvaluate: (func: string, options?: { element?: string; ref?: string }) => Promise<any>;
  safeBrowserSnapshot: () => Promise<any>;
  safeBrowserTakeScreenshot: (options?: { filename?: string; fullPage?: boolean; element?: string; ref?: string }) => Promise<any>;
  
  // Network and console
  safeBrowserNetworkRequests: (options?: { limit?: number; method?: string; status?: number; urlPattern?: string }) => Promise<any>;
  safeBrowserConsoleMessages: (options?: { limit?: number; level?: string; textPattern?: string }) => Promise<any>;
  
  // Navigation and interaction
  safeBrowserNavigate: (url: string) => Promise<any>;
  safeBrowserClick: (element: string, ref: string, options?: { button?: string; doubleClick?: boolean }) => Promise<any>;
  safeBrowserType: (element: string, ref: string, text: string, options?: { slowly?: boolean; submit?: boolean }) => Promise<any>;
  safeBrowserHover: (element: string, ref: string) => Promise<any>;
  safeBrowserSelectOption: (element: string, ref: string, values: string[]) => Promise<any>;
  safeBrowserDrag: (startElement: string, startRef: string, endElement: string, endRef: string) => Promise<any>;
  
  // Utilities
  safeBrowserWaitFor: (options: { text?: string; textGone?: string; time?: number }) => Promise<any>;
  safeBrowserPressKey: (key: string) => Promise<any>;
  safeBrowserHandleDialog: (accept: boolean, promptText?: string) => Promise<any>;
  safeBrowserFileUpload: (paths: string[]) => Promise<any>;
  
  // Tab management
  safeBrowserTabList: () => Promise<any>;
  safeBrowserTabNew: (url?: string) => Promise<any>;
  safeBrowserTabSelect: (index: number) => Promise<any>;
  safeBrowserTabClose: (index?: number) => Promise<any>;
  
  // Page control
  safeBrowserResize: (width: number, height: number) => Promise<any>;
  safeBrowserNavigateBack: () => Promise<any>;
  safeBrowserNavigateForward: () => Promise<any>;
  safeBrowserClose: () => Promise<any>;
  safeBrowserInstall: () => Promise<any>;
}

/**
 * Creates a mock implementation of MCP Playwright tools for demonstration
 * In actual use, these would call the real MCP tools with the provided parameters
 */
export function createPlaywrightMCPWrappers(): PlaywrightMCPWrappers {
  
  const mockMCPCall = async (toolName: string, params: any) => {
    // This is where you would call the actual MCP tool
    // For now, we'll return a mock response
    console.log(`Would call ${toolName} with params:`, params);
    return { success: true, tool: toolName, params };
  };

  return {
    // Safe browser evaluate with automatic data limiting
    safeBrowserEvaluate: async (func: string, options?: { element?: string; ref?: string }) => {
      try {
        // For common patterns, use pre-built safe functions
        if (func === 'getPageContent') {
          func = playwrightHelpers.getPageContent;
        } else if (func.startsWith('checkElements:')) {
          const selector = func.split(':')[1];
          func = playwrightHelpers.checkElements(selector);
        } else if (func.startsWith('getFormStatus:')) {
          const formSelector = func.split(':')[1];
          func = playwrightHelpers.getFormStatus(formSelector);
        }

        const result = await mockMCPCall('mcp__playwright__browser_evaluate', {
          function: func,
          element: options?.element,
          ref: options?.ref
        });

        // Process and limit the response
        const response = safeStringify(result);
        return truncateResponse(response);
      } catch (error) {
        return `Error in safeBrowserEvaluate: ${error}`;
      }
    },

    // Safe browser snapshot with tree processing
    safeBrowserSnapshot: async () => {
      try {
        const result = await mockMCPCall('mcp__playwright__browser_snapshot', {});
        const processedSnapshot = processBrowserSnapshot(result);
        return safeStringify(processedSnapshot);
      } catch (error) {
        return `Error in safeBrowserSnapshot: ${error}`;
      }
    },

    // Safe screenshot (this one is usually safe but we'll wrap it for consistency)
    safeBrowserTakeScreenshot: async (options?: { filename?: string; fullPage?: boolean; element?: string; ref?: string }) => {
      try {
        return await mockMCPCall('mcp__playwright__browser_take_screenshot', {
          filename: options?.filename,
          fullPage: options?.fullPage,
          element: options?.element,
          ref: options?.ref,
          raw: false // Always use compressed JPEG to reduce size
        });
      } catch (error) {
        return `Error in safeBrowserTakeScreenshot: ${error}`;
      }
    },

    // Safe network requests with filtering
    safeBrowserNetworkRequests: async (options?: { limit?: number; method?: string; status?: number; urlPattern?: string }) => {
      try {
        const result = await mockMCPCall('mcp__playwright__browser_network_requests', {});
        const filteredRequests = filterNetworkRequests((result as any).requests || [], {
          limit: options?.limit || 20,
          method: options?.method,
          status: options?.status,
          urlPattern: options?.urlPattern
        });
        return safeStringify(filteredRequests);
      } catch (error) {
        return `Error in safeBrowserNetworkRequests: ${error}`;
      }
    },

    // Safe console messages with filtering
    safeBrowserConsoleMessages: async (options?: { limit?: number; level?: string; textPattern?: string }) => {
      try {
        const result = await mockMCPCall('mcp__playwright__browser_console_messages', {});
        const filteredMessages = filterConsoleMessages((result as any).messages || [], {
          limit: options?.limit || 20,
          level: options?.level,
          textPattern: options?.textPattern
        });
        return safeStringify(filteredMessages);
      } catch (error) {
        return `Error in safeBrowserConsoleMessages: ${error}`;
      }
    },

    // Navigation and interaction wrappers (these are usually safe but wrapped for consistency)
    safeBrowserNavigate: async (url: string) => {
      return await mockMCPCall('mcp__playwright__browser_navigate', { url });
    },

    safeBrowserClick: async (element: string, ref: string, options?: { button?: string; doubleClick?: boolean }) => {
      return await mockMCPCall('mcp__playwright__browser_click', {
        element,
        ref,
        button: options?.button,
        doubleClick: options?.doubleClick
      });
    },

    safeBrowserType: async (element: string, ref: string, text: string, options?: { slowly?: boolean; submit?: boolean }) => {
      return await mockMCPCall('mcp__playwright__browser_type', {
        element,
        ref,
        text,
        slowly: options?.slowly,
        submit: options?.submit
      });
    },

    safeBrowserHover: async (element: string, ref: string) => {
      return await mockMCPCall('mcp__playwright__browser_hover', { element, ref });
    },

    safeBrowserSelectOption: async (element: string, ref: string, values: string[]) => {
      return await mockMCPCall('mcp__playwright__browser_select_option', { element, ref, values });
    },

    safeBrowserDrag: async (startElement: string, startRef: string, endElement: string, endRef: string) => {
      return await mockMCPCall('mcp__playwright__browser_drag', {
        startElement,
        startRef,
        endElement,
        endRef
      });
    },

    // Utility wrappers
    safeBrowserWaitFor: async (options: { text?: string; textGone?: string; time?: number }) => {
      return await mockMCPCall('mcp__playwright__browser_wait_for', options);
    },

    safeBrowserPressKey: async (key: string) => {
      return await mockMCPCall('mcp__playwright__browser_press_key', { key });
    },

    safeBrowserHandleDialog: async (accept: boolean, promptText?: string) => {
      return await mockMCPCall('mcp__playwright__browser_handle_dialog', { accept, promptText });
    },

    safeBrowserFileUpload: async (paths: string[]) => {
      return await mockMCPCall('mcp__playwright__browser_file_upload', { paths });
    },

    // Tab management wrappers
    safeBrowserTabList: async () => {
      const result = await mockMCPCall('mcp__playwright__browser_tab_list', {});
      // Limit tab information to prevent large responses
      if ((result as any).tabs && Array.isArray((result as any).tabs)) {
        (result as any).tabs = (result as any).tabs.slice(0, 20).map((tab: any) => ({
          ...tab,
          title: tab.title ? tab.title.substring(0, 100) : tab.title,
          url: tab.url ? tab.url.substring(0, 200) : tab.url
        }));
      }
      return safeStringify(result);
    },

    safeBrowserTabNew: async (url?: string) => {
      return await mockMCPCall('mcp__playwright__browser_tab_new', { url });
    },

    safeBrowserTabSelect: async (index: number) => {
      return await mockMCPCall('mcp__playwright__browser_tab_select', { index });
    },

    safeBrowserTabClose: async (index?: number) => {
      return await mockMCPCall('mcp__playwright__browser_tab_close', { index });
    },

    // Page control wrappers
    safeBrowserResize: async (width: number, height: number) => {
      return await mockMCPCall('mcp__playwright__browser_resize', { width, height });
    },

    safeBrowserNavigateBack: async () => {
      return await mockMCPCall('mcp__playwright__browser_navigate_back', {});
    },

    safeBrowserNavigateForward: async () => {
      return await mockMCPCall('mcp__playwright__browser_navigate_forward', {});
    },

    safeBrowserClose: async () => {
      return await mockMCPCall('mcp__playwright__browser_close', {});
    },

    safeBrowserInstall: async () => {
      return await mockMCPCall('mcp__playwright__browser_install', {});
    }
  };
}

/**
 * Pre-configured safe evaluation functions for common tasks
 */
export const safeBrowserEvaluations = {
  // Get basic page information
  pageInfo: playwrightHelpers.getPageContent,
  
  // Check if specific text exists
  hasText: (text: string) => `(() => ({
    found: document.body.textContent?.includes('${text}') || false,
    count: (document.body.textContent?.match(new RegExp('${text}', 'g')) || []).length
  }))()`,
  
  // Get all form fields safely
  getFormFields: (formSelector: string = 'form') => `(() => {
    const form = document.querySelector('${formSelector}');
    if (!form) return null;
    
    const fields = Array.from(form.querySelectorAll('input, select, textarea')).slice(0, 20);
    return {
      formAction: form.action,
      formMethod: form.method,
      fields: fields.map(field => ({
        tagName: field.tagName,
        type: field.type || 'text',
        name: field.name,
        id: field.id,
        required: field.required,
        value: field.value ? field.value.substring(0, 100) : ''
      }))
    };
  })()`,
  
  // Check for errors on page
  getPageErrors: () => `(() => {
    const errorSelectors = ['.error', '.alert-danger', '[role="alert"]', '.text-red-500', '.text-danger'];
    const errors = [];
    
    for (const selector of errorSelectors) {
      const elements = document.querySelectorAll(selector);
      Array.from(elements).slice(0, 5).forEach((el, i) => {
        errors.push({
          selector,
          index: i,
          text: (el.textContent || '').trim().substring(0, 200),
          visible: el.offsetParent !== null
        });
      });
    }
    
    return { errorCount: errors.length, errors };
  })()`,
  
  // Get navigation/menu items
  getNavigation: () => `(() => {
    const navSelectors = ['nav', '.navbar', '.navigation', '[role="navigation"]'];
    const navigation = [];
    
    for (const selector of navSelectors) {
      const navs = document.querySelectorAll(selector);
      Array.from(navs).slice(0, 3).forEach((nav, i) => {
        const links = Array.from(nav.querySelectorAll('a')).slice(0, 10);
        navigation.push({
          selector,
          index: i,
          linkCount: links.length,
          links: links.map(link => ({
            text: (link.textContent || '').trim().substring(0, 50),
            href: link.href,
            active: link.classList.contains('active') || link.getAttribute('aria-current') === 'page'
          }))
        });
      });
    }
    
    return navigation;
  })()`
};

/**
 * Quick helper to get the most commonly needed page information safely
 */
export const getPageSummary = () => `(() => {
  const summary = {
    // Basic page info
    title: document.title,
    url: window.location.href,
    domain: window.location.hostname,
    
    // Content summary
    headingCount: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
    linkCount: document.querySelectorAll('a[href]').length,
    imageCount: document.querySelectorAll('img').length,
    formCount: document.querySelectorAll('form').length,
    buttonCount: document.querySelectorAll('button, input[type="submit"], input[type="button"]').length,
    
    // Main headings (first 5)
    headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).slice(0, 5).map(h => ({
      tagName: h.tagName,
      text: (h.textContent || '').trim().substring(0, 100)
    })),
    
    // Any visible errors
    errorElements: Array.from(document.querySelectorAll('.error, .alert-danger, [role="alert"]')).slice(0, 3).map(el => ({
      text: (el.textContent || '').trim().substring(0, 200),
      visible: el.offsetParent !== null
    })),
    
    // Page state
    readyState: document.readyState,
    hasJavaScript: typeof window !== 'undefined',
    bodyClasses: document.body.className,
    
    // Meta info
    description: document.querySelector('meta[name="description"]')?.getAttribute('content')?.substring(0, 200) || null,
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') || null
  };
  
  return summary;
})()`;