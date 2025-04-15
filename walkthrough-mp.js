// Walkthrough.js - Auto-Configuring Multi-Page AI Walkthrough Generator

// OpenAI API Key (Replace with your actual key)
const OPENAI_API_KEY = "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"; // Replace with a valid OpenAI API key

// ================================================
// Domain-specific storage with expiration
// ================================================

// Get unique domain identifier for storage keys
function getDomainKey() {
    const hostname = window.location.hostname;
    return `walkthrough_${hostname.replace(/[^a-z0-9]/gi, '_')}`;
}

// Session expiration duration (in milliseconds) - default: 2 hours
const SESSION_EXPIRATION = 2 * 60 * 60 * 1000;

// Global state to track walkthrough progress and discovered pages
let walkthroughState = {
    currentPage: window.location.pathname || "/index.html",
    steps: [],
    currentStepIndex: 0,
    userQuery: "",
    allElements: {}, // Will store elements from all pages
    discoveredPages: new Set(), // Auto-discovered pages
    crawlInProgress: false,
    sessionId: generateSessionId(), // Unique session identifier
    timestamp: Date.now(), // For expiration checking
    domainIdentifier: getDomainKey(), // Ensure correct domain separation
    completionFlag: false // Add this flag to track whether walkthrough is complete
};

// Generate a unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ================================================
// Utility functions to load external CSS and JS files
// ================================================
function loadCSS(url) {
    return new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        link.onload = () => resolve(url);
        link.onerror = () => reject(new Error(`Failed to load CSS: ${url}`));
        document.head.appendChild(link);
    });
}

function loadJS(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.onload = () => resolve(url);
        script.onerror = () => reject(new Error(`Failed to load JS: ${url}`));
        document.head.appendChild(script);
    });
}

// ================================================
// Load required dependencies
// ================================================
function loadDependencies() {
    return Promise.all([
        loadCSS("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"),
        loadCSS("https://cdnjs.cloudflare.com/ajax/libs/intro.js/7.0.1/introjs.min.css"),
        loadCSS("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap"),
        loadJS("https://cdnjs.cloudflare.com/ajax/libs/intro.js/7.0.1/intro.min.js")
    ]);
}

// ================================================
// Customize Intro.js Styles for Premium Look
// ================================================
function customizeIntroJS() {
    const customStyles = document.createElement("style");
    customStyles.innerHTML = `
        .introjs-tooltip {
            background: #121212;
            color: #fff;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            font-family: 'Inter', sans-serif;
            max-width: 400px;
            border: 1px solid #303030;
        }
        
        .introjs-tooltiptext {
            padding: 20px;
            line-height: 1.6;
        }
        
        .introjs-tooltipbuttons {
            border-top: 1px solid #303030;
            background: #121212;
        }
        
        .introjs-button {
            color: #fff;
            background: #1e1e1e;
            border: 1px solid #333;
            text-shadow: none;
            font-weight: 500;
            border-radius: 4px;
            padding: 8px 16px;
            transition: all 0.2s ease;
        }
        
        .introjs-button:hover {
            background: #333;
            color: #ffdd87;
        }
        
        .introjs-button.introjs-nextbutton {
            background: #ffdd87;
            color: #121212;
            border: none;
        }
        
        .introjs-button.introjs-nextbutton:hover {
            background: #eac667;
        }
        
        /* Fix for Font Awesome icons in buttons */
        .introjs-button i.fas {
            display: inline-block;
            font-family: 'Font Awesome 6 Free';
            font-weight: 900;
            font-style: normal;
            margin: 0 4px;
        }
        
        .introjs-helperLayer {
            box-shadow: 0 0 0 1000em rgba(0, 0, 0, 0.7);
            border: 2px solid #ffdd87;
        }
        
        .introjs-arrow.top {
            border-bottom-color: #121212;
        }
        
        .introjs-arrow.bottom {
            border-top-color: #121212;
        }
        
        .introjs-arrow.left {
            border-right-color: #121212;
        }
        
        .introjs-arrow.right {
            border-left-color: #121212;
        }
        
        .introjs-progress {
            background-color: #333;
        }
        
        .introjs-progressbar {
            background-color: #ffdd87;
        }
    `;
    document.head.appendChild(customStyles);
}

// ================================================
// UI Injection: Floating Icon & Query Modal
// ================================================
function injectUI() {
    if (document.getElementById("wt-floating-icon")) return; // Prevent duplicate UI injection

    // Create and inject the floating icon
    const floatingIcon = document.createElement("div");
    floatingIcon.id = "wt-floating-icon";
    floatingIcon.innerHTML = '<i class="fas fa-lightbulb"></i>';
    document.body.appendChild(floatingIcon);

    // Create and inject the modal dialog
    // Create and inject the modal dialog
    const modal = document.createElement("div");
    modal.id = "wt-query-modal";
    modal.innerHTML = `
        <div id="wt-modal-content">
            <div id="wt-modal-header">
                <h3>AI Assistant</h3>
                <button id="wt-close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div id="wt-modal-body">
                <p>What would you like help with?</p>
                <div id="wt-input-container">
                    <input type="text" id="wt-walkthrough-input" placeholder="e.g., How do I edit the table?" />
                    <button id="wt-generate-walkthrough"><i class="fas fa-play"></i></button>
                </div>
                <div id="wt-suggestions">
                    <div class="wt-suggestion-chip">How do I filter data?</div>
                    <div class="wt-suggestion-chip">Where are the settings?</div>
                    <div class="wt-suggestion-chip">How to export reports?</div>
                </div>
                <!-- Session controls without details -->
                <div id="wt-session-controls" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #303030;">
                    <div style="display: flex; justify-content: space-between; gap: 10px;">
                        <button id="wt-reset-walkthrough" class="wt-control-button">Reset Current Session</button>
                        <button id="wt-clear-all-walkthroughs" class="wt-control-button">Clear All Sessions</button>
                    </div>
                </div>
            </div>
            <div id="wt-loading" style="display: none;">
                <div class="wt-spinner"></div>
                <p>Generating walkthrough...</p>
            </div>
            <!-- Keep the crawl status element but make it hidden -->
            <div id="wt-crawl-status" style="display: none;"></div>
            <!-- Hidden container for session details -->
            <div id="wt-session-details" style="display: none;">
                <p class="wt-status">Status: <span id="wt-element-status">Initializing...</span></p>
                <p class="wt-session-id">Session ID: <span id="wt-session-id">${walkthroughState.sessionId}</span></p>
                <p class="wt-session-time">Started: <span id="wt-session-time">${new Date(walkthroughState.timestamp).toLocaleTimeString()}</span></p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Status indicator for multi-page walkthroughs
    const statusIndicator = document.createElement("div");
    statusIndicator.id = "wt-walkthrough-status";
    statusIndicator.style.display = "none";
    document.body.appendChild(statusIndicator);

    // Inject additional styles
    const style = document.createElement("style");
    style.innerHTML = `
        /* Global styles */
        #wt-floating-icon, #wt-query-modal, #wt-modal-content, #wt-modal-header, 
        #wt-modal-body, #wt-input-container, #wt-suggestions, #wt-loading,
        #wt-session-info, #wt-crawl-status, #wt-walkthrough-status {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            box-sizing: border-box;
        }
        
        /* Floating icon */
        #wt-floating-icon {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #121212;
            color: #ffdd87;
            border-radius: 50%;
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            border: 1px solid #333;
        }
        
        #wt-floating-icon:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.3);
            background: #1a1a1a;
        }
        
        #wt-floating-icon.loading {
            animation: wt-spin 1.5s linear infinite;
        }
        
        @keyframes wt-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Modal */
        #wt-query-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(3px);
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        #wt-modal-content {
            position: absolute;
            bottom: 30px;
            right: 30px;
            background: #121212;
            border-radius: 12px;
            width: 380px;
            box-shadow: 0 15px 30px rgba(0,0,0,0.4);
            overflow: hidden;
            transform: translateY(20px);
            transition: transform 0.3s ease;
            border: 1px solid #333;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
        }

        #wt-modal-body {
            padding: 20px;
            color: #e0e0e0;
            overflow-y: auto;
        }
        
        #wt-query-modal.active {
            opacity: 1;
        }
        
        #wt-query-modal.active #wt-modal-content {
            transform: translateY(0);
        }
        
        /* Modal header */
        #wt-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #303030;
            background: #1a1a1a;
        }
        
        #wt-modal-header h3 {
            margin: 0;
            color: white;
            font-weight: 500;
            font-size: 16px;
        }
        
        #wt-close-modal {
            background: transparent;
            border: none;
            color: #999;
            cursor: pointer;
            font-size: 14px;
            transition: color 0.2s;
        }
        
        #wt-close-modal:hover {
            color: #ffdd87;
        }
        
        /* Modal body */
        #wt-modal-body {
            padding: 20px;
            color: #e0e0e0;
            overflow-y: auto;
        }
        
        #wt-modal-body p {
            margin: 0 0 15px 0;
            font-size: 14px;
            color: #aaa;
        }
        
        /* Input container */
        #wt-input-container {
            display: flex;
            margin-bottom: 15px;
            border: 1px solid #333;
            border-radius: 8px;
            overflow: hidden;
            background: #1e1e1e;
        }
        
        #wt-walkthrough-input {
            flex: 1;
            border: none;
            background: transparent;
            padding: 12px 16px;
            color: white;
            font-size: 14px;
            outline: none;
        }
        
        #wt-walkthrough-input::placeholder {
            color: #777;
        }
        
        #wt-generate-walkthrough {
            background: #ffdd87;
            color: #121212;
            border: none;
            padding: 0 16px;
            cursor: pointer;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        #wt-generate-walkthrough:hover {
            background: #eac667;
        }
        
        /* Suggestion chips */
        #wt-suggestions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 20px;
        }
        
        .wt-suggestion-chip {
            background: #1e1e1e;
            border: 1px solid #333;
            border-radius: 16px;
            padding: 5px 12px;
            font-size: 12px;
            color: #bbb;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .wt-suggestion-chip:hover {
            background: #2a2a2a;
            color: #ffdd87;
            border-color: #444;
        }
        
        /* Loading spinner */
        #wt-loading {
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #bbb;
        }
        
        .wt-spinner {
            width: 30px;
            height: 30px;
            border: 3px solid rgba(255,221,135,0.3);
            border-radius: 50%;
            border-top-color: #ffdd87;
            animation: wt-spin 1s ease-in-out infinite;
            margin-bottom: 15px;
        }
        
        /* Session info */
        #wt-session-info {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #303030;
        }
        
        .wt-session-controls {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .wt-control-button {
            flex: 1;
            background: #1e1e1e;
            color: #aaa;
            border: 1px solid #333;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Inter', sans-serif;
        }
        
        .wt-control-button:hover {
            background: #2a2a2a;
            color: #ffdd87;
            border-color: #444;
        }
        
        .wt-session-details {
            font-size: 12px;
            color: #777;
        }
        
        .wt-session-details p {
            margin: 5px 0;
            font-size: 12px;
        }
        
        .wt-status {
            color: #999;
        }
        
        /* Crawl status */
        #wt-crawl-status {
            max-height: 150px;
            overflow-y: auto;
            font-size: 12px;
            color: #777;
            padding: 0 20px 15px;
            border-top: 1px solid #303030;
            margin-top: 10px;
        }
        
        #wt-crawl-status:empty {
            display: none;
        }
        
        /* Walkthrough status */
        #wt-walkthrough-status {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(18, 18, 18, 0.95);
            color: white;
            padding: 12px 15px;
            border-radius: 8px;
            z-index: 10001;
            font-size: 14px;
            max-width: 300px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            border: 1px solid #303030;
            font-family: 'Inter', sans-serif;
        }
        
        /* Page transition indicator */
        .wt-page-transition-indicator {
            position: fixed;
            bottom: 100px;
            right: 30px;
            background: #121212;
            color: #ffdd87;
            padding: 12px 15px;
            border-radius: 8px;
            z-index: 10001;
            animation: wt-pulse 1.5s infinite;
            cursor: pointer;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            border: 1px solid #303030;
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        @keyframes wt-pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        /* Toast notification */
        .wt-toast {
            position: fixed;
            bottom: 100px;
            right: 30px;
            background: #1e1e1e;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10001;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            border-left: 4px solid #ffdd87;
            animation: wt-toast-in 0.3s ease forwards, wt-toast-out 0.3s ease forwards 5s;
            transform: translateX(100%);
            opacity: 0;
        }
        
        .wt-toast.success {
            border-left-color: #4CAF50;
        }
        
        .wt-toast.error {
            border-left-color: #F44336;
        }
        
        .wt-toast i {
            color: #ffdd87;
        }
        
        .wt-toast.success i {
            color: #4CAF50;
        }
        
        .wt-toast.error i {
            color: #F44336;
        }
        
        @keyframes wt-toast-in {
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes wt-toast-out {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// ================================================
// IMPROVED: Enhanced Element Detection with DOM Observation
// ================================================

// Initialize MutationObserver to track DOM changes
let domObserver = null;
let pendingElementUpdate = false;

// Function to set up DOM mutation observer
function setupDOMObserver() {
    // Cancel any existing observer
    if (domObserver) {
        domObserver.disconnect();
    }
    
    // Create a new observer instance
    domObserver = new MutationObserver((mutations) => {
        // Debounce element updates to avoid excessive processing
        if (!pendingElementUpdate) {
            pendingElementUpdate = true;
            setTimeout(() => {
                updateElementsFromDOM();
                pendingElementUpdate = false;
            }, 500);
        }
    });
    
    // Configure and start observing
    domObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'id', 'role', 'aria-*', 'data-*']
    });
    
    // Log that observation has started
    console.log("DOM observation active for dynamic element tracking");
}

// Enhanced element metadata extraction
function getElementMetadata(element, index) {
    // Get element position data
    const rect = element.getBoundingClientRect();
    
    // Basic properties
    const metadata = {
        id: element.id || `element-${index}`,
        tag: element.tagName.toLowerCase(),
        text: element.innerText?.trim() || element.placeholder || element.value || "",
        classList: [...element.classList],
        href: element.href || null,
        pathname: element.pathname || null,
        page: window.location.pathname,
        position: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            visible: isElementVisible(element)
        }
    };
    
    // Generate multiple selector strategies
    metadata.selectors = generateReliableSelectors(element);
    
    // Set recommended selector - this will be our best guess for targeting
    metadata.selector = metadata.selectors.idSelector || 
                        metadata.selectors.hrefSelector || 
                        metadata.selectors.filesSelector ||
                        metadata.selectors.tagClassSelector || 
                        metadata.selectors.pathSelector;
    
    // Role information (explicit or implicit)
    metadata.role = element.getAttribute('role') || getImplicitRole(element);
    
    // Element state
    metadata.isVisible = isElementVisible(element);
    metadata.isEnabled = !element.disabled;
    
    // Extract label if available (for form elements)
    if (['input', 'select', 'textarea', 'button'].includes(metadata.tag)) {
        metadata.label = getElementLabel(element);
    }
    
    // All attributes (comprehensive collection)
    metadata.attributes = {};
    for (const attr of element.attributes) {
        metadata.attributes[attr.name] = attr.value;
    }
    
    // Special handling for sidebar links
    if (metadata.tag === 'a' && (
        metadata.classList.includes('sidebar-link') ||
        (element.parentElement && (
            element.parentElement.classList.contains('sidebar') ||
            element.parentElement.tagName.toLowerCase() === 'li'
        ))
    )) {
        metadata.isSidebarLink = true;
        
        // If it's a Files link, mark it specially
        if (metadata.href && metadata.href.toLowerCase().includes('file')) {
            metadata.isFilesLink = true;
        }
    }
    
    // Parent context (useful for determining element relationships)
    if (element.parentElement) {
        metadata.parentContext = {
            tag: element.parentElement.tagName.toLowerCase(),
            id: element.parentElement.id || null,
            classList: Array.from(element.parentElement.classList),
            selector: element.parentElement.id ? 
                      `#${element.parentElement.id}` : 
                      element.parentElement.classList.length > 0 ?
                      `.${Array.from(element.parentElement.classList).join('.')}` :
                      element.parentElement.tagName.toLowerCase()
        };
    }
    
    // Data attributes
    const dataAttrs = getDataAttributes(element);
    if (Object.keys(dataAttrs).length > 0) {
        metadata.dataAttributes = dataAttrs;
    }
    
    return metadata;
}


// Determine if an element is visible
function isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return !(style.display === 'none' || 
             style.visibility === 'hidden' || 
             style.opacity === '0' ||
             element.offsetWidth === 0 ||
             element.offsetHeight === 0);
}

// Get implicit ARIA role based on element type
function getImplicitRole(element) {
    const tag = element.tagName.toLowerCase();
    const roleMap = {
        'a': 'link',
        'button': 'button',
        'h1': 'heading',
        'h2': 'heading',
        'h3': 'heading',
        'h4': 'heading',
        'h5': 'heading',
        'h6': 'heading',
        'img': 'img',
        'input': getInputRole(element),
        'ul': 'list',
        'ol': 'list',
        'li': 'listitem',
        'nav': 'navigation',
        'table': 'table',
        'tr': 'row',
        'td': 'cell',
        'th': 'columnheader',
        'form': 'form',
        'article': 'article',
        'section': 'region',
        'main': 'main',
        'header': 'banner',
        'footer': 'contentinfo'
    };
    
    return roleMap[tag] || null;
}

// Get role for input elements based on type
function getInputRole(element) {
    if (element.tagName.toLowerCase() !== 'input') return null;
    
    const typeMap = {
        'checkbox': 'checkbox',
        'radio': 'radio',
        'submit': 'button',
        'button': 'button',
        'text': 'textbox',
        'email': 'textbox',
        'password': 'textbox',
        'search': 'searchbox',
        'tel': 'textbox',
        'url': 'textbox'
    };
    
    return typeMap[element.type] || 'textbox';
}

// Get the associated label for a form element
function getElementLabel(element) {
    // Check for aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    // Check for associated label
    if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) return label.innerText.trim();
    }
    
    // Check for parent label
    let parent = element.parentElement;
    while (parent) {
        if (parent.tagName.toLowerCase() === 'label') {
            return parent.innerText.trim().replace(element.value || '', '').trim();
        }
        parent = parent.parentElement;
    }
    
    // Check for placeholder as fallback
    return element.placeholder || null;
}

// IMPROVED: More comprehensive element detection
function updateElementsFromDOM() {
    const currentPage = window.location.pathname;
    
    // Get ALL elements in the DOM
    const allDOMElements = document.querySelectorAll('*');
    
    // Fixed selector - removed invalid wildcard attribute selectors
    // Enhanced interactive elements selector with dashboard-specific patterns
    const interactiveSelector = 
    // Standard interactive elements
    'a, button, input, select, textarea, [role], [tabindex], ' +
    '[contenteditable], [onclick], [onkeydown], [onkeyup], ' +

    // Button and interactive element patterns
    '[class*="btn"], [class*="button"], [class*="link"], ' +
    '[id*="btn"], [id*="button"], ' +

    // Dashboard-specific UI components
    '.box, .sidebar-link, .latest-news-section2, .latest-tasks-section2, ' +
    '.reminders, .media, [class*="box-"], [class*="section"], ' +
    'table tr td a, .header .profile, .search input, ' +

    // Font Awesome icons (very common in dashboards)
    '[class*="fa-"], ' +

    // Common dashboard elements
    '.projects-box tr td, .latest-news-section2-info h4, ' +
    '.top-search-items-info h4, .latest-tasks-section2-info h4, ' +
    '.reminders h4, .media ul li a';
    
    const interactiveElements = document.querySelectorAll(interactiveSelector);

    // Special handling for sidebar elements
    const sidebarElements = [];
    const sidebar = document.querySelector('.sidebar');

    if (sidebar) {
        // Process sidebar specifically
        console.log("Found sidebar, processing its elements separately");
        
        // Get all elements within the sidebar
        const allSidebarElements = sidebar.querySelectorAll('*');
        
        // Process each sidebar element with special consideration
        Array.from(allSidebarElements).forEach(el => {
            // Capture meaningful sidebar elements, especially navigation links
            if (el.tagName === 'A' || 
                el.tagName === 'LI' || 
                el.classList.contains('sidebar-link') ||
                el.tagName === 'I' || // Font Awesome icons
                (el.parentElement && el.parentElement.classList.contains('sidebar-link')) ||
                el.classList.contains('brand') ||
                el.classList.contains('brand-name')) {
                
                sidebarElements.push(el);
            }
        });
        
        console.log(`Found ${sidebarElements.length} important sidebar elements`);
    }
    
    // Get important structural elements
    const structuralSelector = 
        'header, footer, nav, aside, main, section, article, form, ' +
        'table, dialog, menu, h1, h2, h3, h4, h5, h6, ' +
        // Adding dashboard-specific structural elements
        '.sidebar, .main-content, .box, .projects-box, .first-box';
    
    const structuralElements = document.querySelectorAll(structuralSelector);
    
    // Get elements with data-* and aria-* attributes separately
    // (since wildcard attribute selectors aren't valid in querySelectorAll)
    const dataAndAriaElements = Array.from(allDOMElements).filter(el => {
        for (const attr of el.attributes) {
            if (attr.name.startsWith('data-') || attr.name.startsWith('aria-')) {
                return true;
            }
        }
        return false;
    });
    
    // Combine and deduplicate elements
    const combinedElements = new Set([
        ...Array.from(interactiveElements),
        ...Array.from(structuralElements),
        ...dataAndAriaElements
    ]);
    
    // Filter and process elements
    const processedElements = Array.from(combinedElements)
        .filter(el => 
            // Skip hidden elements
            isElementVisible(el) && 
            // Skip tiny elements that are likely not useful
            (el.offsetWidth > 5 || el.offsetHeight > 5)
        )
        .map((el, index) => getElementMetadata(el, index));
    
    // Update the state with new elements
    walkthroughState.allElements[currentPage] = processedElements;
    
    // Update discovered pages based on links
    discoverPageLinks();
    
    // Update UI
    updateElementStatus(`Updated ${processedElements.length} elements on ${currentPage}`);
    
    return processedElements;
}

// ================================================
// Element Extraction and Page Crawling
// ================================================
function getWebsiteElements() {
    return updateElementsFromDOM();
}

// IMPROVED: More reliable page link discovery
// IMPROVED: More reliable page link discovery
function discoverPageLinks() {
    const links = document.querySelectorAll('a[href]');
    const currentDomain = window.location.origin;
    const currentPath = window.location.pathname;
    
    // Add current page to discovered pages
    walkthroughState.discoveredPages.add(currentPath);
    
    // Find links to other pages on the same domain
    Array.from(links).forEach(link => {
        try {
            // Check if the link is valid and visible
            if (!isElementVisible(link)) return;
            
            const href = link.getAttribute('href');
            
            // Skip empty, javascript: and # links
            if (!href || href.startsWith('javascript:') || href === '#') return;
            
            let url;
            
            // Handle relative URLs
            if (href.startsWith('/')) {
                url = new URL(currentDomain + href);
            } else if (!href.includes('://')) {
                // Relative path without leading slash
                const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
                url = new URL(currentDomain + basePath + href);
            } else {
                url = new URL(href);
            }
            
            // Only consider links to the same domain
            if (url.origin === currentDomain) {
                const path = url.pathname;
                
                // Skip duplicates, fragments, and query parameters
                if (path && 
                    path !== currentPath && 
                    !walkthroughState.discoveredPages.has(path)) {
                    
                    walkthroughState.discoveredPages.add(path);
                }
            }
        } catch (e) {
            // Invalid URL, skip
            console.warn("Invalid URL:", link.href);
        }
    });
    
    updateElementStatus(`Discovered ${walkthroughState.discoveredPages.size} unique pages.`);
    return Array.from(walkthroughState.discoveredPages);
}

// Get data attributes that might be used for navigation
function getDataAttributes(element) {
    const dataAttrs = {};
    for (const attr of element.attributes) {
        if (attr.name.startsWith('data-')) {
            dataAttrs[attr.name] = attr.value;
        }
    }
    return dataAttrs;
}

// IMPROVED: More reliable selector generation with fallbacks
function getUniqueSelector(element) {
    // Try ID first as it's most reliable
    if (element.id) return `#${CSS.escape(element.id)}`;
    
    // Try a combo of tag and class
    if (element.classList.length > 0) {
        const classSelector = Array.from(element.classList)
            .map(c => CSS.escape(c))
            .join('.');
        
        const tagWithClass = `${element.tagName.toLowerCase()}.${classSelector}`;
        
        // Test specificity - if this selector matches just one element, it's unique enough
        if (document.querySelectorAll(tagWithClass).length === 1) {
            return tagWithClass;
        }
    }
    
    // Try attributes
    for (const attr of ['role', 'name', 'placeholder', 'title', 'aria-label']) {
        if (element.hasAttribute(attr)) {
            const attrValue = element.getAttribute(attr);
            const attrSelector = `${element.tagName.toLowerCase()}[${attr}="${CSS.escape(attrValue)}"]`;
            if (document.querySelectorAll(attrSelector).length === 1) {
                return attrSelector;
            }
        }
    }
    
    // Build a path from closest uniquely identifiable ancestor
    let current = element;
    let parts = [];
    let maxIterations = 5; // Avoid infinite loops
    
    while (current && current !== document.body && maxIterations > 0) {
        let currentSelector = current.tagName.toLowerCase();
        
        if (current.id) {
            parts.unshift(currentSelector + '#' + CSS.escape(current.id));
            break;
        } else if (current.classList.length > 0) {
            const classNames = Array.from(current.classList).slice(0, 3).map(c => CSS.escape(c));
            currentSelector += '.' + classNames.join('.');
        }
        
        // Add position if needed
        const siblings = current.parentNode ? Array.from(current.parentNode.children).filter(
            child => child.tagName === current.tagName
        ) : [];
        
        if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            currentSelector += `:nth-child(${index})`;
        }
        
        parts.unshift(currentSelector);
        current = current.parentNode;
        maxIterations--;
    }
    
    return parts.join(' > ');
}

// IMPROVED: Generate multiple reliable selectors for an element
function generateReliableSelectors(element) {
    const selectors = {
        // ID-based selector (most reliable)
        idSelector: element.id ? `#${CSS.escape(element.id)}` : null,
        
        // Class-based selectors
        classSelector: element.classList.length > 0 ? 
            `.${Array.from(element.classList).map(c => CSS.escape(c)).join('.')}` : null,
        tagClassSelector: element.classList.length > 0 ?
            `${element.tagName.toLowerCase()}.${Array.from(element.classList).map(c => CSS.escape(c)).join('.')}` : null,
        
        // Type-specific selectors
        typeSpecificSelectors: []
    };
    
    // Link selectors (for all types of links)
    if (element.tagName.toLowerCase() === 'a') {
        // Simple href selector
        if (element.getAttribute('href')) {
            selectors.hrefSelector = `a[href="${CSS.escape(element.getAttribute('href'))}"]`;
            
            // For relative links, also create a contains version
            const href = element.getAttribute('href');
            if (href && !href.startsWith('http')) {
                selectors.hrefContainsSelector = `a[href*="${CSS.escape(href.split('/').pop() || href)}"]`;
            }
        }
        
        // Text content selector (important for links with generic hrefs like "#")
        if (element.textContent && element.textContent.trim()) {
            // Store text for matching (not a real CSS selector, but useful for fallbacks)
            selectors.textContent = element.textContent.trim();
            
            // For links with generic hrefs like "/#", we need text-based identification
            if (element.getAttribute('href') === '/#' || element.getAttribute('href') === '#') {
                // Push parent-based selectors for these links
                const parentTag = element.parentElement?.tagName.toLowerCase();
                if (parentTag) {
                    selectors.typeSpecificSelectors.push(`${parentTag} > a`);
                    
                    // If parent is a list item, this is likely a menu item
                    if (parentTag === 'li') {
                        selectors.menuItemSelector = `li > a`;
                        
                        // Try to find position in list
                        const listItems = Array.from(element.parentElement.parentElement.children || []);
                        const index = listItems.indexOf(element.parentElement) + 1;
                        if (index > 0) {
                            selectors.menuPositionSelector = `li:nth-child(${index}) > a`;
                        }
                    }
                }
            }
        }
    }
    
    // Button selectors
    if (element.tagName.toLowerCase() === 'button' || 
        element.getAttribute('role') === 'button' || 
        (element.tagName.toLowerCase() === 'a' && element.classList.contains('btn'))) {
        
        // Store button text for matching
        if (element.textContent && element.textContent.trim()) {
            selectors.buttonText = element.textContent.trim();
        }
        
        // Type attribute for buttons
        if (element.getAttribute('type')) {
            selectors.typeSpecificSelectors.push(
                `${element.tagName.toLowerCase()}[type="${element.getAttribute('type')}"]`
            );
        }
    }
    
    // Form element selectors
    if (['input', 'select', 'textarea'].includes(element.tagName.toLowerCase())) {
        // Name attribute selector
        if (element.getAttribute('name')) {
            selectors.typeSpecificSelectors.push(
                `${element.tagName.toLowerCase()}[name="${element.getAttribute('name')}"]`
            );
        }
        
        // Placeholder selector
        if (element.getAttribute('placeholder')) {
            selectors.typeSpecificSelectors.push(
                `${element.tagName.toLowerCase()}[placeholder="${element.getAttribute('placeholder')}"]`
            );
        }
    }
    
    // Dropdown menu selectors
    const isInDropdown = isElementInDropdown(element);
    if (isInDropdown.isInDropdown) {
        selectors.dropdownInfo = isInDropdown;
        selectors.dropdownSelector = isInDropdown.selector;
    }
    
    // Special selectors for sidebar links
    if (isElementInSidebar(element)) {
        selectors.sidebarSelector = generateSidebarSelector(element);
    }
    
    // Hierarchical selectors
    selectors.ancestorSelector = getAncestorBasedSelector(element);
    selectors.pathSelector = getUniqueSelector(element);
    
    // Content-based identification (not CSS selectors, but useful for fallbacks)
    if (element.textContent && element.textContent.trim()) {
        // Get all text in element including descendants
        selectors.fullTextContent = element.textContent.trim();
        
        // Get only the direct text content excluding child elements
        selectors.directTextContent = Array.from(element.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent.trim())
            .filter(text => text)
            .join(' ');
    }
    
    return selectors;
}

// Helper function to check if element is in dropdown
function isElementInDropdown(element) {
    let current = element;
    let depth = 0;
    const maxDepth = 5; // Prevent infinite loops
    
    while (current && depth < maxDepth) {
        const classList = Array.from(current.classList || []);
        const id = current.id || '';
        const role = current.getAttribute('role') || '';
        
        // Check common dropdown indicators
        const isDropdown = 
            classList.some(c => 
                c.includes('dropdown') || 
                c.includes('menu') || 
                c.includes('submenu') || 
                c.includes('popover') || 
                c.includes('nav-item')) ||
            id.includes('dropdown') || 
            id.includes('menu') ||
            role === 'menu' || 
            role === 'menuitem';
            
        if (isDropdown) {
            // Generate selector for this dropdown item
            let selector = '';
            
            if (current.id) {
                selector = `#${current.id} `;
            } else if (current.classList.length > 0) {
                selector = `.${Array.from(current.classList).join('.')} `;
            }
            
            // Add relationship to target element
            const relation = [];
            let tempEl = element;
            
            while (tempEl && tempEl !== current) {
                relation.unshift(tempEl.tagName.toLowerCase());
                tempEl = tempEl.parentElement;
            }
            
            if (relation.length > 0) {
                selector += relation.join(' > ');
            }
            
            return {
                isInDropdown: true,
                dropdownElement: current,
                selector: selector
            };
        }
        
        current = current.parentElement;
        depth++;
    }
    
    return { isInDropdown: false };
}

// Helper function to check if element is in sidebar
function isElementInSidebar(element) {
    let current = element;
    let depth = 0;
    const maxDepth = 5;
    
    while (current && depth < maxDepth) {
        const classList = Array.from(current.classList || []);
        const id = current.id || '';
        
        if (classList.includes('sidebar') || 
            id.includes('sidebar') || 
            id.includes('sidenav') ||
            classList.includes('sidenav') ||
            classList.includes('side-nav') ||
            classList.includes('nav-sidebar')) {
            return true;
        }
        
        current = current.parentElement;
        depth++;
    }
    
    return false;
}

// Generate sidebar-specific selector
function generateSidebarSelector(element) {
    // For sidebar link
    if (element.tagName.toLowerCase() === 'a') {
        if (element.getAttribute('href')) {
            return `.sidebar a[href="${element.getAttribute('href')}"]`;
        }
        
        if (element.textContent && element.textContent.trim()) {
            // Text-based identification (not a CSS selector, but useful for fallbacks)
            return {
                type: 'sidebarLinkText',
                text: element.textContent.trim(),
                selector: '.sidebar a', // Generic sidebar link selector
                position: getElementPositionInList(element)
            };
        }
    }
    
    return null;
}

// Get position of element in list
function getElementPositionInList(element) {
    let target = element;
    
    // If the element itself isn't an LI, try to find its parent LI
    if (element.tagName.toLowerCase() !== 'li') {
        target = element.closest('li');
    }
    
    if (!target) return null;
    
    const parentElement = target.parentElement;
    if (!parentElement) return null;
    
    const listItems = Array.from(parentElement.children).filter(el => 
        el.tagName.toLowerCase() === 'li'
    );
    
    const index = listItems.indexOf(target) + 1; // CSS is 1-based
    return index > 0 ? index : null;
}

// Get selector based on unique ancestor
function getAncestorBasedSelector(element) {
    let current = element;
    let depth = 0;
    const maxDepth = 3; // Limit depth to avoid overly complex selectors
    
    while (current && current !== document.body && depth < maxDepth) {
        current = current.parentElement;
        
        if (!current) break;
        
        // Try to find a unique identifier for this ancestor
        let ancestorSelector = null;
        
        if (current.id) {
            ancestorSelector = `#${CSS.escape(current.id)}`;
        } else if (current.classList.length > 0) {
            const classSelector = `.${Array.from(current.classList).map(c => CSS.escape(c)).join('.')}`;
            // Verify it's sufficiently specific
            if (document.querySelectorAll(classSelector).length <= 3) {
                ancestorSelector = classSelector;
            }
        }
        
        if (ancestorSelector) {
            // Create path from this ancestor to our target element
            const path = [];
            let tempEl = element;
            
            while (tempEl !== current) {
                const position = getElementPosition(tempEl);
                if (position.isUnique) {
                    path.unshift(position.selector);
                } else {
                    path.unshift(tempEl.tagName.toLowerCase());
                }
                
                tempEl = tempEl.parentElement;
            }
            
            return `${ancestorSelector} ${path.join(' > ')}`;
        }
        
        depth++;
    }
    
    return null;
}

// Get element position among siblings
function getElementPosition(element) {
    if (!element.parentElement) return { isUnique: false };
    
    if (element.id) {
        return { isUnique: true, selector: `#${CSS.escape(element.id)}` };
    }
    
    const siblings = Array.from(element.parentElement.children).filter(
        child => child.tagName === element.tagName
    );
    
    if (siblings.length === 1) {
        return { isUnique: true, selector: element.tagName.toLowerCase() };
    }
    
    const index = siblings.indexOf(element) + 1;
    return { 
        isUnique: false, 
        selector: `${element.tagName.toLowerCase()}:nth-child(${index})` 
    };
}

// Test if a selector is valid and unique
function testSelector(selector) {
    if (!selector) return { valid: false, count: 0, unique: false };
    
    try {
        const elements = document.querySelectorAll(selector);
        return {
            valid: true,
            count: elements.length,
            unique: elements.length === 1,
            elements: elements.length > 0 ? Array.from(elements) : []
        };
    } catch (e) {
        return { valid: false, error: e.message };
    }
}

// Find element by text content
// Find element by text content with improved matching
function findElementByText(text, options = {}) {
    if (!text) return null;
    
    const textLower = text.toLowerCase().trim();
    const searchTags = options.tags || ['a', 'button', 'li', 'span', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'label', 'td', 'th'];
    
    // Extract quoted text which often contains the exact element text
    let quotedText = null;
    const quotedMatch = text.match(/["']([^"']+)["']/);
    if (quotedMatch) {
        quotedText = quotedMatch[1].toLowerCase().trim();
    }
    
    // First try exact quoted text match (highest priority)
    if (quotedText) {
        for (const tag of searchTags) {
            const elements = document.querySelectorAll(tag);
            for (const el of elements) {
                const elText = el.innerText?.toLowerCase().trim() || '';
                if (elText === quotedText && isElementVisible(el)) {
                    return el;
                }
            }
        }
    }
    
    // Try to find elements that contain the quoted text
    if (quotedText) {
        for (const tag of searchTags) {
            const elements = document.querySelectorAll(tag);
            for (const el of elements) {
                const elText = el.innerText?.toLowerCase().trim() || '';
                if (elText.includes(quotedText) && isElementVisible(el)) {
                    return el;
                }
            }
        }
    }
    
    // Try exact full text match
    for (const tag of searchTags) {
        const elements = document.querySelectorAll(tag);
        for (const el of elements) {
            const elText = el.innerText?.toLowerCase().trim() || '';
            if (elText === textLower && isElementVisible(el)) {
                return el;
            }
        }
    }
    
    // Try partial text match
    for (const tag of searchTags) {
        const elements = document.querySelectorAll(tag);
        for (const el of elements) {
            const elText = el.innerText?.toLowerCase().trim() || '';
            if ((elText.includes(textLower) || textLower.includes(elText)) && isElementVisible(el)) {
                return el;
            }
        }
    }
    
    // Special case for links with generic hrefs like "#"
    if (textLower.includes('join') || textLower.includes('login') || textLower.includes('sign')) {
        const commonActions = ['join', 'login', 'logout', 'sign in', 'sign up', 'register'];
        for (const action of commonActions) {
            if (textLower.includes(action)) {
                const actionLinks = Array.from(document.querySelectorAll('a')).filter(el => {
                    const elText = el.innerText?.toLowerCase().trim() || '';
                    const href = el.getAttribute('href') || '';
                    return elText.includes(action) || href.includes(action) || href === '#' || href === '/#';
                });
                
                if (actionLinks.length > 0) {
                    return actionLinks[0];
                }
            }
        }
    }
    
    // Check for special cases like "Files" which might be in the href
    const specialTerms = ['file', 'setting', 'home', 'dashboard', 'profile', 'account'];
    for (const term of specialTerms) {
        if (textLower.includes(term)) {
            const termLinks = Array.from(document.querySelectorAll('a')).filter(el => {
                const href = el.getAttribute('href') || '';
                return href.toLowerCase().includes(term);
            });
            
            if (termLinks.length > 0) {
                return termLinks[0];
            }
        }
    }
    
    return null;
}

// Check if dropdown menu is visible
function isDropdownVisible(element) {
    // Check if this is a dropdown trigger
    if (element.getAttribute('aria-expanded') === 'true' ||
        element.classList.contains('dropdown-toggle') ||
        element.getAttribute('data-toggle') === 'dropdown') {
        
        // Find the associated dropdown menu
        let dropdown = null;
        
        // Method 1: Look for aria-controls
        const controlsId = element.getAttribute('aria-controls');
        if (controlsId) {
            dropdown = document.getElementById(controlsId);
        }
        
        // Method 2: Look for next sibling that could be a dropdown
        if (!dropdown) {
            const sibling = element.nextElementSibling;
            if (sibling && (
                sibling.classList.contains('dropdown-menu') || 
                sibling.getAttribute('role') === 'menu')) {
                dropdown = sibling;
            }
        }
        
        // Method 3: Look for child of parent that could be a dropdown
        if (!dropdown && element.parentElement) {
            const dropdownMenus = element.parentElement.querySelectorAll('.dropdown-menu, [role="menu"]');
            if (dropdownMenus.length > 0) {
                dropdown = dropdownMenus[0];
            }
        }
        
        if (dropdown) {
            return {
                isVisible: isElementVisible(dropdown),
                dropdown: dropdown,
                trigger: element
            };
        }
    }
    
    return { isVisible: false };
}

// Helper function to open a dropdown if needed before targeting items in it
function ensureDropdownOpen(trigger) {
    const state = isDropdownVisible(trigger);
    if (!state.isVisible && state.dropdown) {
        // Try to open the dropdown
        trigger.click();
        
        // Return the dropdown element
        return state.dropdown;
    }
    
    return state.dropdown;
}

// ================================================
// Toast Notification Component
// ================================================
function showToast(message, type = "info") {
    // Remove existing toast if present
    const existingToast = document.getElementById("wt-toast");
    if (existingToast) existingToast.remove();
    
    // Create toast element
    const toast = document.createElement("div");
    toast.id = "wt-toast";
    toast.className = `wt-toast ${type}`;
    
    // Set icon based on type
    let icon = "info-circle";
    if (type === "success") icon = "check-circle";
    if (type === "error") icon = "exclamation-circle";
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Remove after animation
    setTimeout(() => {
        toast.remove();
    }, 5500);
}

// ================================================
// Auto-Discovery Site Crawler
// ================================================
async function crawlSite() {
    // Skip if already crawling
    if (walkthroughState.crawlInProgress) {
        updateElementStatus("Crawl already in progress...");
        showToast("Crawl already in progress", "info");
        return;
    }
    
    walkthroughState.crawlInProgress = true;
    updateElementStatus("Starting site crawl...");
    showToast("Starting site exploration", "info");
    
    // Get current page elements
    const currentPath = window.location.pathname;
    const currentElements = getWebsiteElements();
    walkthroughState.allElements[currentPath] = currentElements;
    
    updateElementStatus(`Collected ${currentElements.length} elements from current page.`);
    
    // Discover links to other pages
    const pagesToCrawl = discoverPageLinks()
        .filter(page => page !== currentPath && !walkthroughState.allElements[page]); // Skip current page and already crawled pages
    
    updateElementStatus(`Will crawl ${pagesToCrawl.length} additional pages...`);
    
    // Limit the number of pages to crawl to avoid performance issues
    const MAX_PAGES_TO_CRAWL = 10;
    const limitedPages = pagesToCrawl.slice(0, MAX_PAGES_TO_CRAWL);
    
    if (pagesToCrawl.length > MAX_PAGES_TO_CRAWL) {
        updateElementStatus(`Too many pages found. Limiting to ${MAX_PAGES_TO_CRAWL} pages.`);
    }
    
    // Throttle crawling to avoid overwhelming the browser
    const CONCURRENT_CRAWLS = 2;
    const THROTTLE_DELAY = 1000; // 1 second between crawls
    
    // Process pages in smaller batches
    for (let i = 0; i < limitedPages.length; i += CONCURRENT_CRAWLS) {
        const batch = limitedPages.slice(i, i + CONCURRENT_CRAWLS);
        const batchPromises = batch.map(page => crawlPageInIframe(page));
        
        try {
            const results = await Promise.allSettled(batchPromises);
            
            results.forEach((result, index) => {
                const page = batch[index];
                
                if (result.status === 'fulfilled') {
                    walkthroughState.allElements[page] = result.value;
                    updateElementStatus(`Collected ${result.value.length} elements from ${page}`);
                } else {
                    console.error(`Error crawling ${page}:`, result.reason);
                    updateElementStatus(`Failed to crawl ${page}: ${result.reason.message}`);
                }
            });
            
            // Save periodically
            saveWalkthroughState();
            
            // Add a delay between batches
            if (i + CONCURRENT_CRAWLS < limitedPages.length) {
                await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY));
            }
        } catch (error) {
            console.error("Error processing batch:", error);
        }
    }
    
    // Save all collected elements
    saveWalkthroughState();
    walkthroughState.crawlInProgress = false;
    updateElementStatus(`Crawl complete. Collected elements from ${Object.keys(walkthroughState.allElements).length} pages.`);
    showToast(`Site exploration complete. Found ${Object.keys(walkthroughState.allElements).length} pages.`, "success");
}

// IMPROVED: Enhanced iframe crawling
async function crawlPageInIframe(pageUrl) {
    return new Promise((resolve, reject) => {
        // First, check if the URL is valid
        if (!pageUrl || typeof pageUrl !== 'string' || pageUrl.trim() === '') {
            reject(new Error('Invalid URL provided'));
            return;
        }
        
        // Ensure we have a full URL
        let fullUrl = pageUrl;
        if (!pageUrl.startsWith('http') && !pageUrl.startsWith('/')) {
            fullUrl = '/' + pageUrl;
        }
        
        // Create a hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.setAttribute('title', 'Walkthrough crawler iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        
        // Set a timeout in case the page doesn't load
        const timeout = setTimeout(() => {
            try {
                document.body.removeChild(iframe);
            } catch (e) { /* iframe might be already removed */ }
            console.warn(`Timeout loading page: ${pageUrl}`);
            resolve([]); // Return empty array instead of rejecting to avoid stopping crawl
        }, 10000);
        
        // Handle iframe load
        iframe.onload = () => {
            clearTimeout(timeout);
            try {
                // Extract elements from the iframe's document
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                
                // Skip if we can't access the iframe content (cross-origin)
                if (!iframeDoc) {
                    console.warn(`Can't access content of ${pageUrl} (possible CORS issue)`);
                    document.body.removeChild(iframe);
                    resolve([]); // Return empty array instead of rejecting
                    return;
                }
                
                try {
                    // Use the enhanced element detection
                    const elements = Array.from(iframeDoc.querySelectorAll('*'))
                        .filter(el => {
                            // Extract only visible interactive elements
                            const tag = el.tagName.toLowerCase();
                            const isInteractive = [
                                'a', 'button', 'input', 'select', 'textarea'
                            ].includes(tag) || el.hasAttribute('role') || el.hasAttribute('onclick');
                            
                            // Check visibility using basic means
                            let style;
                            try {
                                style = iframeDoc.defaultView.getComputedStyle(el);
                            } catch (e) {
                                return false;
                            }
                            
                            const isVisible = !(
                                style.display === 'none' || 
                                style.visibility === 'hidden' || 
                                parseFloat(style.opacity) === 0 ||
                                el.offsetWidth === 0 ||
                                el.offsetHeight === 0
                            );
                            
                            return isInteractive && isVisible;
                        })
                        .map((el, index) => {
                            try {
                                // Extract basic properties
                                return {
                                    id: el.id || `element-${index}`,
                                    tag: el.tagName.toLowerCase(),
                                    text: (el.innerText || el.placeholder || el.value || "").substring(0, 100).trim(),
                                    classList: Array.from(el.classList || []),
                                    selector: el.id ? 
                                        `#${el.id}` : 
                                        el.tagName.toLowerCase() + (el.classList.length > 0 ? `.${Array.from(el.classList).join('.')}` : ''),
                                    href: el.href || null,
                                    pathname: el.pathname || null,
                                    role: el.getAttribute('role') || null,
                                    page: pageUrl
                                };
                            } catch (elementError) {
                                console.warn(`Error processing element ${index}`, elementError);
                                return null;
                            }
                        })
                        .filter(el => el !== null); // Remove any null elements
                    
                    // Clean up and return the elements
                    document.body.removeChild(iframe);
                    resolve(elements);
                } catch (extractError) {
                    console.warn(`Error extracting elements from ${pageUrl}`, extractError);
                    document.body.removeChild(iframe);
                    resolve([]); // Return empty array instead of rejecting
                }
            } catch (error) {
                console.warn(`General error processing iframe for ${pageUrl}`, error);
                try {
                    document.body.removeChild(iframe);
                } catch (e) { /* iframe might be already removed */ }
                resolve([]); // Return empty array instead of rejecting
            }
        };
        
        // Handle errors
        iframe.onerror = (error) => {
            console.warn(`Error loading iframe for ${pageUrl}`, error);
            clearTimeout(timeout);
            try {
                document.body.removeChild(iframe);
            } catch (e) { /* iframe might be already removed */ }
            resolve([]); // Return empty array instead of rejecting
        };
        
        try {
            // Set the iframe source and add it to the document
            iframe.src = fullUrl;
            document.body.appendChild(iframe);
        } catch (error) {
            console.warn(`Error creating iframe for ${pageUrl}`, error);
            resolve([]); // Return empty array instead of rejecting
        }
    });
}

function updateElementStatus(message) {
    const statusEl = document.getElementById("wt-element-status");
    if (statusEl) {
        statusEl.textContent = message;
    }
    
    const crawlStatus = document.getElementById("wt-crawl-status");
    if (crawlStatus) {
        // Still append logs, but they won't be visible in the UI
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement("div");
        logEntry.innerHTML = `<span style="color:#666">[${timestamp}]</span> ${message}`;
        crawlStatus.appendChild(logEntry);
    }
    
    // Still log to console for debugging
    console.log("[Crawler]", message);
}

// ================================================
// Call the OpenAI API to Generate Walkthrough Steps
// ================================================
async function generateWalkthrough(userInput) {
    const currentPage = window.location.pathname;
    walkthroughState.userQuery = userInput;
    
    // Show loading state
    document.getElementById("wt-modal-body").style.display = "none";
    document.getElementById("wt-loading").style.display = "flex";
    
    // Prepare the elements data - flatten all elements from all pages
    const allElements = [];
    for (const [page, elements] of Object.entries(walkthroughState.allElements)) {
        if (!elements || !Array.isArray(elements)) {
            console.warn(`No valid elements for page ${page}, skipping`);
            continue;
        }
        
        // Add page information to each element
        elements.forEach(element => {
            // Skip invalid elements
            if (!element || typeof element !== 'object') return;
            
            allElements.push({
                ...element,
                page: page
            });
        });
    }
    
    // Limit the number of elements to prevent exceeding token limits
    const MAX_ELEMENTS = 300;
    let elementsToSend = allElements;
    
    if (allElements.length > MAX_ELEMENTS) {
        console.warn(`Too many elements (${allElements.length}), limiting to ${MAX_ELEMENTS}`);
        // Prioritize interactive elements
        const interactiveElements = allElements.filter(el => 
            el.tag === 'button' || 
            el.tag === 'a' || 
            el.tag === 'input' || 
            el.classList.includes('btn') ||
            (el.role && ['button', 'link', 'tab', 'menuitem'].includes(el.role))
        );
        
        // Take all interactive elements plus fill with other elements up to the limit
        if (interactiveElements.length < MAX_ELEMENTS) {
            const nonInteractive = allElements.filter(el => 
                !(el.tag === 'button' || 
                el.tag === 'a' || 
                el.tag === 'input' || 
                el.classList.includes('btn') ||
                (el.role && ['button', 'link', 'tab', 'menuitem'].includes(el.role)))
            );
            
            elementsToSend = [
                ...interactiveElements,
                ...nonInteractive.slice(0, MAX_ELEMENTS - interactiveElements.length)
            ];
        } else {
            elementsToSend = interactiveElements.slice(0, MAX_ELEMENTS);
        }
    }

    // Define available pages
    const availablePages = Object.keys(walkthroughState.allElements).map(page => ({
        page,
        title: page.split('/').pop() || page // Extract filename as title
    }));

    const messages = [
        {
            "role": "system",
            "content": `You are an assistant that generates interactive Intro.js walkthroughs across multiple pages of a website.
                        Given the user's query and available website elements from all pages, return a step-by-step guide in JSON format ONLY.
                        
                        For multi-page walkthroughs:
                        - Each step must include "page": "page-path" to indicate which page this step belongs to
                        - If a step requires navigation to another page, include "nextPage": "page-path" in that step
                        - While navigating between pages, if the steps on the first page is completed dont show a Finish option. Instead show a "nextPage" option that redirects the user to the next page itself, automatically when clicked.
                        - The step after a page transition should have "pageTransitionComplete": true
                        
                        For each step include:
                        - "element": a valid CSS selector from the provided elements 
                        - "intro": a brief explanation that MUST include the exact text of the target element in quotes, e.g. "Click on the 'Join' link"
                        - "position": preferred tooltip position (top, bottom, left, right)
                        - "page": the page path this step applies to
                        
                        IMPORTANT SELECTOR GUIDANCE:
                        1. For links, use these selector patterns:
                           - ID selector: #element-id
                           - Href selector: a[href="path.html"] or a[href*="path"]
                           - For simple links like "Join" or "Login", use: li > a
                        
                        2. For navigation links like Files, use: 
                           - .sidebar a[href*="Files.html"] or a[href*="Files"]
                        
                        3. For dropdowns or menus:
                           - For the dropdown trigger: .dropdown-toggle or [aria-haspopup="true"]
                           - For dropdown items: .dropdown-item or .dropdown li
                        
                        4. VERY IMPORTANT: Always include the exact element text in quotes in the "intro" field.
                           Example: "Click on the 'Files' option in the sidebar."
                        
                        Return ONLY a JSON array of steps.`
        },
        {
            "role": "user",
            "content": `Current page: ${currentPage}
                        Available pages: ${JSON.stringify(availablePages)}
                        Website elements (${elementsToSend.length} total from all pages): ${JSON.stringify(elementsToSend)}
                        User query: ${userInput}`
        }
    ];

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4-turbo",
                messages: messages,
                max_tokens: 2000,
                temperature: 0.3
            })
        });

        // Hide loading state
        document.getElementById("wt-loading").style.display = "none";
        document.getElementById("wt-modal-body").style.display = "block";

        // Handle API errors
        if (!response.ok) {
            const errorData = await response.json();
            console.error("❌ OpenAI API Error:", errorData);
            showToast(`Error: ${errorData.error.message || "Unknown error"}`, "error");
            return [];
        }

        // Log full response for debugging
        const data = await response.json();
        console.log("🔍 Full API Response:", data);

        // Parse JSON response safely
        let generatedSteps;
        try {
            generatedSteps = JSON.parse(data.choices[0].message.content.trim());
        } catch (parseError) {
            console.error("⚠️ Error parsing OpenAI response:", parseError);
            showToast("Failed to parse walkthrough data", "error");
            return [];
        }

        // Validate JSON structure
        if (!Array.isArray(generatedSteps) || generatedSteps.length === 0) {
            console.error("⚠️ No valid steps returned.");
            showToast("Sorry, no valid walkthrough steps were generated", "error");
            return [];
        }

        console.log("🔍 Walkthrough Steps:", generatedSteps);
        
        // Hide modal with animation
        const modal = document.getElementById("wt-query-modal");
        modal.classList.remove("active");
        setTimeout(() => {
            modal.style.display = "none";
        }, 300);
        
        return generatedSteps;

    } catch (error) {
        console.error("❌ Network/API Error:", error);
        showToast("Connection error. Check API key and internet", "error");
        
        // Hide loading state on error
        document.getElementById("wt-loading").style.display = "none";
        document.getElementById("wt-modal-body").style.display = "block";
        
        return [];
    }
}

// ================================================
// Multi-Page Walkthrough Management with Expiration
// ================================================

// Save walkthrough state with domain-specific storage
function saveWalkthroughState() {
    // Save the current state to localStorage for cross-page persistence
    try {
        // Update timestamp for expiration checking
        walkthroughState.timestamp = Date.now();
        
        // Clone the object to avoid circular references
        const stateToSave = {
            currentPage: walkthroughState.currentPage,
            steps: walkthroughState.steps,
            currentStepIndex: walkthroughState.currentStepIndex,
            userQuery: walkthroughState.userQuery,
            allElements: walkthroughState.allElements,
            discoveredPages: Array.from(walkthroughState.discoveredPages),
            sessionId: walkthroughState.sessionId,
            timestamp: walkthroughState.timestamp,
            domainIdentifier: walkthroughState.domainIdentifier,
            completionFlag: walkthroughState.completionFlag // Add completion flag to saved state
        };
        
        // Get domain-specific storage key
        const storageKey = `${walkthroughState.domainIdentifier}_${walkthroughState.sessionId}`;
        
        // Split the storage into chunks if it's too large
        const stateString = JSON.stringify(stateToSave);
        
        // If the state is too large, we need to split it
        if (stateString.length > 5000000) { // ~5MB
            console.warn("State is too large, removing element data for persistent storage");
            // Save a stripped-down version without all elements
            const minimalState = {
                currentPage: walkthroughState.currentPage,
                steps: walkthroughState.steps,
                currentStepIndex: walkthroughState.currentStepIndex,
                userQuery: walkthroughState.userQuery,
                // Just store the page names without all the elements
                allElementsPages: Object.keys(walkthroughState.allElements),
                discoveredPages: Array.from(walkthroughState.discoveredPages),
                sessionId: walkthroughState.sessionId,
                timestamp: walkthroughState.timestamp,
                domainIdentifier: walkthroughState.domainIdentifier,
                needsRecrawl: true
            };
            localStorage.setItem(storageKey, JSON.stringify(minimalState));
        } else {
            localStorage.setItem(storageKey, stateString);
        }
        
        // Also store a reference to the current active session
        localStorage.setItem(`${walkthroughState.domainIdentifier}_activeSession`, walkthroughState.sessionId);
        
        // Store a list of all sessions for this domain (for cleanup)
        let sessionList = JSON.parse(localStorage.getItem(`${walkthroughState.domainIdentifier}_sessions`) || '[]');
        if (!sessionList.includes(walkthroughState.sessionId)) {
            sessionList.push(walkthroughState.sessionId);
            localStorage.setItem(`${walkthroughState.domainIdentifier}_sessions`, JSON.stringify(sessionList));
        }
    } catch (error) {
        console.error("Error saving walkthrough state:", error);
        showToast("Error saving walkthrough state", "error");
    }
}

// Load walkthrough state with expiration check
function loadWalkthroughState() {
    // Load state from localStorage if available
    try {
        // First, clean up expired sessions
        cleanupExpiredSessions();
        
        // Get domain key
        const domainKey = getDomainKey();
        
        // Get active session ID
        const activeSessionId = localStorage.getItem(`${domainKey}_activeSession`);
        
        if (!activeSessionId) {
            console.log("No active session found");
            return false;
        }
        
        // Try to load the active session
        const savedState = localStorage.getItem(`${domainKey}_${activeSessionId}`);
        
        if (!savedState) {
            console.log("Active session data not found");
            return false;
        }
        
        const parsedState = JSON.parse(savedState);
        
        // Check if this session is for a different domain
        if (parsedState.domainIdentifier !== domainKey) {
            console.log("Session is for a different domain");
            return false;
        }
        
        // Check if the session has expired
        if (Date.now() - parsedState.timestamp > SESSION_EXPIRATION) {
            console.log("Session has expired");
            removeSession(activeSessionId);
            return false;
        }
        
        // Convert discoveredPages back to a Set
        if (parsedState.discoveredPages && Array.isArray(parsedState.discoveredPages)) {
            parsedState.discoveredPages = new Set(parsedState.discoveredPages);
        } else {
            parsedState.discoveredPages = new Set();
        }
        
        // If we have a minimal state (without elements)
        if (parsedState.allElementsPages && !parsedState.allElements) {
            console.log("Loading minimal state, will need to recrawl");
            walkthroughState = {
                ...parsedState,
                allElements: {},
                needsRecrawl: true
            };
        } else {
            walkthroughState = parsedState;
        }
        
        // Update the session ID display
        const sessionIdElement = document.getElementById("wt-session-id");
        if (sessionIdElement) {
            sessionIdElement.textContent = walkthroughState.sessionId;
        }
        
        // Update the session time display
        const sessionTimeElement = document.getElementById("wt-session-time");
        if (sessionTimeElement) {
            sessionTimeElement.textContent = new Date(walkthroughState.timestamp).toLocaleTimeString();
        }
        
        showToast("Walkthrough session loaded", "info");
        return true;
    } catch (error) {
        console.error("Error loading walkthrough state:", error);
        showToast("Error loading previous session", "error");
    }
    return false;
}

// Clean up expired sessions
function cleanupExpiredSessions() {
    try {
        const domainKey = getDomainKey();
        const sessionList = JSON.parse(localStorage.getItem(`${domainKey}_sessions`) || '[]');
        const currentTime = Date.now();
        let updatedList = [];
        
        for (const sessionId of sessionList) {
            const sessionData = localStorage.getItem(`${domainKey}_${sessionId}`);
            
            if (!sessionData) {
                continue; // Skip missing sessions
            }
            
            try {
                const parsedData = JSON.parse(sessionData);
                
                // Check expiration
                if (currentTime - parsedData.timestamp > SESSION_EXPIRATION) {
                    // Remove expired session
                    localStorage.removeItem(`${domainKey}_${sessionId}`);
                    console.log(`Removed expired session: ${sessionId}`);
                } else {
                    updatedList.push(sessionId);
                }
            } catch (e) {
                // Remove invalid session data
                localStorage.removeItem(`${domainKey}_${sessionId}`);
            }
        }
        
        // Update session list
        localStorage.setItem(`${domainKey}_sessions`, JSON.stringify(updatedList));
    } catch (error) {
        console.error("Error cleaning up expired sessions:", error);
    }
}

// Remove a specific session
function removeSession(sessionId) {
    try {
        const domainKey = getDomainKey();
        
        // Remove session data
        localStorage.removeItem(`${domainKey}_${sessionId}`);
        
        // Update session list
        const sessionList = JSON.parse(localStorage.getItem(`${domainKey}_sessions`) || '[]');
        const updatedList = sessionList.filter(id => id !== sessionId);
        localStorage.setItem(`${domainKey}_sessions`, JSON.stringify(updatedList));
        
        // Clear active session if it matches
        const activeSession = localStorage.getItem(`${domainKey}_activeSession`);
        if (activeSession === sessionId) {
            localStorage.removeItem(`${domainKey}_activeSession`);
        }
        
        console.log(`Removed session: ${sessionId}`);
    } catch (error) {
        console.error("Error removing session:", error);
    }
}

// Clear all walkthroughs for the current domain
function clearAllDomainWalkthroughs() {
    try {
        const domainKey = getDomainKey();
        const sessionList = JSON.parse(localStorage.getItem(`${domainKey}_sessions`) || '[]');
        
        // Remove all sessions
        for (const sessionId of sessionList) {
            localStorage.removeItem(`${domainKey}_${sessionId}`);
        }
        
        // Clear session list and active session
        localStorage.removeItem(`${domainKey}_sessions`);
        localStorage.removeItem(`${domainKey}_activeSession`);
        
        // Reset state
        resetWalkthroughState();
        
        console.log("Cleared all walkthroughs for domain:", domainKey);
    } catch (error) {
        console.error("Error clearing walkthroughs:", error);
    }
}

// Reset the current walkthrough state
function resetWalkthroughState() {
    // If there was an active session, remove it
    if (walkthroughState.sessionId) {
        removeSession(walkthroughState.sessionId);
    }
    
    // Generate a new session
    walkthroughState = {
        currentPage: window.location.pathname,
        steps: [],
        currentStepIndex: 0,
        userQuery: "",
        allElements: {},
        discoveredPages: new Set(),
        crawlInProgress: false,
        sessionId: generateSessionId(),
        timestamp: Date.now(),
        domainIdentifier: getDomainKey(),
        completionFlag: false // Reset completion flag
    };
    
    // Update the UI with new session info
    const sessionIdElement = document.getElementById("wt-session-id");
    if (sessionIdElement) {
        sessionIdElement.textContent = walkthroughState.sessionId;
    }
    
    const sessionTimeElement = document.getElementById("wt-session-time");
    if (sessionTimeElement) {
        sessionTimeElement.textContent = new Date(walkthroughState.timestamp).toLocaleTimeString();
    }
    
    console.log("Walkthrough state reset with new session:", walkthroughState.sessionId);
}

function navigateToNextPage(nextPageUrl) {
    // Find the sidebar link that corresponds to this URL
    const sidebarLinks = document.querySelectorAll('.sidebar a.sidebar-link');
    let matchingSidebarLink = null;
    
    // Try to match the sidebar link to the next page URL
    for (const link of sidebarLinks) {
        const href = link.getAttribute('href');
        if (!href) continue;
        
        // Check if this link points to the next page (handling relative URLs)
        if (href === nextPageUrl || 
            href.endsWith(nextPageUrl) || 
            nextPageUrl.endsWith(href)) {
            matchingSidebarLink = link;
            break;
        }
    }
    
    if (matchingSidebarLink) {
        // Highlight the sidebar link with a pulsating effect
        const originalBackground = matchingSidebarLink.style.background;
        const originalColor = matchingSidebarLink.style.color;
        
        // Add a pulsing animation to the sidebar link
        matchingSidebarLink.style.background = '#ffdd87';
        matchingSidebarLink.style.color = '#121212';
        matchingSidebarLink.style.animation = 'wt-pulse 1.5s infinite';
        matchingSidebarLink.style.borderRadius = '4px';
        
        // Add a message to let the user know to click this link
        updateStatusIndicator(`Click on "${matchingSidebarLink.innerText.trim()}" in the sidebar to continue the walkthrough.`);
        showToast(`Continue by clicking "${matchingSidebarLink.innerText.trim()}" in the sidebar`, "info");
        
        // Reset the styling after 10 seconds if not clicked
        setTimeout(() => {
            matchingSidebarLink.style.background = originalBackground;
            matchingSidebarLink.style.color = originalColor;
            matchingSidebarLink.style.animation = '';
        }, 10000);
    } else {
        // Fallback to the original behavior if no matching sidebar link is found
        const indicator = document.createElement("div");
        indicator.className = "wt-page-transition-indicator";
        const pageName = nextPageUrl.split('/').pop() || nextPageUrl;
        indicator.innerHTML = `<i class="fas fa-arrow-right"></i> Continue to <strong>${pageName}</strong>`;
        indicator.onclick = () => window.location.href = nextPageUrl;
        document.body.appendChild(indicator);
        
        updateStatusIndicator(`Continue to ${pageName}`);
        showToast(`Your walkthrough continues on the next page: ${pageName}`, "info");
    }
}

function updateStatusIndicator(message) {
    const statusEl = document.getElementById("wt-walkthrough-status");
    statusEl.innerHTML = message;
    statusEl.style.display = "block";
    
    // Hide status after 5 seconds unless it's a persistent message
    if (!message.includes("paused")) {
        setTimeout(() => {
            statusEl.style.display = "none";
        }, 5000);
    }
}

// ================================================
// Initialize the Walkthrough
// ================================================
function startWalkthrough(fromSavedState = false) {
    // Get the current page
    const currentPage = window.location.pathname;
    
    // Filter steps to only show relevant steps for the current page
    const currentPageSteps = walkthroughState.steps.filter(step => step.page === currentPage);
    
    if (currentPageSteps.length === 0) {
        updateStatusIndicator("No walkthrough steps for this page. You may need to navigate to another page.");
        showToast("No steps for this page in your walkthrough", "info");
        
        // Check if there's a next page that should have steps
        const nextPageWithSteps = walkthroughState.steps.find(step => 
            walkthroughState.steps.indexOf(step) > walkthroughState.currentStepIndex && 
            step.page !== currentPage
        );
        
        if (nextPageWithSteps) {
            navigateToNextPage(nextPageWithSteps.page);
        }
        
        return;
    }
    
    // Find the index of the first step for this page
    let startStepIndex = 0;
    const globalStartIndex = walkthroughState.steps.findIndex(step => 
        step.page === currentPage &&
        walkthroughState.steps.indexOf(step) >= walkthroughState.currentStepIndex
    );
    
    if (globalStartIndex !== -1) {
        // Find the corresponding local index in currentPageSteps
        startStepIndex = currentPageSteps.findIndex(step => 
            JSON.stringify(step) === JSON.stringify(walkthroughState.steps[globalStartIndex])
        );
    }
    
    // Make a copy of the steps and process them for IntroJS
    const processedSteps = currentPageSteps.map(step => {
        // IntroJS doesn't need the page property
        const { page, ...stepWithoutPage } = step;
        
        // Make sure the element selector is valid
        if (stepWithoutPage.element && stepWithoutPage.element.includes(':contains')) {
            console.warn(`Invalid selector found: ${stepWithoutPage.element}, fixing`);
            // Remove the :contains part as it's not a valid CSS selector
            stepWithoutPage.element = stepWithoutPage.element.split(':contains')[0];
        }
        
        return stepWithoutPage;
    });
    
    // Initialize IntroJs with the filtered steps and custom styling
    // Replace the existing IntroJS initialization in startWalkthrough function with this:
    const intro = introJs().setOptions({
        steps: processedSteps,
        showBullets: false,
        showProgress: true,
        exitOnOverlayClick: false,
        disableInteraction: false,
        overlayOpacity: 0.7,
        prevLabel: 'Back',
        nextLabel: 'Next',
        // Set a default doneLabel, we'll modify it below based on the context
        doneLabel: 'Finish'
    });

    // Check if we need to show "Next Page" instead of "Finish"
    const lastCurrentPageStep = [...currentPageSteps].pop();
    const lastStepGlobalIndex = walkthroughState.steps.findIndex(step => 
        JSON.stringify(step) === JSON.stringify(lastCurrentPageStep)
    );
    const hasMoreStepsOnOtherPages = lastStepGlobalIndex < walkthroughState.steps.length - 1;
    const nextPage = hasMoreStepsOnOtherPages ? 
        walkthroughState.steps[lastStepGlobalIndex + 1].page : null;

    // If there are more steps on other pages, change the button to "Next Page"
    if (hasMoreStepsOnOtherPages && nextPage) {
        intro.setOption('doneLabel', 'Next Page →');
        
        // Store the next page URL for reference in the oncomplete handler
        intro._nextPageUrl = nextPage;
    }
    
    // Event handler for step changes
    intro.onchange(function(targetElement) {
        const stepIndex = intro._currentStep;
        
        // Map the local step index to the global step index
        const currentLocalStep = currentPageSteps[stepIndex];
        const globalStepIndex = walkthroughState.steps.findIndex(step => 
            JSON.stringify(step) === JSON.stringify(currentLocalStep)
        );
        
        if (globalStepIndex !== -1) {
            walkthroughState.currentStepIndex = globalStepIndex;
            saveWalkthroughState();
        }
    });
    
    // Event handler for walkthrough completion
    // Event handler for walkthrough completion
    intro.oncomplete(function() {
        // User clicked the Finish button - mark the walkthrough as complete regardless
        walkthroughState.completionFlag = true;
        saveWalkthroughState();
        
        // Find the last step of the current page in the global steps array
        const lastCurrentPageStep = [...currentPageSteps].pop();
        const lastStepGlobalIndex = walkthroughState.steps.findIndex(step => 
            JSON.stringify(step) === JSON.stringify(lastCurrentPageStep)
        );
        
        // Check if there are more steps on other pages
        const hasMoreSteps = lastStepGlobalIndex < walkthroughState.steps.length - 1;
        
        if (hasMoreSteps) {
            // If there are more steps but user clicked Finish, ask if they want to continue
            const wantsToContinue = confirm("There are more steps in this walkthrough on other pages. Would you like to continue?");
            
            if (wantsToContinue) {
                // If they want to continue, unmark as complete and navigate to next page
                walkthroughState.completionFlag = false;
                saveWalkthroughState();
                
                const nextStep = walkthroughState.steps[lastStepGlobalIndex + 1];
                if (nextStep && nextStep.page !== currentPage) {
                    walkthroughState.currentStepIndex = lastStepGlobalIndex + 1;
                    saveWalkthroughState();
                    navigateToNextPage(nextStep.page);
                }
            } else {
                // User chose to end walkthrough
                updateStatusIndicator("Walkthrough ended.");
                showToast("Walkthrough ended. Click the lightbulb icon to start a new one.", "success");
                setTimeout(() => {
                    document.getElementById("wt-walkthrough-status").style.display = "none";
                }, 3000);
            }
        } else {
            // All steps are complete
            updateStatusIndicator("Walkthrough completed!");
            showToast("Walkthrough completed successfully!", "success");
            setTimeout(() => {
                document.getElementById("wt-walkthrough-status").style.display = "none";
            }, 3000);
        }
    });
    
    // Event handler for walkthrough exit
    intro.onexit(function() {
        if (!intro._completeFlag) {
            // User manually exited the walkthrough
            updateStatusIndicator("Walkthrough paused. Click the icon to resume.");
            showToast("Walkthrough paused. Click the lightbulb icon to resume.", "info");
        }
    });
    
    // Set starting step if needed
    if (startStepIndex > 0) {
        intro.goToStep(startStepIndex);
    }
    
    // Add fallback mechanism for failed element targeting
    intro.onbeforechange(function(targetElement) {
        if (!targetElement) {
            const stepIndex = intro._currentStep;
            const step = processedSteps[stepIndex];
            
            console.warn(`Element not found for step ${stepIndex}: ${step.element}`);
            
            // Extract main description and any quoted text
            const description = step.intro || '';
            let quotedText = null;
            const quotedMatch = description.match(/["']([^"']+)["']/);
            if (quotedMatch) {
                quotedText = quotedMatch[1];
            }
            
            // Try several fallback approaches
            
            // Approach 1: Try to find by text content
            const textElement = findElementByText(description);
            if (textElement) {
                console.log(`Found element by text content: "${textElement.innerText.trim()}"`);
                intro._introItems[stepIndex].element = textElement;
                highlightElement(textElement);
                return;
            }
            
            // Approach 2: Try commonly used selectors for the quoted text
            if (quotedText) {
                // Try to find links with this text
                const linkSelectors = [
                    `a:has(text="${quotedText}")`, // Not standard CSS but we'll try anyway
                    `a[title="${quotedText}"]`,
                    `a[aria-label="${quotedText}"]`,
                    `a[data-title="${quotedText}"]`,
                    `a[data-label="${quotedText}"]`,
                    `[role="link"]:has(text="${quotedText}")`,
                    `[role="button"]:has(text="${quotedText}")`
                ];
                
                for (const selector of linkSelectors) {
                    try {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            console.log(`Found element using selector: ${selector}`);
                            intro._introItems[stepIndex].element = elements[0];
                            highlightElement(elements[0]);
                            return;
                        }
                    } catch (e) {
                        // Some selectors might not be supported by the browser
                        continue;
                    }
                }
                
                // Try generic link with text comparison
                const allLinks = document.querySelectorAll('a');
                for (const link of allLinks) {
                    if (link.innerText.trim().toLowerCase() === quotedText.toLowerCase()) {
                        console.log(`Found link with exact text match: ${quotedText}`);
                        intro._introItems[stepIndex].element = link;
                        highlightElement(link);
                        return;
                    }
                }
                
                // Handle special case: "Join" links in <li><a href="#">Join</a></li>
                if (quotedText.toLowerCase() === 'join' || quotedText.toLowerCase() === 'login' || 
                    quotedText.toLowerCase() === 'sign in' || quotedText.toLowerCase() === 'sign up') {
                    const menuLinks = document.querySelectorAll('li > a');
                    for (const link of menuLinks) {
                        if (link.innerText.trim().toLowerCase() === quotedText.toLowerCase()) {
                            console.log(`Found menu link: ${quotedText}`);
                            intro._introItems[stepIndex].element = link;
                            highlightElement(link);
                            return;
                        }
                    }
                }
            }
            
            // Approach 3: For drop-down menus
            if (description.toLowerCase().includes('dropdown') || 
                description.toLowerCase().includes('menu') || 
                description.toLowerCase().includes('select')) {
                
                // Try to find dropdown triggers
                const dropdownTriggers = document.querySelectorAll(
                    '.dropdown-toggle, [data-toggle="dropdown"], .has-dropdown > a, ' +
                    '[aria-haspopup="true"], [role="combobox"], [aria-expanded]'
                );
                
                if (dropdownTriggers.length > 0) {
                    const trigger = dropdownTriggers[0];
                    console.log(`Found dropdown trigger`);
                    intro._introItems[stepIndex].element = trigger;
                    highlightElement(trigger);
                    return;
                }
            }
            
            // If nothing worked, default to floating position
            console.warn(`No fallback element found for "${description}"`);
            if (intro._introItems && intro._introItems[stepIndex]) {
                intro._introItems[stepIndex].position = 'floating';
            }
        }
    });
    // Start the walkthrough
    intro.start();
}

function highlightElement(element) {
    // Store original styles
    const originalBorder = element.style.border;
    const originalBackground = element.style.background;
    const originalBoxShadow = element.style.boxShadow;
    
    // Apply highlight styles
    element.style.border = '2px solid #ffdd87';
    element.style.background = 'rgba(255, 221, 135, 0.2)';
    element.style.boxShadow = '0 0 10px rgba(255, 221, 135, 0.6)';
    
    // Reset after 3 seconds
    setTimeout(() => {
        element.style.border = originalBorder;
        element.style.background = originalBackground;
        element.style.boxShadow = originalBoxShadow;
    }, 3000);
}

async function initWalkthrough() {
    // Create UI first
    injectUI();
    customizeIntroJS();
    
    // Try to load existing state (across page loads)
    const hasSavedState = loadWalkthroughState();
    
    // Set up event listeners after a short delay to ensure DOM is ready
    setTimeout(() => {
        // Set up event listeners for the session management controls
        const resetButton = document.getElementById("wt-reset-walkthrough");
        if (resetButton) {
            resetButton.addEventListener("click", function() {
                resetWalkthroughState();
                const modal = document.getElementById("wt-query-modal");
                modal.classList.remove("active");
                setTimeout(() => {
                    modal.style.display = "none";
                }, 300);
                updateStatusIndicator("Walkthrough reset. Ready to start a new walkthrough.");
                showToast("Walkthrough reset successfully", "success");
            });
        }
        
        const clearButton = document.getElementById("wt-clear-all-walkthroughs");
        if (clearButton) {
            clearButton.addEventListener("click", function() {
                clearAllDomainWalkthroughs();
                const modal = document.getElementById("wt-query-modal");
                modal.classList.remove("active");
                setTimeout(() => {
                    modal.style.display = "none";
                }, 300);
                updateStatusIndicator("All walkthroughs cleared for this domain.");
                showToast("All walkthroughs cleared for this domain", "success");
            });
        }
        
        const floatingIcon = document.getElementById("wt-floating-icon");
        if (floatingIcon) {
            floatingIcon.addEventListener("click", function () {
                console.log("Floating icon clicked");
                // Check if there's an active walkthrough that isn't completed
                if (walkthroughState.steps.length > 0 && !walkthroughState.completionFlag) {
                    startWalkthrough(true);
                } else {
                    // If walkthrough is completed or there are no steps, show the query modal
                    const modal = document.getElementById("wt-query-modal");
                    modal.style.display = "block";
                    // Force reflow to trigger animation
                    modal.offsetWidth;
                    modal.classList.add("active");
                    const inputField = document.getElementById("wt-walkthrough-input");
                    if (inputField) inputField.focus();
                }
            });
        }
        
        const closeButton = document.getElementById("wt-close-modal");
        if (closeButton) {
            closeButton.addEventListener("click", function() {
                const modal = document.getElementById("wt-query-modal");
                modal.classList.remove("active");
                setTimeout(() => {
                    modal.style.display = "none";
                }, 300);
            });
        }
        
        const queryModal = document.getElementById("wt-query-modal");
        if (queryModal) {
            queryModal.addEventListener("click", function (event) {
                if (event.target === this) {
                    this.classList.remove("active");
                    setTimeout(() => {
                        this.style.display = "none";
                    }, 300);
                }
            });
        }
        
        // Handle suggestion chips
        const suggestionChips = document.querySelectorAll(".wt-suggestion-chip");
        suggestionChips.forEach(chip => {
            chip.addEventListener("click", function() {
                const inputField = document.getElementById("wt-walkthrough-input");
                inputField.value = this.textContent;
                inputField.focus();
            });
        });
        
        // Submit on Enter key
        const inputField = document.getElementById("wt-walkthrough-input");
        if (inputField) {
            inputField.addEventListener("keypress", function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    document.getElementById("wt-generate-walkthrough").click();
                }
            });
        }
        
        const generateButton = document.getElementById("wt-generate-walkthrough");
        if (generateButton) {
            generateButton.addEventListener("click", async function () {
                const userInput = document.getElementById("wt-walkthrough-input").value.trim();
                
                if (!userInput) {
                    showToast("Please enter a query", "error");
                    inputField.focus();
                    return;
                }
                
                // Show loading indicator
                const floatingIcon = document.getElementById("wt-floating-icon");
                floatingIcon.classList.add("loading");
                
                const generatedSteps = await generateWalkthrough(userInput);
                
                // Remove loading indicator
                floatingIcon.classList.remove("loading");
                
                if (generatedSteps.length > 0) {
                    // Reset and start a new walkthrough
                    walkthroughState.steps = generatedSteps;
                    walkthroughState.currentStepIndex = 0;
                    walkthroughState.completionFlag = false; // Reset completion flag for new walkthrough
                    saveWalkthroughState();
                    
                    updateStatusIndicator("Starting walkthrough...");
                    startWalkthrough();
                } else {
                    updateStatusIndicator("Could not generate walkthrough steps.");
                }
            });
        }
    }, 1000);
    // If we need to crawl elements (first time or minimal state reload)
    if (!hasSavedState || walkthroughState.needsRecrawl || Object.keys(walkthroughState.allElements).length === 0) {
        // Start crawling the site
        await crawlSite();
    } else {
        updateElementStatus(`Loaded state with elements from ${Object.keys(walkthroughState.allElements).length} pages.`);
    }
    
    // Set up the DOM observer for dynamic updates
    setupDOMObserver();
    
    // Check if we're continuing a walkthrough from another page
    if (hasSavedState && walkthroughState.steps.length > 0) {
        // Check if this page has steps
        const currentPage = window.location.pathname;
        const hasStepsForThisPage = walkthroughState.steps.some(step => step.page === currentPage);
        
        if (hasStepsForThisPage) {
            updateStatusIndicator("Continuing walkthrough...");
            setTimeout(() => startWalkthrough(true), 1000);
        }
    }
}

// Function to show modal with animation
function showModal() {
    console.log("Showing modal");
    const modal = document.getElementById("wt-query-modal");
    if (!modal) {
        console.error("Modal not found in DOM");
        return;
    }
    
    modal.style.display = "block";
    // Force reflow to trigger animation
    modal.offsetWidth;
    modal.classList.add("active");
    
    // Focus the input field
    const inputField = document.getElementById("wt-walkthrough-input");
    if (inputField) inputField.focus();
}

// Function to wait for page load when page is changing
function waitForPageLoad() {
    return new Promise(resolve => {
        if (document.readyState === "complete") {
            resolve();
        } else {
            window.addEventListener("load", resolve);
        }
    });
}

// ================================================
// When the DOM is ready, load dependencies then initialize the walkthrough
// ================================================
async function main() {
    try {
        await loadDependencies();
        await waitForPageLoad();
        await initWalkthrough();
    } catch (error) {
        console.error("Error initializing walkthrough:", error);
        
        // Show fallback UI with error
        const errorDiv = document.createElement("div");
        errorDiv.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #121212;
            color: #F44336;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            max-width: 300px;
            border: 1px solid #333;
        `;
        errorDiv.innerHTML = `<p><b>Walkthrough Error</b><br>Failed to load required resources.</p>`;
        document.body.appendChild(errorDiv);
    }
}

// Start the application
document.addEventListener("DOMContentLoaded", main);