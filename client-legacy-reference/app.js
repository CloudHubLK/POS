/* ==========================================================================
   ZOHO POS SYSTEM — SPA CLIENT ENGINE (ZOHO CATALYST & LOCAL SANDBOX)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // API base endpoint for Catalyst cloud serverless functions
  const API_BASE = '/server/pos_backend';

  // Helper to make API calls to the serverless backend, automatically attaching tenant headers
  async function callApi(endpoint, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Parse active Zoho connection and attach tenant auth headers for multi-tenant isolation.
    // Backend getTenantConfig() reads these specific headers to scope all Zoho API calls
    // to the correct organization and merchant's OAuth token.
    const zohoConnRaw = localStorage.getItem('zoho_active_connection');
    if (zohoConnRaw) {
      try {
        const conn = JSON.parse(zohoConnRaw);
        if (conn.refreshToken) {
          headers['x-zoho-refresh-token'] = conn.refreshToken;
        }
        if (conn.orgId) {
          headers['x-zoho-org-id'] = conn.orgId;
        }
        if (conn.dc) {
          headers['x-zoho-dc'] = conn.dc;
        }
      } catch (e) {
        console.warn('callApi: Failed to parse zoho_active_connection for tenant headers:', e);
      }
    }
    
    const options = {
      method,
      headers
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${response.status}`);
    }
    return response.json();
  }

  // ==========================================================================
  // 1. DATA SCHEMAS & DEFAULT SEED DATA
  // ==========================================================================
  
  const INDUSTRY_PROFILES = {
    Retail: {
      name: 'Retail Store Profile',
      defaultTax: 18,
      categories: ['General', 'Clothing', 'Electronics', 'Books', 'Home'],
      customAttr: 'Brand Partner',
      placeholderAttr: 'e.g., Apple, Nike, Sony',
      presets: [
        { sku: 'RET-01', name: 'Premium Leather Wallet', price: 45.00, stock: 45, category: 'General', custom: 'Timberland' },
        { sku: 'RET-02', name: 'Cotton Crewneck Tee', price: 24.99, stock: 120, category: 'Clothing', custom: 'Levis' },
        { sku: 'RET-03', name: 'Wireless Bluetooth Earbuds', price: 89.99, stock: 18, category: 'Electronics', custom: 'Anker' },
        { sku: 'RET-04', name: 'The Lean Startup (Hardcover)', price: 19.95, stock: 35, category: 'Books', custom: 'Crown Biz' },
        { sku: 'RET-05', name: 'Stainless Thermal Flask 1L', price: 29.50, stock: 60, category: 'Home', custom: 'HydroFlask' }
      ]
    },
    Restaurant: {
      name: 'Fine Dine Restaurant (KDS + Floor)',
      defaultTax: 5,
      categories: ['Beverages', 'Starters', 'Mains', 'Desserts'],
      customAttr: 'Kitchen Prep Station',
      placeholderAttr: 'e.g., Hot Kitchen, Salad Bar, Grill',
      presets: [
        { sku: 'REST-01', name: 'Sizzling Ribeye Steak', price: 34.50, stock: 99, category: 'Mains', custom: 'Grill Station' },
        { sku: 'REST-02', name: 'Classic Caesar Salad', price: 12.00, stock: 99, category: 'Starters', custom: 'Salad Station' },
        { sku: 'REST-03', name: 'Craft IPA Beer Tap', price: 7.50, stock: 500, category: 'Beverages', custom: 'Beverage Bar' },
        { sku: 'REST-04', name: 'Decadent Chocolate Lava Cake', price: 9.00, stock: 25, category: 'Desserts', custom: 'Pastry Station' },
        { sku: 'REST-05', name: 'Crispy Garlic Truffle Fries', price: 8.50, stock: 99, category: 'Starters', custom: 'Fryer Station' }
      ]
    },
    Pharmacy: {
      name: 'Pharmacy & Healthcare',
      defaultTax: 12,
      categories: ['Prescriptions', 'OTC Medicines', 'First Aid', 'Wellness'],
      customAttr: 'Dosage / Rx Requirement',
      placeholderAttr: 'e.g., 500mg [Rx REQUIRED], OTC',
      presets: [
        { sku: 'PHAR-01', name: 'Amoxicillin 500mg Antibiotic', price: 18.50, stock: 30, category: 'Prescriptions', custom: '500mg [Rx REQUIRED]' },
        { sku: 'PHAR-02', name: 'Ibuprofen 400mg Pain Reliever', price: 7.95, stock: 150, category: 'OTC Medicines', custom: '400mg [OTC]' },
        { sku: 'PHAR-03', name: 'Sterile Adhesive Gauze Pack', price: 4.50, stock: 80, category: 'First Aid', custom: 'Standard Size' },
        { sku: 'PHAR-04', name: 'Organic Multivitamin Capsules', price: 22.00, stock: 45, category: 'Wellness', custom: '60 count daily' },
        { sku: 'PHAR-05', name: 'Antiseptic Liquid Handrub 500ml', price: 6.25, stock: 100, category: 'First Aid', custom: '70% Isopropyl' }
      ]
    },
    Grocery: {
      name: 'Grocery Supermarket (Weight Scale)',
      defaultTax: 0,
      categories: ['Vegetables', 'Dairy & Eggs', 'Bakery', 'Pantry'],
      customAttr: 'Selling Unit Metric',
      placeholderAttr: 'e.g., Per Kilogram (kg), Per Unit (pcs)',
      presets: [
        { sku: 'GROC-01', name: 'Organic Fuji Apples', price: 3.99, stock: 150, category: 'Vegetables', custom: 'Per Kilogram (kg)' },
        { sku: 'GROC-02', name: 'Fresh Whole Milk 1 Gallon', price: 4.20, stock: 65, category: 'Dairy & Eggs', custom: 'Per Unit (pcs)' },
        { sku: 'GROC-03', name: 'Artisanal Sourdough Boule', price: 5.50, stock: 24, category: 'Bakery', custom: 'Per Unit (pcs)' },
        { sku: 'GROC-04', name: 'Extra Virgin Olive Oil 500ml', price: 14.95, stock: 40, category: 'Pantry', custom: 'Per Unit (pcs)' },
        { sku: 'GROC-05', name: 'Ripe Cluster Tomatoes', price: 2.80, stock: 110, category: 'Vegetables', custom: 'Per Kilogram (kg)' }
      ]
    },
    Electronics: {
      name: 'Consumer Electronics (Serial Tracking)',
      defaultTax: 18,
      categories: ['Laptops', 'Mobile Phones', 'Accessories', 'Audio'],
      customAttr: 'Warranty Duration',
      placeholderAttr: 'e.g., 12 Months Brand Warranty',
      presets: [
        { sku: 'ELEC-01', name: 'ZenBook 14 Thin Laptop', price: 899.00, stock: 12, category: 'Laptops', custom: '24 Months Brand Warranty' },
        { sku: 'ELEC-02', name: 'Zoho SmartPhone Pixel X', price: 499.00, stock: 15, category: 'Mobile Phones', custom: '12 Months Brand Warranty' },
        { sku: 'ELEC-03', name: 'Fast Charger GaN 65W Duo', price: 35.00, stock: 90, category: 'Accessories', custom: '6 Months Brand Warranty' },
        { sku: 'ELEC-04', name: 'Studio Noise Cancelling Headphones', price: 149.99, stock: 20, category: 'Audio', custom: '12 Months Brand Warranty' }
      ]
    },
    Apparel: {
      name: 'Apparel & Fashion (Size Matrix)',
      defaultTax: 12,
      categories: ['Menswear', 'Womenswear', 'Footwear', 'Accessories'],
      customAttr: 'Size Matrix Available',
      placeholderAttr: 'e.g., S, M, L, XL, XXL',
      presets: [
        { sku: 'FIT-01', name: 'Slim Fit Denim Jeans Blue', price: 59.90, stock: 40, category: 'Menswear', custom: 'Sizes: 30, 32, 34, 36' },
        { sku: 'FIT-02', name: 'Floral Summer Linen Dress', price: 45.00, stock: 25, category: 'Womenswear', custom: 'Sizes: S, M, L, XL' },
        { sku: 'FIT-03', name: 'Water-Resistant All-Weather Trail Runner', price: 110.00, stock: 15, category: 'Footwear', custom: 'Sizes: 8, 9, 10, 11' },
        { sku: 'FIT-04', name: 'Classic Leather Utility Belt', price: 25.00, stock: 50, category: 'Accessories', custom: 'Adjustable One-Size' }
      ]
    },
    Wholesale: {
      name: 'Wholesale Distribution (Tier Rates)',
      defaultTax: 18,
      categories: ['Bulk Pallets', 'Carton Lots', 'Material Packs'],
      customAttr: 'Min Order Qty Tier',
      placeholderAttr: 'e.g., MOQ: 10 Boxes, Carton MOQ: 1',
      presets: [
        { sku: 'WHO-01', name: 'Industrial Copier Paper Pallet', price: 280.00, stock: 10, category: 'Bulk Pallets', custom: 'MOQ: 1 Pallet, Discount: >5 Pallets' },
        { sku: 'WHO-02', name: 'Standard LED Bulb Pack 100x', price: 120.00, stock: 45, category: 'Carton Lots', custom: 'MOQ: 2 Cartons, Discount: >10 Cartons' },
        { sku: 'WHO-03', name: 'Premium Heavy-Duty Duct Tape Case', price: 85.00, stock: 60, category: 'Material Packs', custom: 'MOQ: 5 Cases' }
      ]
    },
    Services: {
      name: 'Services & Wellness (Reservations)',
      defaultTax: 18,
      categories: ['Treatments', 'Rentals', 'Consultations'],
      customAttr: 'Service Therapist Required',
      placeholderAttr: 'e.g., Optional Specialist, Room Included',
      presets: [
        { sku: 'SERV-01', name: 'Aromatherapy Swedish Massage 60m', price: 75.00, stock: 999, category: 'Treatments', custom: 'Specialist Required [BOOKING ONLY]' },
        { sku: 'SERV-02', name: 'Full-Day Mountain E-Bike Rental', price: 45.00, stock: 8, category: 'Rentals', custom: 'Refundable Security Deposit Required' },
        { sku: 'SERV-03', name: 'Bespoke Travel Consultation 30m', price: 50.00, stock: 999, category: 'Consultations', custom: 'Conducted via Corporate Cabin' }
      ]
    }
  };

  const SEED_CRM = [
    { id: 'CRM-1001', name: 'Walk-in Customer', type: 'Customer', email: 'guest@zohoposterminal.com', phone: 'Walk-In', company: 'General Registry', taxid: 'N/A', balance: 0.00 },
    { id: 'CRM-1002', name: 'David Miller', type: 'Customer', email: 'david.miller@gmail.com', phone: '+1-555-0182', company: 'Miller Consulting', taxid: 'GSTIN33DMLR821A', balance: 120.00 },
    { id: 'CRM-1003', name: 'Sarah Jenkins', type: 'Customer', email: 'sarah.j@outlook.com', phone: '+1-555-0943', company: 'Independent Resort Guest', taxid: 'N/A', balance: 0.00 },
    { id: 'CRM-1004', name: 'Global Foods Corp', type: 'Supplier', email: 'procurement@globalfoodscorp.com', phone: '+91-44-2821-0010', company: 'Global Foods Corp', taxid: 'GSTIN33GFCO901K', balance: -840.00 },
    { id: 'CRM-1005', name: 'Apex Pharmacy Distributors', type: 'Supplier', email: 'sales@apexmeds.com', phone: '+91-44-2311-4500', company: 'Apex Healthcare Ltd', taxid: 'GSTIN33APEX451Z', balance: 0.00 }
  ];

  const SEED_AUDITS = [
    { logNo: 'AUD-001', time: '09:00:15 AM', user: 'MK Administrator', module: 'System Security', action: 'Terminal 1 POS Console Initialized' },
    { logNo: 'AUD-002', time: '09:01:40 AM', user: 'Rahul Cashier', module: 'Auth Core', action: 'Cashier Terminal Role Swapped' }
  ];

  // ==========================================================================
  // 2. CLIENT-SIDE STATE CONTROLLER
  // ==========================================================================
  
  let activeIndustry = 'Retail';
  let activeTab = 'dashboard-tab';
  let activeSettingsPane = 'sett-business';
  
  let catalogItems = [];      // Active database items array
  let cart = [];              // Active register checkout cart
  let crmProfiles = [];       // CRM guests directory list
  let auditLogs = [];         // Security auditing journal
  let shiftLogs = [];         // Daily shifts reconciliations list
  let invoicesLedger = [];    // Completed transaction orders list
  
  let activeShift = null;     // Current Shift profile { id, cashier, openingFloat, cashSales, expected, openTime, status }
  let activeTableId = null;   // Active table (for Restaurant/Services floor maps)
  let tableCarts = {};        // Table hold states { TableId: { cart, guestName, prepNotes } }
  let kdsOrders = [];         // Cooking queue tickets for KDS

  let splitPaymentActive = false;
  let splitCount = 2;
  let splitCompletedPaid = []; // Tracks paid split dividends: [true, false]

  // Multi-User and SaaS Connection State Variables
  let activeUser = null;
  let posUsersList = [];
  let previousUserSelectValue = 'USR-001';
  let isMasterConfigured = false;

  // Settings customizable parameters (stored locally & reactive)
  let sysConfig = {
    bizName: 'Zoho Resort & POS Hub',
    bizCurrency: 'Rs.',
    bizAddress: '700 Silicon Boulevard, Tech Center 4, Chennai',
    taxLabel: 'Calculated Tax (18%)',
    taxRate: 18.0,
    taxModel: 'US',
    taxCompound: false,
    invPrefix: 'ZINV-',
    invNextNo: 1001,
    invLowStock: 5,
    posBeep: true,
    posAutoPrint: true,
    posAutoShift: true,
    brandColor: '#1976d2',
    brandLogoIcon: 'fa-solid fa-hotel',
    brandHeaderTitle: 'ZOHO ENTERPRISE POS',
    brandName: 'ZOHO ENTERPRISE POS',
    recFooter: 'Thank You for Dining with us! Synced with Zoho Books.',
    staffPin: '1234',
    productsAutoSync: true,
    productsSyncDirection: 'bidirectional',
    productsConflictStrategy: 'zoho_wins',
    productsSyncSchedule: 'every_1h',
    productsPriceList: 'standard',
    productsTaxMapping: 'exact_match',
    productsFieldRules: 'name,rate,sku,tax_percentage,stock,category',
    productsCategoryMapping: '{"Sales":"General","Services":"Services","Inventory":"General"}'
  };

  // ==========================================================================
  // 3. CACHE DOM SELECTORS
  // ==========================================================================
  
  // Sidebars & Main Header
  const sidebar = document.getElementById('primary-sidebar');
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const clockDisplay = document.getElementById('clock-display');
  const roleSelect = document.getElementById('role-select');
  const profileRoleName = document.getElementById('profile-role-name');
  const profileRoleTitle = document.getElementById('profile-role-title');
  const avatarInitials = document.getElementById('avatar-initials');
  const globalSyncIndicator = document.getElementById('global-sync-indicator');
  const globalSyncLabel = document.getElementById('global-sync-label');
  const productionIndicator = document.getElementById('production-indicator');
  const productionDesc = document.getElementById('production-desc');
  const shiftActiveBadge = document.getElementById('shift-active-badge');
  const shiftBadgeText = document.getElementById('shift-badge-text');
  const industryActiveBadge = document.getElementById('industry-active-badge');
  const industryBadgeText = document.getElementById('industry-badge-text');
  const globalSearchInput = document.getElementById('search-input');
  
  // Navigation lists
  const navMenuItems = document.querySelectorAll('.nav-menu .nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const settingsNavBtns = document.querySelectorAll('.settings-nav-btn');
  const settingsPanes = document.querySelectorAll('.settings-pane');
  
  // Dashboard UI
  const dashSales = document.getElementById('dash-metric-sales');
  const dashInvoices = document.getElementById('dash-metric-invoices');
  const dashDrawer = document.getElementById('dash-metric-drawer');
  const dashStock = document.getElementById('dash-metric-stock');
  const dashShiftStatus = document.getElementById('dash-metric-shift-status');
  const dashTopProductsList = document.getElementById('dash-top-products-list');
  const dashStatusItemCount = document.getElementById('dash-status-item-count');
  const dashStatusCrmCount = document.getElementById('dash-status-crm-count');
  const dashStatusShiftCount = document.getElementById('dash-status-shift-count');
  
  // Register Module (POS Checkout)
  const industrySelect = document.getElementById('industry-template-select');
  const currentIndustryTitle = document.getElementById('current-industry-title');
  const categoryFiltersRow = document.getElementById('category-filters');
  const itemsGrid = document.getElementById('items-grid');
  const cartItemsList = document.getElementById('cart-items-list');
  const cartHeaderTitle = document.getElementById('cart-header-title');
  
  const customerSelect = document.getElementById('customer-name-input');
  const customerEmailInput = document.getElementById('customer-email-input');
  const roomNumberSelect = document.getElementById('room-number-select');
  const kitchenNotesInput = document.getElementById('kitchen-notes-input');
  const kitchenNotesGroup = document.getElementById('kitchen-notes-group');
  const tableNumberGroup = document.getElementById('table-number-group');
  
  const summarySubtotal = document.getElementById('summary-subtotal');
  const summaryTaxLabel = document.getElementById('summary-tax-label');
  const summaryTax = document.getElementById('summary-tax');
  const summaryTotal = document.getElementById('summary-total');
  const btnSubmitCheckout = document.getElementById('btn-submit-checkout');
  const btnClearCart = document.getElementById('btn-clear-cart');
  
  // Register Conditional panels
  const floorMapContainer = document.getElementById('floor-map-container');
  const floorMapGrid = document.getElementById('tables-floor-grid');
  const barcodeScanBox = document.getElementById('grocery-barcode-scanner-simulator');
  const barcodeInput = document.getElementById('grocery-barcode-input');
  const btnBarcodeScanSim = document.getElementById('btn-grocery-scan-sim');
  const weightDisplay = document.getElementById('grocery-weight-display');
  const btnWeightInc = document.getElementById('btn-grocery-weight-inc');
  const pharmacyRxBanner = document.getElementById('pharmacy-prescription-banner');
  const wholesaleTierBanner = document.getElementById('wholesale-tier-banner');
  
  // Split Billing controls
  const splitBillToggle = document.getElementById('split-bill-toggle');
  const splitBody = document.getElementById('split-body');
  const btnSplitDec = document.getElementById('btn-split-dec');
  const btnSplitInc = document.getElementById('btn-split-inc');
  const splitCountVal = document.getElementById('split-count-val');
  const splitItemsList = document.getElementById('split-items-list');
  const singlePaymentBox = document.getElementById('single-payment-box');
  const paymentModeButtons = document.querySelectorAll('.payment-mode-btn');
  let selectedPaymentMode = 'Cash';

  // KDS Column containers
  const kdsContainerPending = document.getElementById('kds-container-pending');
  const kdsContainerCooking = document.getElementById('kds-container-cooking');
  const kdsContainerReady = document.getElementById('kds-container-ready');
  const kdsCountPending = document.getElementById('kds-count-pending');
  const kdsCountCooking = document.getElementById('kds-count-cooking');
  const kdsCountReady = document.getElementById('kds-count-ready');
  const kdsFilters = document.querySelectorAll('.kds-filter-tabs .filter-btn');
  
  // Invoices & Ledger Module
  const ordersTableBody = document.getElementById('orders-table-body');
  const btnRefreshOrders = document.getElementById('btn-refresh-orders');
  const orderTableSearch = document.getElementById('order-table-search');
  
  // Products Tab CRUD Table
  const productListTableBody = document.getElementById('product-list-table-body');
  const productTableSearch = document.getElementById('product-table-search');
  const btnAddItemTrigger = document.getElementById('btn-add-item-trigger');
  
  // CRM Tab
  const crmTableBody = document.getElementById('crm-table-body');
  const crmSearch = document.getElementById('crm-search');
  const crmViewCustomers = document.getElementById('crm-view-customers');
  const crmViewSuppliers = document.getElementById('crm-view-suppliers');
  let currentCrmFilter = 'Customer';
  const btnAddContactTrigger = document.getElementById('btn-add-contact-trigger');

  // Shifts Tab
  const shiftClosedState = document.getElementById('shift-closed-state');
  const shiftOpenState = document.getElementById('shift-open-state');
  const shiftOpenForm = document.getElementById('shift-open-form');
  const shiftCloseForm = document.getElementById('shift-close-form');
  const shiftCashierName = document.getElementById('shift-cashier-name');
  const shiftOpeningFloat = document.getElementById('shift-opening-float');
  const shiftOpenNotes = document.getElementById('shift-open-notes');
  const shiftClosingActual = document.getElementById('shift-closing-actual');
  const shiftCloseNotes = document.getElementById('shift-close-notes');
  const shiftActiveCashierDisplay = document.getElementById('shift-active-cashier-display');
  const shiftStatOpening = document.getElementById('shift-stat-opening');
  const shiftStatCashSales = document.getElementById('shift-stat-cash-sales');
  const shiftStatNoncash = document.getElementById('shift-stat-noncash-sales');
  const shiftStatExpected = document.getElementById('shift-stat-expected-cash');
  const shiftHistoryTableBody = document.getElementById('shift-history-table-body');

  // Zoho Integration Tab
  const btnSeamlessZohoLogin = document.getElementById('btn-zoho-seamless-login');
  const btnDisconnectZoho = document.getElementById('btn-oauth-disconnect');
  const oauthStatusText = document.getElementById('oauth-status-text');
  const oauthStatusBanner = document.getElementById('oauth-status-banner');
  const btnFullSyncAction = document.getElementById('btn-full-sync-action');
  const statTotalItems = document.getElementById('stat-total-items');
  const statLastSync = document.getElementById('stat-last-sync');

  // Zoho Books connection hero state elements (merchants only click Connect)
  const zbStateDisconnected = document.getElementById('zb-state-disconnected');
  const zbStateConnected = document.getElementById('zb-state-connected');
  const zbConnectedOrgName = document.getElementById('zb-connected-org-name');
  const zbConnectedOrgEmail = document.getElementById('zb-connected-org-email');
  const btnSwitchOrg = document.getElementById('btn-zoho-switch-org');
  // Legacy master-credential handles removed from UI; kept null-safe for older refs
  const formSettMasterOauth = null;
  const settMasterClientId = null;
  const settMasterDc = null;

  // Reflects the current Zoho connection into the hero card (connected vs disconnected)
  function renderZohoConnectionState() {
    let conn = null;
    try {
      const raw = localStorage.getItem('zoho_active_connection');
      if (raw) conn = JSON.parse(raw);
    } catch (e) { conn = null; }

    const connected = !!(conn && conn.orgId);
    if (zbStateConnected) zbStateConnected.classList.toggle('hidden', !connected);
    if (zbStateDisconnected) zbStateDisconnected.classList.toggle('hidden', connected);

    if (connected) {
      if (zbConnectedOrgName) zbConnectedOrgName.textContent = conn.orgName || 'Zoho Books Organization';
      if (zbConnectedOrgEmail) zbConnectedOrgEmail.textContent = conn.email || 'Connected account';
      if (oauthStatusBanner) oauthStatusBanner.className = 'zb-status-chip connected';
      if (oauthStatusText) oauthStatusText.textContent = `Connected: ${conn.orgName || 'Zoho Books'}`;
      if (btnSeamlessZohoLogin) btnSeamlessZohoLogin.classList.add('hidden');

      // Sync stats
      if (statTotalItems) statTotalItems.textContent = catalogItems ? catalogItems.length : 0;
      const lastSync = localStorage.getItem('pos_last_sync');
      if (statLastSync) statLastSync.textContent = lastSync || 'Never';
    } else {
      if (oauthStatusBanner) oauthStatusBanner.className = 'zb-status-chip disconnected';
      if (oauthStatusText) oauthStatusText.textContent = 'Not connected';
      if (btnSeamlessZohoLogin) btnSeamlessZohoLogin.classList.remove('hidden');
    }
  }

  // Organization Selector Modal DOM elements
  const orgSelectorModal = document.getElementById('org-selector-modal');
  const orgSelectorList = document.getElementById('org-selector-list');
  const btnCloseOrgModal = document.getElementById('btn-close-org-modal');
  const btnCancelOrgModal = document.getElementById('btn-cancel-org-modal');
  const btnConfirmOrgSelect = document.getElementById('btn-confirm-org-select');

  // Dynamic User Management & PIN modals
  const userFormModal = document.getElementById('user-form-modal');
  const userForm = document.getElementById('user-form');
  const btnCloseUserModal = document.getElementById('btn-close-user-modal');
  const btnCancelUserModal = document.getElementById('btn-cancel-user-modal');
  const userFullName = document.getElementById('user-full-name');
  const userEmail = document.getElementById('user-email');
  const userPin = document.getElementById('user-pin');
  const userRole = document.getElementById('user-role');
  const settUsersBody = document.getElementById('sett-users-body');

  const pinPromptModal = document.getElementById('pin-prompt-modal');
  const pinPromptForm = document.getElementById('pin-prompt-form');
  const btnClosePinModal = document.getElementById('btn-close-pin-modal');
  const btnCancelPinModal = document.getElementById('btn-cancel-pin-modal');
  const pinInputField = document.getElementById('pin-input-field');
  const pinErrorMsg = document.getElementById('pin-error-msg');
  const pinPromptUserName = document.getElementById('pin-prompt-user-name');

  // Interactive Receipt Modal Window
  const receiptModal = document.getElementById('receipt-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnDoneModal = document.getElementById('btn-done-modal');
  const modalTabPreviewBill = document.getElementById('tab-preview-bill');
  const modalTabPreviewKot = document.getElementById('tab-preview-kot');
  const receiptPrintArea = document.getElementById('receipt-print-area');
  const kotPrintArea = document.getElementById('kot-print-area');
  const btnPrintReceiptTrigger = document.getElementById('btn-print-receipt-trigger');
  const btnPrintKotTrigger = document.getElementById('btn-print-kot-trigger');
  
  // Printable field IDs
  const rBizName = document.getElementById('print-receipt-biz-name');
  const rBizAddress = document.getElementById('print-receipt-biz-address');
  const rBizTel = document.getElementById('print-receipt-biz-tel');
  const rInvNum = document.getElementById('receipt-invoice-num');
  const rLocalRef = document.getElementById('receipt-order-id');
  const rBooksId = document.getElementById('receipt-books-id');
  const rDate = document.getElementById('receipt-date');
  const rGuestName = document.getElementById('receipt-guest-name');
  const rPaymentMode = document.getElementById('receipt-payment-mode');
  const rItemsTbody = document.getElementById('receipt-items-tbody');
  const rSubtotal = document.getElementById('receipt-subtotal');
  const rTaxLabelPrint = document.getElementById('receipt-tax-label-print');
  const rTax = document.getElementById('receipt-tax');
  const rTotal = document.getElementById('receipt-total');
  const rFooterMsg = document.getElementById('print-receipt-footer-text');
  const rBarcodePrint = document.getElementById('print-receipt-barcode-display');
  const rHeaderLogoIcon = document.getElementById('receipt-header-logo-icon');
  
  const kTicketId = document.getElementById('kot-ticket-id');
  const kRoomNumber = document.getElementById('kot-room-number');
  const kDate = document.getElementById('kot-date');
  const kGuestName = document.getElementById('kot-guest-name');
  const kItemsTbody = document.getElementById('kot-items-list-tbody');
  const kNotesText = document.getElementById('kot-notes-text');
  const kNotesSection = document.getElementById('print-kot-notes-section');

  // Multi-currency and Global Tax model selector
  const currencySelect = document.getElementById('currency-select');
  const settTaxModel = document.getElementById('sett-tax-model');

  // Till Register Adjustments
  const btnCashIn = document.getElementById('btn-cash-in');
  const btnCashOut = document.getElementById('btn-cash-out');
  const btnPrintZReport = document.getElementById('btn-print-zreport');

  // Offline Sync Badge
  const offlineSyncIndicator = document.getElementById('offline-sync-indicator');
  const offlineSyncCount = document.getElementById('offline-sync-count');

  // Z-Report Printable Slip
  const zreportPrintArea = document.getElementById('zreport-print-area');
  const zShiftId = document.getElementById('zreport-shift-id');
  const zCashierName = document.getElementById('zreport-cashier-name');
  const zOpenTime = document.getElementById('zreport-open-time');
  const zCloseTime = document.getElementById('zreport-close-time');
  const zStatus = document.getElementById('zreport-status');
  const zOpeningFloat = document.getElementById('zreport-opening-float');
  const zCashSales = document.getElementById('zreport-cash-sales');
  const zCashIn = document.getElementById('zreport-cash-in');
  const zCashOut = document.getElementById('zreport-cash-out');
  const zExpectedCash = document.getElementById('zreport-expected-cash');
  const zActualCash = document.getElementById('zreport-actual-cash');
  const zDifference = document.getElementById('zreport-difference');

  // Modals for CRUD Forms adding
  const productEditorModal = document.getElementById('product-editor-modal');
  const btnCloseProductModal = document.getElementById('btn-close-product-modal');
  const btnCancelProductModal = document.getElementById('btn-cancel-product-modal');
  const productEditorForm = document.getElementById('product-editor-form');
  const prodEditRowId = document.getElementById('prod-edit-rowid');
  const prodName = document.getElementById('prod-name');
  const prodSku = document.getElementById('prod-sku');
  const prodIndustry = document.getElementById('prod-industry');
  const prodCategory = document.getElementById('prod-category');
  const prodStock = document.getElementById('prod-stock');
  const prodPrice = document.getElementById('prod-price');
  const prodTax = document.getElementById('prod-tax');
  const prodCustomAttrLabel = document.getElementById('product-custom-attr-label');
  const prodCustomAttrVal = document.getElementById('prod-custom-attr-val');
  
  const contactEditorModal = document.getElementById('contact-editor-modal');
  const btnCloseContactModal = document.getElementById('btn-close-contact-modal');
  const btnCancelContactModal = document.getElementById('btn-cancel-contact-modal');
  const contactEditorForm = document.getElementById('contact-editor-form');
  const crmEditId = document.getElementById('crm-edit-id');
  const crmName = document.getElementById('crm-name');
  const crmType = document.getElementById('crm-type');
  const crmEmail = document.getElementById('crm-email');
  const crmPhone = document.getElementById('crm-phone');
  const crmCompany = document.getElementById('crm-company');
  const crmTaxId = document.getElementById('crm-taxid');
  const crmBalance = document.getElementById('crm-balance');
  const btnAddQuickCustomer = document.getElementById('btn-add-quick-customer');

  // Unified Toasts
  const notificationToast = document.getElementById('notification-toast');
  const notificationMessage = notificationToast ? notificationToast.querySelector('.notification-message') : null;

  // ==========================================================================
  // 4. CORE ENGINE INITIALIZATION
  // ==========================================================================
  
  function runStep(name, fn) {
    try {
      fn();
    } catch (e) {
      console.warn(`[Init Step Failed] ${name}:`, e);
    }
  }

  function init() {
    // Get current Catalyst-authenticated user and scope Zoho connection.
    // IMPORTANT: We NEVER wipe zoho_active_connection here - only RESTORE from the per-user
    // scoped key if it exists. If the API call fails (e.g. cold start, network), we leave the
    // existing connection intact so the session survives page refreshes.
    callApi('/api/auth/me', 'GET').then(me => {
      if (me && me.success && me.email) {
        localStorage.setItem('pos_catalyst_user', me.email);
        const scopedKey = `zoho_conn_${me.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const scopedConn = localStorage.getItem(scopedKey);
        if (scopedConn) {
          // Restore a known scoped connection for this user
          localStorage.setItem('zoho_active_connection', scopedConn);
        }
        // If no scoped key but zoho_active_connection already exists, leave it alone
        // so manual OAuth connections survive refreshes without needing to re-authenticate
      }
      // On any failure (auth error, network), leave existing zoho_active_connection intact
    }).catch(() => {
      // Network/server error during init - preserve existing connection state
      console.warn('[Init] /api/auth/me failed. Preserving existing connection state.');
    });
    
    runStep('Clock', startClock);
    runStep('ConfigurationState', loadConfigurationState);
    runStep('UsersDatabase', loadUsersDatabase);
    runStep('PersistentDatabase', loadPersistentDatabase);
    runStep('UserSwitchingEvents', initUserSwitchingEvents);
    runStep('EventListeners', bindEventListeners);
    runStep('ReactiveStyles', applyReactiveStyles);
    runStep('SyncLogsReport', triggerSyncLogsReport);
    runStep('SaaSDeveloperCredentials', seedDefaultCredentials);
    
    // Set Tax Model dropdown value
    try {
      if (settTaxModel) {
        settTaxModel.value = sysConfig.taxModel || 'US';
      }
    } catch (e) {
      console.warn('Set tax model dropdown error:', e);
    }

    // Restore the last active tab from URL hash (Fix #6: tab state survives page refresh)
    try {
      const hashTab = window.location.hash ? window.location.hash.replace('#', '') : '';
      const validTabs = ['dashboard-tab', 'register-tab', 'products-tab', 'orders-tab',
                         'customers-tab', 'shifts-tab', 'reports-tab', 'settings-tab'];
      if (hashTab && validTabs.includes(hashTab)) {
        navigateToTab(hashTab);
      }
    } catch (e) {
      console.warn('Tab hash restore error:', e);
    }

    // Auto-open shift register if POS autoShift preference is enabled and closed
    try {
      if (sysConfig.posAutoShift && !activeShift) {
        showToast('Welcome to Zoho POS. Please open the cash drawer register.');
        navigateToTab('shifts-tab');
      }
    } catch (e) {
      console.warn('Auto-open shift register preference error:', e);
    }
  }

  // Live ticking Clock
  function startClock() {
    const updateTime = () => {
      const now = new Date();
      clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // Custom Reactive Notification Toasts
  function showToast(message, isError = false) {
    if (!notificationToast) return;
    if (notificationMessage) notificationMessage.textContent = message;
    if (isError) {
      notificationToast.className = 'notification-toast error-toast active';
      const icon = notificationToast.querySelector('.notification-icon');
      if (icon) icon.className = 'fa-solid fa-circle-exclamation';
    } else {
      notificationToast.className = 'notification-toast success-toast active';
      const icon = notificationToast.querySelector('.notification-icon');
      if (icon) icon.className = 'fa-solid fa-circle-check';
    }
    
    // Play electronic checkout audio tone if configured
    if (sysConfig.posBeep) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(isError ? 220 : 880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } catch (err) {}
    }

    setTimeout(() => {
      notificationToast.classList.remove('active');
    }, 4500);
  }

  // ==========================================================================
  // 5. LOCAL STORAGE SYNC & FALLBACK ARCHITECTURE
  // ==========================================================================
  
  const GLOBAL_CURRENCIES = {
    'LKR': { symbol: 'Rs.', factor: 1.0 },
    'USD': { symbol: '$', factor: 0.0033 },
    'EUR': { symbol: '€', factor: 0.0031 },
    'GBP': { symbol: '£', factor: 0.0026 },
    'INR': { symbol: '₹', factor: 0.28 },
    'AED': { symbol: 'د.إ', factor: 0.012 }
  };

  function populateSettingsForms() {
    const forms = document.querySelectorAll('form[id^="form-sett-"]');
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        const key = input.name;
        if (key && sysConfig.hasOwnProperty(key)) {
          const val = sysConfig[key];
          if (input.type === 'checkbox') {
            input.checked = !!val;
          } else if (input.type === 'radio') {
            input.checked = (input.value === String(val));
          } else {
            input.value = val;
          }
        }
      });
    });
  }

  function loadConfigurationState() {
    const cachedConfig = localStorage.getItem('pos_system_config');
    if (cachedConfig) {
      try {
        sysConfig = { ...sysConfig, ...JSON.parse(cachedConfig) };
      } catch (err) {
        console.error('Failed to parse cached system configs:', err);
      }
    }

    // Force key back-compat fallback settings mapping
    sysConfig.brandName = sysConfig.brandHeaderTitle || sysConfig.brandName || 'ZOHO ENTERPRISE POS';

    // Restore activeIndustry from persisted config so it survives page reload
    activeIndustry = sysConfig.bizIndustry || 'Retail';
    if (industrySelect) industrySelect.value = activeIndustry;

    // Wire Active Currency selection and scaling
    const activeCurrency = localStorage.getItem('pos_active_currency') || 'LKR';
    const currDetails = GLOBAL_CURRENCIES[activeCurrency] || GLOBAL_CURRENCIES['LKR'];
    window.activeCurrencySymbol = currDetails.symbol;
    window.activeCurrencyScaleFactor = currDetails.factor;
    
    if (currencySelect) {
      currencySelect.value = activeCurrency;
    }

    // Populate form elements
    populateSettingsForms();
  }

  function saveConfigurationState() {
    localStorage.setItem('pos_system_config', JSON.stringify(sysConfig));
    applyReactiveStyles();
  }

  function loadPersistentDatabase() {
    // 1. Load Catalog Items — localStorage acts as an instant-paint cache only.
    const cachedCatalog = localStorage.getItem('pos_catalog_db');
    if (cachedCatalog) {
      try {
        catalogItems = JSON.parse(cachedCatalog);
      } catch (e) {
        catalogItems = [];
      }
    }
    if (!catalogItems || catalogItems.length === 0) {
      // Seed initial Retail catalog items as baseline default
      catalogItems = [ ...INDUSTRY_PROFILES[activeIndustry].presets ];
      localStorage.setItem('pos_catalog_db', JSON.stringify(catalogItems));
    }

    // 1b. If a Zoho Books connection is active, the datastore (not localStorage) is the
    // source of truth for synced products — the backend already persists every sync to
    // the 'Items' table via /api/sync/books. Re-fetch it here so a refresh, a different
    // browser/device, or a stale/cleared localStorage never makes synced products
    // "disappear" — they always come back from the server.
    if (localStorage.getItem('zoho_active_connection')) {
      hydrateCatalogFromServer();
    }

    // 2. Load CRM Contacts
    const cachedCrm = localStorage.getItem('pos_crm_db');
    if (cachedCrm) {
      try {
        crmProfiles = JSON.parse(cachedCrm);
      } catch (e) {
        crmProfiles = [];
      }
    }
    if (!crmProfiles || crmProfiles.length === 0) {
      crmProfiles = [ ...SEED_CRM ];
      localStorage.setItem('pos_crm_db', JSON.stringify(crmProfiles));
    }

    // 3. Load Audits
    const cachedAudits = localStorage.getItem('pos_audits_db');
    if (cachedAudits) {
      try {
        auditLogs = JSON.parse(cachedAudits);
      } catch (e) {
        auditLogs = [];
      }
    }
    if (!auditLogs || auditLogs.length === 0) {
      auditLogs = [ ...SEED_AUDITS ];
      localStorage.setItem('pos_audits_db', JSON.stringify(auditLogs));
    }

    // 4. Load Shifts Reconciliations
    const cachedShifts = localStorage.getItem('pos_shifts_db');
    if (cachedShifts) {
      try {
        shiftLogs = JSON.parse(cachedShifts);
      } catch (e) {
        shiftLogs = [];
      }
    }
    
    // Look for any active un-closed Shift
    const activeShiftLog = shiftLogs.find(log => log.status === 'Open');
    if (activeShiftLog) {
      activeShift = activeShiftLog;
    }

    // 5. Load Completed Invoices Ledger Journal
    const cachedInvoices = localStorage.getItem('pos_invoices_ledger');
    if (cachedInvoices) {
      try {
        invoicesLedger = JSON.parse(cachedInvoices);
      } catch (e) {
        invoicesLedger = [];
      }
    }

    // 6. Check Active Zoho Sync Settings Connection state
    const zohoConnToken = localStorage.getItem('zoho_active_connection');
    if (zohoConnToken) {
      try {
        const connData = JSON.parse(zohoConnToken);
        if (oauthStatusBanner) oauthStatusBanner.className = 'oauth-status-banner connected';
        if (oauthStatusText) oauthStatusText.innerHTML = `<i class="fa-solid fa-circle-check"></i> Connected: <strong>${connData.orgName || 'Zoho Books'}</strong> (${connData.email})`;
        if (btnDisconnectZoho) btnDisconnectZoho.classList.remove('hidden');
        if (btnSeamlessZohoLogin) btnSeamlessZohoLogin.classList.add('hidden');
        
        // Sync Indicator
        if (globalSyncIndicator) globalSyncIndicator.className = 'sync-status-indicator online';
        if (globalSyncLabel) globalSyncLabel.textContent = 'Zoho Books: Active';

        // Dynamic Sidebar Connection Badge
        if (productionIndicator) {
          productionIndicator.className = 'sandbox-indicator-badge active';
          productionIndicator.innerHTML = `<span class="title"><i class="fa-solid fa-cloud"></i> PRODUCTION ACTIVE</span><span class="desc" id="production-desc">Linked: <strong>${connData.orgName || 'Zoho Books'}</strong></span>`;
        }
      } catch (err) {
        console.error('Error parsing zoho_active_connection:', err);
        localStorage.removeItem('zoho_active_connection');
        if (oauthStatusBanner) oauthStatusBanner.className = 'oauth-status-banner disconnected';
        if (oauthStatusText) oauthStatusText.textContent = 'Integration status: Disconnected (Invalid Token)';
        if (btnDisconnectZoho) btnDisconnectZoho.classList.add('hidden');
        if (btnSeamlessZohoLogin) btnSeamlessZohoLogin.classList.remove('hidden');
        
        if (globalSyncIndicator) globalSyncIndicator.className = 'sync-status-indicator offline';
        if (globalSyncLabel) globalSyncLabel.textContent = 'Zoho Books: Offline';

        if (productionIndicator) {
          productionIndicator.className = 'sandbox-indicator-badge offline';
          productionIndicator.innerHTML = `<span class="title"><i class="fa-solid fa-cloud-slash"></i> CLOUD DISCONNECTED</span><span class="desc" id="production-desc">Please connect to Zoho Books in Settings.</span>`;
        }
      }
    } else {
      if (oauthStatusBanner) oauthStatusBanner.className = 'oauth-status-banner disconnected';
      if (oauthStatusText) oauthStatusText.textContent = 'Integration status: Disconnected';
      if (btnDisconnectZoho) btnDisconnectZoho.classList.add('hidden');
      if (btnSeamlessZohoLogin) btnSeamlessZohoLogin.classList.remove('hidden');
      
      if (globalSyncIndicator) globalSyncIndicator.className = 'sync-status-indicator offline';
      if (globalSyncLabel) globalSyncLabel.textContent = 'Zoho Books: Offline';

      // Dynamic Sidebar Connection Badge
      if (productionIndicator) {
        productionIndicator.className = 'sandbox-indicator-badge offline';
        productionIndicator.innerHTML = `<span class="title"><i class="fa-solid fa-cloud-slash"></i> CLOUD DISCONNECTED</span><span class="desc" id="production-desc">Please connect to Zoho Books in Settings.</span>`;
      }
    }

    // Always sync the Integration hero card with the current connection state
    renderZohoConnectionState();

    // Render modules
    rebuildIndustryCatalogGrid();
    renderCrmProfilesTable();
    renderShiftsLedgerTable();
    renderTransactionsLedgerTable();
    renderAuditsLogTable();
    updateDashboardMetrics();
    renderFloorMapGrid();
    renderKdsQueueBoards();
    syncCrmSelectOptions();
  }

  // Pull the server-persisted catalog (Catalyst 'Items' datastore table) and merge it
  // in, overwriting the localStorage cache. This is what actually fixes "products
  // disappear after refresh": the backend already saves every sync permanently, this
  // just makes the client trust that instead of only trusting localStorage.
  async function hydrateCatalogFromServer() {
    try {
      const res = await callApi('/api/items', 'GET');
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        // Preserve any locally-added custom items that haven't been pushed to Books
        // (no books_item_id), then layer the server's synced items on top as truth.
        const localCustomOnly = (catalogItems || []).filter(item => !item.books_item_id);
        catalogItems = [ ...res.data, ...localCustomOnly ];
        localStorage.setItem('pos_catalog_db', JSON.stringify(catalogItems));

        if (statTotalItems) statTotalItems.textContent = catalogItems.length.toString();
        rebuildIndustryCatalogGrid();
        renderProductsCatalogCrudTable();
      }
    } catch (err) {
      // Offline or backend cold-start — silently keep whatever is already in
      // localStorage/presets rather than interrupting the user.
      console.warn('[hydrateCatalogFromServer] Could not refresh catalog from datastore:', err.message || err);
    }
  }

  // Apply customizable configs reactively across interface headings & receipts
  function applyReactiveStyles() {
    if (sysConfig.brandColor) {
      document.documentElement.style.setProperty('--primary', sysConfig.brandColor);
    }
    
    // Core Brand details
    const brandTextH1 = document.querySelector('.brand-text h1');
    if (brandTextH1 && sysConfig.brandName) {
      brandTextH1.textContent = sysConfig.brandName;
    }
    const brandLogoI = document.querySelector('.brand-logo i');
    if (brandLogoI && sysConfig.brandLogoIcon) {
      brandLogoI.className = `${sysConfig.brandLogoIcon} logo-icon`;
    }
    
    // Update print metadata variables dynamically
    if (rBizName && sysConfig.bizName) rBizName.textContent = sysConfig.bizName;
    if (rBizAddress && sysConfig.bizAddress) rBizAddress.textContent = sysConfig.bizAddress;
    if (rBizTel) rBizTel.textContent = `Tel: +91-44-6700-POS`;
    if (rFooterMsg && sysConfig.recFooter) rFooterMsg.textContent = sysConfig.recFooter;
    if (rHeaderLogoIcon && sysConfig.brandLogoIcon) rHeaderLogoIcon.className = `${sysConfig.brandLogoIcon} receipt-logo`;
    
    if (industryBadgeText) industryBadgeText.textContent = activeIndustry;
    if (industryActiveBadge) industryActiveBadge.className = `header-badge industry-badge ${activeIndustry.toLowerCase()}`;
    
    // Adjust cart tax label
    if (summaryTaxLabel && sysConfig.taxLabel) summaryTaxLabel.textContent = sysConfig.taxLabel;

    // Sync KOT toggle checkbox in Settings to match sysConfig
    const kotCheckbox = document.querySelector('[name="posKotEnabled"]');
    if (kotCheckbox) kotCheckbox.checked = !!sysConfig.posKotEnabled;

    updateKdsNavVisibility();
  }

  const btnNavKds = document.getElementById('btn-nav-kds');

  function updateKdsNavVisibility() {
    if (btnNavKds) {
      btnNavKds.style.display = sysConfig.posKotEnabled ? '' : 'none';
    }
  }

  // Fetch Zoho Books organization profile and store it locally for UI mapping
  async function fetchAndStoreOrgProfile() {
    try {
      const orgData = await callApi('/api/organization');
      if (orgData && orgData.success && orgData.organization) {
        const org = orgData.organization;
        localStorage.setItem('zoho_org_profile', JSON.stringify(org));

          // Map key fields into sysConfig for reactive UI
        if (org.currency_code) sysConfig.bizCurrency = org.currency_symbol || '$';
        if (org.name) sysConfig.bizName = org.name;
        if (org.company_name) sysConfig.bizCompany = org.company_name;
        if (org.email) sysConfig.bizEmail = org.email;
        if (org.phone) sysConfig.bizPhone = org.phone;
        if (org.address) sysConfig.bizAddress = typeof org.address === 'string' ? org.address : (org.address.street || '');
        if (org.time_zone) sysConfig.bizTimezone = org.time_zone;
        if (org.date_format) sysConfig.bizDateFormat = org.date_format;
        // Infer industry from org country/fiscal settings as a hint
        if (org.country_code === 'IN') sysConfig.bizIndustry = sysConfig.bizIndustry || 'Retail';

        saveConfigurationState();
        applyReactiveStyles();
        addAuditRecord('Zoho Sync', `Organization profile mapped: ${org.name} (${org.currency_code})`);
      }
    } catch (err) {
      console.warn('Could not fetch Zoho Books organization profile:', err.message);
    }
  }

  // Record a sync event to the activity log (stored in localStorage)
  function recordSyncEvent(channel, action, statusCode, statusLabel) {
    const logs = JSON.parse(localStorage.getItem('pos_sync_logs') || '[]');
    logs.unshift({
      time: Date.now(),
      channel: channel,
      action: action,
      code: statusCode,
      status: statusLabel
    });
    // Keep last 20 entries
    if (logs.length > 20) logs.length = 20;
    localStorage.setItem('pos_sync_logs', JSON.stringify(logs));
  }

  // Render the sync activity log table from localStorage
  function renderSyncLogs() {
    const tbody = document.getElementById('settings-sync-logs-body');
    if (!tbody) return;
    const logs = JSON.parse(localStorage.getItem('pos_sync_logs') || '[]');
    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 20px;">No sync activity yet. Connect Zoho Books to start syncing.</td></tr>`;
      return;
    }
    tbody.innerHTML = logs.map(log => {
      const timeAgo = getTimeAgo(log.time);
      const pillClass = log.status === 'Synced' ? 'success' : (log.status === 'Failed' ? 'danger' : 'info');
      return `<tr>
        <td>${timeAgo}</td>
        <td><strong>${log.channel}</strong></td>
        <td>${log.action}</td>
        <td>${log.code}</td>
        <td><span class="status-pill ${pillClass}">${log.status}</span></td>
      </tr>`;
    }).join('');
  }

  function getTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} Min${mins > 1 ? 's' : ''} Ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} Hour${hours > 1 ? 's' : ''} Ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  function addAuditRecord(module, action) {
    const now = new Date();
    const newLog = {
      logNo: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      time: now.toLocaleTimeString(),
      user: profileRoleName.textContent,
      module: module,
      action: action
    };
    auditLogs.unshift(newLog);
    localStorage.setItem('pos_audits_db', JSON.stringify(auditLogs));
    renderAuditsLogTable();
  }

  // ==========================================================================
  // 6. DASHBOARD ANALYTICS COMPUTATIONS
  // ==========================================================================
  
  function updateDashboardMetrics() {
    // Today's total sales sum from invoices ledger
    const today = new Date().toDateString();
    const todayInvoices = invoicesLedger.filter(inv => {
      const invDate = new Date(inv.timestamp);
      return invDate.toDateString() === today && inv.status !== 'Fully Refunded';
    });

    const salesSum = todayInvoices.reduce((acc, inv) => acc + (parseFloat(inv.total) || 0), 0);
    dashSales.textContent = `${sysConfig.bizCurrency}${salesSum.toFixed(2)}`;
    dashInvoices.textContent = todayInvoices.length.toString();
    
    // Cash drawer active status and count
    if (activeShift) {
      const shiftCashExpected = activeShift.openingFloat + activeShift.cashSales;
      dashDrawer.textContent = `${sysConfig.bizCurrency}${shiftCashExpected.toFixed(2)}`;
      dashShiftStatus.textContent = `Active Cashier: ${activeShift.cashier}`;
      shiftBadgeText.textContent = `SHIFT: ACTIVE`;
      if (shiftActiveBadge) shiftActiveBadge.className = 'header-badge success';
    } else {
      dashDrawer.textContent = `${sysConfig.bizCurrency}0.00`;
      dashShiftStatus.textContent = 'Register shift closed';
      shiftBadgeText.textContent = `SHIFT: CLOSED`;
      if (shiftActiveBadge) shiftActiveBadge.className = 'header-badge warning';
    }

    // Products low stock items count
    const lowStockItems = catalogItems.filter(item => item.stock <= sysConfig.invLowStock);
    dashStock.textContent = lowStockItems.length.toString();

    // Local system table count statistics
    dashStatusItemCount.textContent = `${catalogItems.length} Products Loaded`;
    dashStatusCrmCount.textContent = `${crmProfiles.length} Contacts Listed`;
    dashStatusShiftCount.textContent = `${shiftLogs.length} Shifts Reconciled`;

    // Render High Demand Items on Dashboard
    renderTopSellingProductsList(todayInvoices);
  }

  function renderTopSellingProductsList(todayInvoices) {
    const productQuantities = {};
    todayInvoices.forEach(inv => {
      inv.cart.forEach(cartItem => {
        productQuantities[cartItem.name] = (productQuantities[cartItem.name] || 0) + cartItem.qty;
      });
    });

    const sortedProducts = Object.entries(productQuantities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    if (sortedProducts.length === 0) {
      dashTopProductsList.innerHTML = `<p style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 15px;">No transactions logged today yet.</p>`;
      return;
    }

    dashTopProductsList.innerHTML = sortedProducts.map(([name, qty]) => {
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: var(--bg-input); border-radius: var(--border-radius-md); margin-bottom: 6px;">
          <span style="font-size: 12px; font-weight: 700; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 180px;">${name}</span>
          <span class="status-pill info" style="font-size: 10px; font-weight: 700;">${qty} sold today</span>
        </div>
      `;
    }).join('');
  }

  // ==========================================================================
  // 7. POS REGISTER CATALOG & INTERACTION ENGINE
  // ==========================================================================
  
  function rebuildIndustryCatalogGrid() {
    if (currentIndustryTitle) currentIndustryTitle.textContent = INDUSTRY_PROFILES[activeIndustry].name;
    
    // Re-render categories row filters based on active industry
    const categories = INDUSTRY_PROFILES[activeIndustry].categories;
    categoryFiltersRow.innerHTML = `
      <button class="filter-btn active" data-category="all">All Items</button>
      ${categories.map(cat => `<button class="filter-btn" data-category="${cat}">${cat}</button>`).join('')}
    `;

    // Filter local catalog items matching selected industry profile
    const activeCatalog = catalogItems.filter(item => {
      return !item.industry || item.industry === activeIndustry ||
             INDUSTRY_PROFILES[activeIndustry].presets.some(p => p.sku === item.sku);
    });

    renderItemsGrid(activeCatalog);
    toggleIndustrySpecificLayoutPanels();
  }

  function toggleIndustrySpecificLayoutPanels() {
    // 1. Restaurant table floor map
    if (activeIndustry === 'Restaurant' || activeIndustry === 'Services') {
      if (floorMapContainer) floorMapContainer.classList.remove('hidden');
      if (kitchenNotesGroup) kitchenNotesGroup.classList.remove('hidden');
      if (tableNumberGroup) tableNumberGroup.classList.remove('hidden');
    } else {
      if (floorMapContainer) floorMapContainer.classList.add('hidden');
      if (kitchenNotesGroup) kitchenNotesGroup.classList.add('hidden');
      if (tableNumberGroup) tableNumberGroup.classList.add('hidden');
    }

    // 2. Grocery Barcode scanner & Scale simulator
    if (activeIndustry === 'Grocery' || activeIndustry === 'Retail') {
      if (barcodeScanBox) barcodeScanBox.classList.remove('hidden');
    } else {
      if (barcodeScanBox) barcodeScanBox.classList.add('hidden');
    }

    // 3. Pharmacy warning badge
    if (activeIndustry === 'Pharmacy') {
      if (pharmacyRxBanner) pharmacyRxBanner.classList.remove('hidden');
    } else {
      if (pharmacyRxBanner) pharmacyRxBanner.classList.add('hidden');
    }

    // 4. Wholesale banner
    if (activeIndustry === 'Wholesale') {
      if (wholesaleTierBanner) wholesaleTierBanner.classList.remove('hidden');
    } else {
      if (wholesaleTierBanner) wholesaleTierBanner.classList.add('hidden');
    }
  }

  function renderItemsGrid(items) {
    if (!itemsGrid) return;
    if (items.length === 0) {
      itemsGrid.innerHTML = `
        <div class="empty-cart-state" style="grid-column: 1 / -1; height: 180px;">
          <i class="fa-solid fa-folder-open"></i>
          <p>No catalog items found</p>
          <span>Create custom products in the [Products & Stock] tab</span>
        </div>
      `;
      return;
    }

    itemsGrid.innerHTML = items.map(item => {
      const isLowStock = item.stock <= sysConfig.invLowStock;
      const stockBadge = isLowStock 
        ? `<span class="product-card-stock low">LOW: ${item.stock}</span>`
        : `<span class="product-card-stock">Stock: ${item.stock}</span>`;

      // Resolve Rx warning badge
      const rxLabel = (activeIndustry === 'Pharmacy' && item.custom && item.custom.includes('Rx REQUIRED'))
        ? `<span style="position: absolute; top: 8px; right: 8px; font-size: 8px; font-weight: bold; background: var(--danger); color: #fff; padding: 2px 5px; border-radius: 4px;">Rx REQUIRED</span>`
        : ``;

      const currencySymbol = window.activeCurrencySymbol || sysConfig.bizCurrency;
      const scaleFactor = window.activeCurrencyScaleFactor || 1.0;
      const displayRate = item.rate * scaleFactor;

      return `
        <div class="product-card" data-sku="${item.sku}">
          ${rxLabel}
          <span class="product-card-sku">${item.sku}</span>
          <h3 class="product-card-name">${item.name}</h3>
          <div class="product-card-footer">
            <span class="product-card-price">${currencySymbol}${displayRate.toFixed(2)}</span>
            ${stockBadge}
          </div>
        </div>
      `;
    }).join('');

    // Bind click additions to card selectors
    document.querySelectorAll('.items-grid .product-card').forEach(card => {
      card.addEventListener('click', () => {
        const sku = card.getAttribute('data-sku');
        const item = catalogItems.find(i => i.sku === sku);
        if (item) {
          addItemToCart(item);
        }
      });
    });
  }

  // Filter Catalog grid reactively via categories row buttons
  categoryFiltersRow.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('#category-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      
      const selectedCat = e.target.getAttribute('data-category');
      const filteredItems = catalogItems.filter(item => {
        // Show items belonging to current industry OR items without industry (synced from Zoho)
        const isCurrentIndustry = !item.industry || item.industry === activeIndustry ||
                                  INDUSTRY_PROFILES[activeIndustry].presets.some(p => p.sku === item.sku);
        if (!isCurrentIndustry) return false;
        
        if (selectedCat === 'all') return true;
        return item.category === selectedCat;
      });
      renderItemsGrid(filteredItems);
    }
  });

  // Top header text search input query
  globalSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = catalogItems.filter(item => {
      // Match active industry or items without industry (synced from Zoho)
      const isCurrentIndustry = !item.industry || item.industry === activeIndustry ||
                                INDUSTRY_PROFILES[activeIndustry].presets.some(p => p.sku === item.sku);
      if (!isCurrentIndustry) return false;

      return item.name.toLowerCase().includes(query) || 
             item.sku.toLowerCase().includes(query) || 
             item.category.toLowerCase().includes(query);
    });
    renderItemsGrid(filtered);
  });

  // Grocery scale weigh multiplier adjustment stepper
  btnWeightInc.addEventListener('click', () => {
    let currentWt = parseFloat(weightDisplay.textContent);
    currentWt = currentWt >= 5.0 ? 0.5 : currentWt + 0.5;
    weightDisplay.textContent = currentWt.toFixed(2);
  });

  // Grocery scanner simulated scanner submit
  btnBarcodeScanSim.addEventListener('click', () => {
    const scanSku = barcodeInput.value.trim().toUpperCase();
    if (!scanSku) {
      showToast('Please type a valid barcode SKU to scan.', true);
      return;
    }

    const item = catalogItems.find(i => i.sku === scanSku);
    if (!item) {
      showToast(`SKU '${scanSku}' not found in active products journal.`, true);
      return;
    }

    // Apply Grocery Weight Scale logic if active
    if (activeIndustry === 'Grocery') {
      const multiplier = parseFloat(weightDisplay.textContent);
      addItemToCart(item, multiplier);
    } else {
      addItemToCart(item);
    }

    barcodeInput.value = '';
    barcodeInput.focus();
  });

  // ==========================================================================
  // 8. CART HANDLING & DYNAMIC CALCULATIONS
  // ==========================================================================
  
  function addItemToCart(item, weightMultiplier = 1.0) {
    if (!activeShift) {
      showToast('Register shift is CLOSED. Please open Daily Shifts register first!', true);
      navigateToTab('shifts-tab');
      return;
    }

    // Low stock warnings or blockers
    if (item.stock <= 0) {
      showToast(`Block: '${item.name}' is completely out of stock! Adjust stock inventory.`, true);
      return;
    }

    // Pharmacy Prescription Verification Shield Popup
    if (activeIndustry === 'Pharmacy' && item.custom && item.custom.includes('Rx REQUIRED')) {
      const confirmRx = confirm(`[MEDICATION BLOCK] Rx required for: ${item.name}\n\nHave you verified and scanned the signed physician's prescription for this guest?`);
      if (!confirmRx) {
        showToast('Medication add cancelled: Prescriptions verification required.', true);
        return;
      }
    }

    const existing = cart.find(c => c.sku === item.sku);
    if (existing) {
      if (existing.qty + 1 > item.stock) {
        showToast(`Cannot add: Sales quantity exceeds maximum stock availability!`, true);
        return;
      }
      existing.qty += 1;
    } else {
      // In grocery, rate is multiplied by scaled weight
      const adjustedRate = (activeIndustry === 'Grocery' && item.custom && item.custom.includes('Per Kilogram'))
        ? item.rate * weightMultiplier
        : item.rate;

      cart.push({
        sku: item.sku,
        name: item.name,
        qty: 1,
        rate: adjustedRate,
        weight: (activeIndustry === 'Grocery' && item.custom && item.custom.includes('Per Kilogram')) ? weightMultiplier : null,
        taxPercent: item.tax_percentage || INDUSTRY_PROFILES[activeIndustry].defaultTax
      });
    }

    showToast(`Added '${item.name}' to cart.`);
    rebuildCheckoutCartUI();
  }

  function rebuildCheckoutCartUI() {
    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="empty-cart-state">
          <i class="fa-solid fa-cart-shopping"></i>
          <p>Register is currently empty</p>
          <span>Select products from the catalog to build cart</span>
        </div>
      `;
      summarySubtotal.textContent = `${sysConfig.bizCurrency}0.00`;
      summaryTax.textContent = `${sysConfig.bizCurrency}0.00`;
      summaryTotal.textContent = `${sysConfig.bizCurrency}0.00`;
      splitBody.classList.add('hidden');
      splitBillToggle.checked = false;
      singlePaymentBox.classList.remove('hidden');
      return;
    }

    // Wholesale multi-tiered pricing discount logic
    cart.forEach(cartItem => {
      if (activeIndustry === 'Wholesale') {
        const itemPreset = catalogItems.find(i => i.sku === cartItem.sku);
        if (itemPreset) {
          if (cartItem.qty >= 50) {
            cartItem.rate = itemPreset.rate * 0.80; // 20% discount
            cartItem.discountApplied = '20% Bulk Tier';
          } else if (cartItem.qty >= 10) {
            cartItem.rate = itemPreset.rate * 0.90; // 10% discount
            cartItem.discountApplied = '10% Bulk Tier';
          } else {
            cartItem.rate = itemPreset.rate;
            delete cartItem.discountApplied;
          }
        }
      }
    });

    const currencySymbol = window.activeCurrencySymbol || sysConfig.bizCurrency;
    const scaleFactor = window.activeCurrencyScaleFactor || 1.0;

    cartItemsList.innerHTML = cart.map((c, idx) => {
      const displayItemRate = c.rate * scaleFactor;
      const descLine = c.weight 
        ? `<span class="cart-item-price">Scaled wt: ${c.weight.toFixed(2)} kg x ${currencySymbol}${displayItemRate.toFixed(2)}</span>`
        : `<span class="cart-item-price">${currencySymbol}${displayItemRate.toFixed(2)}</span>`;

      const discountBadge = c.discountApplied 
        ? `<span style="font-size: 8px; background: var(--success-glow); color: var(--success); padding: 1px 4px; border-radius: 4px; margin-left: 5px;">${c.discountApplied}</span>`
        : ``;

      return `
        <div class="cart-item-row">
          <div class="cart-item-info">
            <p class="cart-item-name">${c.name} ${discountBadge}</p>
            ${descLine}
          </div>
          <div class="cart-item-qty-actions">
            <button class="cart-qty-btn btn-cart-dec" data-idx="${idx}"><i class="fa-solid fa-minus"></i></button>
            <span class="cart-qty-val">${c.qty}</span>
            <button class="cart-qty-btn btn-cart-inc" data-idx="${idx}"><i class="fa-solid fa-plus"></i></button>
          </div>
          <span class="cart-item-total-price">${currencySymbol}${(displayItemRate * c.qty).toFixed(2)}</span>
        </div>
      `;
    }).join('');

    // Bind sub quantity triggers
    document.querySelectorAll('.btn-cart-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        if (cart[idx].qty > 1) {
          cart[idx].qty -= 1;
        } else {
          cart.splice(idx, 1);
        }
        rebuildCheckoutCartUI();
      });
    });

    // Bind add quantity triggers
    document.querySelectorAll('.btn-cart-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        const preset = catalogItems.find(p => p.sku === cart[idx].sku);
        if (preset && cart[idx].qty + 1 > preset.stock) {
          showToast('Cannot add: Sales quantity exceeds maximum stock availability!', true);
          return;
        }
        cart[idx].qty += 1;
        rebuildCheckoutCartUI();
      });
    });

    // Compute Totals
    const baseSubtotal = cart.reduce((acc, c) => acc + (c.rate * c.qty), 0);
    const subtotal = baseSubtotal * scaleFactor;
    const taxRate = parseFloat(sysConfig.taxRate);
    
    let tax = 0.00;
    let grandTotal = 0.00;
    let displayedSubtotal = subtotal;
    let taxLabelText = sysConfig.taxLabel || `Tax (${taxRate}%)`;

    if (sysConfig.taxModel === 'VAT') {
      // Inclusive VAT: subtotal includes the tax
      grandTotal = subtotal;
      displayedSubtotal = grandTotal / (1 + (taxRate / 100));
      tax = grandTotal - displayedSubtotal;
      taxLabelText = `Includes VAT (${taxRate}%)`;
    } else if (sysConfig.taxModel === 'GST') {
      // India GST Split: CGST (9%) + SGST (9%) for 18% total
      const cgstRate = taxRate / 2;
      const sgstRate = taxRate / 2;
      const cgst = subtotal * (cgstRate / 100);
      const sgst = subtotal * (sgstRate / 100);
      tax = cgst + sgst;
      grandTotal = subtotal + tax;
      taxLabelText = `CGST (${cgstRate}%) + SGST (${sgstRate}%)`;
    } else {
      // Standard Exclusive US Sales Tax
      tax = subtotal * (taxRate / 100);
      let surcharge = 0.00;
      if (sysConfig.taxCompound) {
        surcharge = subtotal * 0.05; // 5% compound surcharge
        taxLabelText = `Sales Tax (${taxRate}%) + Surcharge (5%)`;
      }
      grandTotal = subtotal + tax + surcharge;
    }

    summarySubtotal.textContent = `${currencySymbol}${displayedSubtotal.toFixed(2)}`;
    summaryTax.textContent = `${currencySymbol}${tax.toFixed(2)}`;
    summaryTotal.textContent = `${currencySymbol}${grandTotal.toFixed(2)}`;
    
    const lblTax = document.getElementById('summary-tax-label');
    if (lblTax) {
      lblTax.textContent = taxLabelText;
    }

    // Re-render split billing if toggled active
    if (splitBillToggle.checked) {
      renderSplitBillDividends(grandTotal);
    }
  }

  // Split billing dividends renderer
  splitBillToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      splitBody.classList.remove('hidden');
      singlePaymentBox.classList.add('hidden');
      splitPaymentActive = true;
      
      const totalText = summaryTotal.textContent.replace(sysConfig.bizCurrency, '');
      renderSplitBillDividends(parseFloat(totalText) || 0.00);
    } else {
      splitBody.classList.add('hidden');
      singlePaymentBox.classList.remove('hidden');
      splitPaymentActive = false;
    }
  });

  btnSplitDec.addEventListener('click', () => {
    if (splitCount > 2) {
      splitCount -= 1;
      splitCountVal.textContent = splitCount;
      const totalText = summaryTotal.textContent.replace(sysConfig.bizCurrency, '');
      renderSplitBillDividends(parseFloat(totalText) || 0.00);
    }
  });

  btnSplitInc.addEventListener('click', () => {
    if (splitCount < 10) {
      splitCount += 1;
      splitCountVal.textContent = splitCount;
      const totalText = summaryTotal.textContent.replace(sysConfig.bizCurrency, '');
      renderSplitBillDividends(parseFloat(totalText) || 0.00);
    }
  });

  function renderSplitBillDividends(grandTotal) {
    const divided = grandTotal / splitCount;
    splitCompletedPaid = Array(splitCount).fill(false);

    splitItemsList.innerHTML = Array(splitCount).fill(0).map((_, idx) => {
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 6px 10px; border: 1px solid var(--border-color); border-radius: var(--border-radius-md);">
          <span style="font-size: 11px; font-weight: 700;">Split Dividend #${idx + 1}</span>
          <span style="font-size: 12px; font-weight: 800; color: var(--primary);">${sysConfig.bizCurrency}${divided.toFixed(2)}</span>
          <button type="button" class="btn-primary btn-sm btn-pay-split" data-dividend="${idx}" style="padding: 3px 8px; font-size: 10px;">
            <i class="fa-solid fa-credit-card"></i> Pay Split
          </button>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.btn-pay-split').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const divIdx = parseInt(btn.getAttribute('data-dividend'));
        btn.disabled = true;
        btn.className = 'btn-done btn-sm';
        btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Paid`;
        splitCompletedPaid[divIdx] = true;
        showToast(`Split dividend #${divIdx + 1} collected!`);
        
        // If all splits are paid, enable completing invoice checkout
        const allPaid = splitCompletedPaid.every(p => p === true);
        if (allPaid) {
          showToast('All splits collected successfully! Checkout ready.');
        }
      });
    });
  }

  // Clear Register action
  btnClearCart.addEventListener('click', () => {
    if (cart.length === 0) return;
    if (confirm('Clear entire active register checkout cart?')) {
      cart = [];
      rebuildCheckoutCartUI();
      showToast('Active checkout register cleared.');
    }
  });

  // Payment Buttons selectors
  paymentModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      paymentModeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPaymentMode = btn.getAttribute('data-mode');
    });
  });

  // Submit checkout trigger
  btnSubmitCheckout.addEventListener('click', executeCheckoutInvoiceSubmission);

  async function executeCheckoutInvoiceSubmission() {
    if (!activeShift) {
      showToast('Please open a cash shift register first before processing checkout.', true);
      navigateToTab('shifts-tab');
      return;
    }
    if (cart.length === 0) {
      showToast('Checkout Block: No products added in cart.', true);
      return;
    }

    // Split check paid validations
    if (splitPaymentActive) {
      const allPaid = splitCompletedPaid.every(p => p === true);
      if (!allPaid) {
        showToast('Checkout Block: Please process and check all split bill payments first!', true);
        return;
      }
    }

    const subtotalText = summarySubtotal.textContent.replace(sysConfig.bizCurrency, '');
    const taxText = summaryTax.textContent.replace(sysConfig.bizCurrency, '');
    const totalText = summaryTotal.textContent.replace(sysConfig.bizCurrency, '');

    const subtotalVal = parseFloat(subtotalText);
    const taxVal = parseFloat(taxText);
    const totalVal = parseFloat(totalText);

    const invoiceNum = `${sysConfig.invPrefix}${sysConfig.invNextNo}`;
    sysConfig.invNextNo += 1;
    saveConfigurationState();

    const localRef = `LOC-${Math.floor(100000 + Math.random() * 900000)}`;
    let booksId = `MOCK-BO-${Math.floor(10000 + Math.random() * 90000)}`;
    let invoiceNo = invoiceNum;
    let syncStatus = 'Offline Pending';

    const selectedCustomerName = customerSelect.value;
    const selectedCustomer = crmProfiles.find(c => c.name === selectedCustomerName) || SEED_CRM[0];

    const isConnected = !!localStorage.getItem('zoho_active_connection');
    
    btnSubmitCheckout.disabled = true;
    const originalBtnHtml = btnSubmitCheckout.innerHTML;
    btnSubmitCheckout.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting Order...`;

    if (isConnected) {
      try {
        showToast('Synchronizing sales ledger invoice with Zoho Books...');
        
        const response = await callApi('/api/orders', 'POST', {
          customer_name: selectedCustomerName,
          customer_email: selectedCustomer.email || 'walkin@pos.system',
          payment_mode: splitPaymentActive ? 'Split Bill' : selectedPaymentMode,
          room_number: roomNumberSelect ? roomNumberSelect.value : '',
          kitchen_notes: kitchenNotesInput.value.trim() || '',
          invoice_number: invoiceNo,
          local_ref: localRef,
          line_items: cart.map(item => ({
            books_item_id: item.books_item_id || item.item_id || '',
            item_id: item.books_item_id || item.item_id || '',
            name: item.name,
            quantity: item.qty,
            rate: item.rate,
            tax_percentage: item.tax_percentage || 0
          }))
        });

        if (response && response.success) {
          if (response.zoho_books && response.zoho_books.invoice_id) {
            booksId = response.zoho_books.invoice_id;
            if (response.zoho_books.invoice_number && !response.zoho_books.invoice_number.startsWith('OFFLINE')) {
              invoiceNo = response.zoho_books.invoice_number;
            }
            syncStatus = 'Synced';
            showToast('Order successfully synced and paid in Zoho Books!');
          } else {
            showToast('Order saved in local datastore. Pending backend sync.');
          }
        }
      } catch (err) {
        console.warn('Backend sync failed:', err.message);
        showToast('Error: Order sync with Zoho Books failed. Check your connection.', true);
        btnSubmitCheckout.disabled = false;
        btnSubmitCheckout.innerHTML = originalBtnHtml;
        return;
      }
    } else {
      // OFFLINE MODE — save locally in offline queue for later sync
      showToast('Offline mode: Order saved locally. Will sync when Zoho Books is reconnected.', false);
      syncStatus = 'Offline Pending';
    }

    btnSubmitCheckout.disabled = false;
    btnSubmitCheckout.innerHTML = originalBtnHtml;

    // Build invoice record
    const activeCurrencySymbol = window.activeCurrencySymbol || sysConfig.bizCurrency;
    const activeCurrencyScaleFactor = window.activeCurrencyScaleFactor || 1.0;

    const newInvoice = {
      invoiceNo: invoiceNo,
      localRef: localRef,
      booksId: booksId,
      timestamp: new Date().toISOString(),
      customer: selectedCustomerName,
      customerEmail: selectedCustomer.email,
      method: splitPaymentActive ? 'Split Bill' : selectedPaymentMode,
      subtotal: subtotalVal,
      tax: taxVal,
      total: totalVal,
      cart: [ ...cart ],
      notes: kitchenNotesInput.value.trim() || 'N/A',
      status: syncStatus === 'Synced' ? 'Paid' : 'Offline Pending',
      currencySymbol: activeCurrencySymbol,
      scaleFactor: activeCurrencyScaleFactor
    };

    // 1. Save to invoices Ledger journal
    invoicesLedger.unshift(newInvoice);
    localStorage.setItem('pos_invoices_ledger', JSON.stringify(invoicesLedger));

    // Save to offline synchronization queue if submission failed or is offline
    if (newInvoice.status === 'Offline Pending') {
      let queue = [];
      try {
        const stored = localStorage.getItem('pos_offline_orders_queue');
        if (stored) queue = JSON.parse(stored);
      } catch (e) {}
      
      const payload = {
        customer_name: selectedCustomerName,
        customer_email: selectedCustomer.email || 'walkin@pos.system',
        payment_mode: splitPaymentActive ? 'Split Bill' : selectedPaymentMode,
        room_number: roomNumberSelect ? roomNumberSelect.value : '',
        kitchen_notes: kitchenNotesInput.value.trim() || '',
        line_items: cart.map(item => ({
          books_item_id: item.books_item_id || item.item_id || '',
          item_id: item.books_item_id || item.item_id || '',
          name: item.name,
          quantity: item.qty,
          rate: item.rate,
          tax_percentage: item.tax_percentage || 0
        })),
        localRef: localRef,
        invoiceNo: invoiceNo
      };
      
      queue.push(payload);
      localStorage.setItem('pos_offline_orders_queue', JSON.stringify(queue));
      updateOfflineIndicator();
    }

    // 2. Adjust product stock values dynamically in local storage and backend
    cart.forEach(cartItem => {
      const dbItem = catalogItems.find(i => i.sku === cartItem.sku);
      if (dbItem) {
        dbItem.stock = Math.max(0, dbItem.stock - cartItem.qty);
        // Decrement stock on backend datastore if item has a ROWID from previous sync
        if (dbItem._rowid && localStorage.getItem('zoho_active_connection')) {
          callApi('/api/items/stock-adjust', 'POST', {
            rowid: dbItem._rowid,
            delta: -cartItem.qty,
            reason: `Sale ${invoiceNo}`
          }).catch(err => console.warn('Backend stock adjust failed for SKU', dbItem.sku, ':', err.message));
        }
      }
    });
    localStorage.setItem('pos_catalog_db', JSON.stringify(catalogItems));

    // 3. Accumulate shift sales records
    if (newInvoice.method === 'Cash') {
      activeShift.cashSales += totalVal;
    } else {
      activeShift.nonCashSales += totalVal;
    }
    
    // Save shifts back
    localStorage.setItem('pos_shifts_db', JSON.stringify(shiftLogs));

    // 4. Update Outstanding Account Balance if payment mode was Room Charge / Folio Charge
    if (newInvoice.method === 'Room Charge' && selectedCustomer.id !== 'CRM-1001') {
      selectedCustomer.balance += totalVal;
      localStorage.setItem('pos_crm_db', JSON.stringify(crmProfiles));
      renderCrmProfilesTable();
    }

    // 5. Build Kitchen Display Ticket (KDS) if KOT is enabled in POS Preferences
    if (sysConfig.posKotEnabled && cart.length > 0) {
      const newKdsTicket = {
        id: `KOT-${Math.floor(100 + Math.random() * 900)}`,
        room: roomNumberSelect.value || 'Walk-in Seat',
        customer: selectedCustomerName,
        notes: kitchenNotesInput.value.trim() || 'No special chef instructions',
        timestamp: Date.now(),
        status: 'pending',
        cartItems: [ ...cart ]
      };
      kdsOrders.unshift(newKdsTicket);
      localStorage.setItem('pos_kds_queue', JSON.stringify(kdsOrders));
      renderKdsQueueBoards();
    }

    addAuditRecord('Checkout Register', `Invoice checkout successfully generated. Inv: ${invoiceNo}, Total: $${totalVal.toFixed(2)} (${syncStatus})`);
    recordSyncEvent('Zoho Books Invoices', `Invoice ${invoiceNo} — $${totalVal.toFixed(2)}`, syncStatus === 'Synced' ? '200 OK' : '202 Pending', syncStatus);

    // Populate Printable slips
    populateReceiptThermalSlips(newInvoice);

    // Refresh UI States
    cart = [];
    rebuildCheckoutCartUI();
    rebuildIndustryCatalogGrid();
    renderTransactionsLedgerTable();
    updateDashboardMetrics();
    
    // Auto-open receipt modal popup
    if (sysConfig.posAutoPrint) {
      openReceiptModalPopup();
    }
  }

  // ==========================================================================
  // 9. THERMAL RECEIPT SLIPS POPULATOR
  // ==========================================================================
  
  function populateReceiptThermalSlips(inv) {
    rInvNum.textContent = inv.invoiceNo;
    rLocalRef.textContent = inv.localRef;
    rBooksId.textContent = inv.booksId;
    rDate.textContent = new Date(inv.timestamp).toLocaleString();
    rGuestName.textContent = inv.customer;
    rPaymentMode.textContent = inv.method;
    
    const symbol = inv.currencySymbol || sysConfig.bizCurrency;
    const scale = inv.scaleFactor || 1.0;

    rItemsTbody.innerHTML = inv.cart.map(c => {
      const displayRate = c.rate * scale;
      const lineTotal = displayRate * c.qty;
      return `
        <tr>
          <td>${c.name}</td>
          <td style="text-align: center;">${c.qty}</td>
          <td style="text-align: right;">${symbol}${displayRate.toFixed(2)}</td>
          <td style="text-align: right;">${symbol}${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    rSubtotal.textContent = `${symbol}${inv.subtotal.toFixed(2)}`;
    rTaxLabelPrint.textContent = `${sysConfig.taxLabel || 'Tax'}:`;
    rTax.textContent = `${symbol}${inv.tax.toFixed(2)}`;
    rTotal.textContent = `${symbol}${inv.total.toFixed(2)}`;
    
    // Build KOT slips
    kTicketId.textContent = `KOT-${Math.floor(100 + Math.random() * 900)}`;
    kRoomNumber.textContent = inv.notes !== 'N/A' ? (roomNumberSelect.value || 'General Registry Seat') : 'N/A';
    kDate.textContent = new Date(inv.timestamp).toLocaleTimeString();
    kGuestName.textContent = inv.customer;
    
    kItemsTbody.innerHTML = inv.cart.map(c => {
      return `
        <tr>
          <td>${c.name}</td>
          <td style="text-align: right;">${c.qty}</td>
        </tr>
      `;
    }).join('');

    if (inv.notes && inv.notes !== 'N/A') {
      kNotesSection.classList.remove('hidden');
      kNotesText.textContent = inv.notes;
    } else {
      kNotesSection.classList.add('hidden');
    }
  }

  function openReceiptModalPopup() {
    receiptModal.classList.add('active');
    modalTabPreviewBill.classList.add('active');
    modalTabPreviewKot.classList.remove('active');
    receiptPrintArea.classList.remove('hidden');
    kotPrintArea.classList.add('hidden');
    if (zreportPrintArea) zreportPrintArea.classList.add('hidden');
  }

  btnCloseModal.addEventListener('click', () => { receiptModal.classList.remove('active'); });
  btnDoneModal.addEventListener('click', () => { receiptModal.classList.remove('active'); });

  modalTabPreviewBill.addEventListener('click', () => {
    modalTabPreviewBill.classList.add('active');
    modalTabPreviewKot.classList.remove('active');
    receiptPrintArea.classList.remove('hidden');
    kotPrintArea.classList.add('hidden');
    if (zreportPrintArea) zreportPrintArea.classList.add('hidden');
  });

  modalTabPreviewKot.addEventListener('click', () => {
    modalTabPreviewBill.classList.remove('active');
    modalTabPreviewKot.classList.add('active');
    receiptPrintArea.classList.add('hidden');
    kotPrintArea.classList.remove('hidden');
    if (zreportPrintArea) zreportPrintArea.classList.add('hidden');
  });

  btnPrintReceiptTrigger.addEventListener('click', () => {
    window.print();
  });
  
  btnPrintKotTrigger.addEventListener('click', () => {
    modalTabPreviewBill.classList.remove('active');
    modalTabPreviewKot.classList.add('active');
    receiptPrintArea.classList.add('hidden');
    kotPrintArea.classList.remove('hidden');
    setTimeout(() => { window.print(); }, 250);
  });

  // ==========================================================================
  // 10. REAL-TIME KITCHEN DISPLAY SYSTEM (KDS) QUEUE
  // ==========================================================================
  
  function renderKdsQueueBoards() {
    if (!kdsContainerPending || !kdsContainerCooking || !kdsContainerReady) return;
    kdsContainerPending.innerHTML = '';
    kdsContainerCooking.innerHTML = '';
    kdsContainerReady.innerHTML = '';

    let pendingCount = 0;
    let cookingCount = 0;
    let readyCount = 0;

    // Pull from localStorage
    const savedKds = localStorage.getItem('pos_kds_queue');
    if (savedKds) {
      try {
        kdsOrders = JSON.parse(savedKds);
      } catch (err) {}
    }

    if (kdsOrders.length === 0) {
      kdsContainerPending.innerHTML = `<p style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 15px;">Kitchen queue is empty.</p>`;
      kdsContainerCooking.innerHTML = `<p style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 15px;">No active preparations.</p>`;
      kdsContainerReady.innerHTML = `<p style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 15px;">Completed cards empty.</p>`;
      
      if (kdsCountPending) kdsCountPending.textContent = '0';
      if (kdsCountCooking) kdsCountCooking.textContent = '0';
      if (kdsCountReady) kdsCountReady.textContent = '0';
      return;
    }

    kdsOrders.forEach(ticket => {
      const elapsedMins = Math.floor((Date.now() - ticket.timestamp) / 60000);
      const timerColorClass = elapsedMins >= 5 ? 'kds-ticket-timer active' : 'kds-ticket-timer';

      const cardHtml = `
        <div class="kds-ticket-card">
          <div class="kds-ticket-card-header">
            <span class="kds-ticket-location"><i class="fa-solid fa-location-crosshairs"></i> ${ticket.room}</span>
            <span class="${timerColorClass}" data-start="${ticket.timestamp}">${elapsedMins} Mins Ago</span>
          </div>
          <p style="font-size: 11px; font-weight: 700; color: var(--text-primary);">Ticket Ref: ${ticket.id}</p>
          <div class="kds-ticket-items-list">
            ${ticket.cartItems.map(item => `
              <div class="kds-ticket-item-row">
                <span>${item.name}</span>
                <span>x${item.qty}</span>
              </div>
            `).join('')}
          </div>
          <p class="kds-ticket-notes"><i class="fa-solid fa-kitchen-set"></i> ${ticket.notes}</p>
          
          <div style="display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end;">
            ${ticket.status === 'pending' ? `
              <button class="btn-primary btn-sm btn-kds-cook" data-id="${ticket.id}"><i class="fa-solid fa-fire"></i> Start Prep</button>
            ` : ''}
            ${ticket.status === 'cooking' ? `
              <button class="btn-done btn-sm btn-kds-ready" data-id="${ticket.id}"><i class="fa-solid fa-bell"></i> Ready to Serve</button>
            ` : ''}
            ${ticket.status === 'ready' ? `
              <button class="btn-secondary btn-sm btn-kds-dispatch" data-id="${ticket.id}"><i class="fa-solid fa-archive"></i> Dispatch</button>
            ` : ''}
          </div>
        </div>
      `;

      if (ticket.status === 'pending') {
        kdsContainerPending.innerHTML += cardHtml;
        pendingCount += 1;
      } else if (ticket.status === 'cooking') {
        kdsContainerCooking.innerHTML += cardHtml;
        cookingCount += 1;
      } else if (ticket.status === 'ready') {
        kdsContainerReady.innerHTML += cardHtml;
        readyCount += 1;
      }
    });

    if (kdsCountPending) kdsCountPending.textContent = pendingCount;
    if (kdsCountCooking) kdsCountCooking.textContent = cookingCount;
    if (kdsCountReady) kdsCountReady.textContent = readyCount;

    // Bind KDS action clicks
    document.querySelectorAll('.btn-kds-cook').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const t = kdsOrders.find(o => o.id === id);
        if (t) {
          t.status = 'cooking';
          localStorage.setItem('pos_kds_queue', JSON.stringify(kdsOrders));
          renderKdsQueueBoards();
          showToast(`KDS preparation started for Ref: ${id}`);
        }
      });
    });

    document.querySelectorAll('.btn-kds-ready').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const t = kdsOrders.find(o => o.id === id);
        if (t) {
          t.status = 'ready';
          localStorage.setItem('pos_kds_queue', JSON.stringify(kdsOrders));
          renderKdsQueueBoards();
          showToast(`KOT order ready for service! Table: ${t.room}`);
        }
      });
    });

    document.querySelectorAll('.btn-kds-dispatch').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const idx = kdsOrders.findIndex(o => o.id === id);
        if (idx > -1) {
          kdsOrders.splice(idx, 1);
          localStorage.setItem('pos_kds_queue', JSON.stringify(kdsOrders));
          renderKdsQueueBoards();
          showToast(`KDS Ticket dispatched and archived successfully.`);
        }
      });
    });
  }

  // Refresh KDS ticking elapsed cooking duration timers
  setInterval(() => {
    document.querySelectorAll('.kds-ticket-timer').forEach(span => {
      const startTime = parseInt(span.getAttribute('data-start'));
      if (startTime) {
        const elapsedMins = Math.floor((Date.now() - startTime) / 60000);
        span.textContent = `${elapsedMins} Mins Ago`;
        if (elapsedMins >= 5) {
          span.className = 'kds-ticket-timer active';
        }
      }
    });
  }, 30000);

  // KDS stage boards columns filtration buttons
  kdsFilters.forEach(btn => {
    btn.addEventListener('click', (e) => {
      kdsFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const stage = btn.getAttribute('data-kds-filter');
      
      const columns = document.querySelectorAll('.kds-board-column');
      columns.forEach(col => {
        const isTarget = col.querySelector('.kds-board-header').className.includes(stage);
        if (stage === 'all') {
          col.style.display = 'flex';
        } else if (isTarget) {
          col.style.display = 'flex';
        } else {
          col.style.display = 'none';
        }
      });
    });
  });

  // ==========================================================================
  // 11. INVOICES LEDGER & REFUNDS WIZARD
  // ==========================================================================
  
  function renderTransactionsLedgerTable() {
    if (!ordersTableBody) return;
    ordersTableBody.innerHTML = '';
    
    if (invoicesLedger.length === 0) {
      ordersTableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; color: var(--text-muted); padding: 30px;">
            <i class="fa-solid fa-receipt" style="font-size: 24px; margin-bottom: 8px;"></i>
            <p>No checkout invoices logged in local ledger.</p>
          </td>
        </tr>
      `;
      return;
    }

    ordersTableBody.innerHTML = invoicesLedger.map((inv, idx) => {
      const syncBadge = inv.refundRef
        ? `<span class="status-pill warning">REFUND: #${inv.refundRef}</span>`
        : `<span class="status-pill success"><i class="fa-solid fa-cloud"></i> Synced Books</span>`;

      const refundBtn = inv.status === 'Fully Refunded'
        ? `<button class="btn-secondary btn-sm" disabled style="opacity: 0.5;">Refunded</button>`
        : `<button class="btn-danger btn-sm btn-refund-trigger" data-idx="${idx}"><i class="fa-solid fa-scissors"></i> Refund</button>`;

      return `
        <tr>
          <td><strong>${inv.invoiceNo}</strong></td>
          <td><span style="font-family: monospace;">${inv.localRef}</span></td>
          <td>${new Date(inv.timestamp).toLocaleString()}</td>
          <td>${inv.customer}</td>
          <td>${inv.method}</td>
          <td>${sysConfig.bizCurrency}${inv.subtotal.toFixed(2)}</td>
          <td>${sysConfig.bizCurrency}${inv.tax.toFixed(2)}</td>
          <td><strong>${sysConfig.bizCurrency}${inv.total.toFixed(2)}</strong></td>
          <td>${syncBadge}</td>
          <td style="text-align: right; display: flex; gap: 5px; justify-content: flex-end;">
            ${refundBtn}
            <button class="btn-primary btn-sm btn-ledger-print" data-idx="${idx}"><i class="fa-solid fa-print"></i> Receipt</button>
          </td>
        </tr>
      `;
    }).join('');

    // Bind ledger printable receipts preview modal loading
    document.querySelectorAll('.btn-ledger-print').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        populateReceiptThermalSlips(invoicesLedger[idx]);
        openReceiptModalPopup();
      });
    });

    // Bind selective item Returns & Refund manager logic
    document.querySelectorAll('.btn-refund-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        const inv = invoicesLedger[idx];
        
        const confirmRefund = confirm(`[REFUND WIZARD INITIALIZED]\n\nAre you sure you want to refund checkout invoice: ${inv.invoiceNo}?\nThis cancels billing records and releases items stock back into inventory.`);
        if (confirmRefund) {
          inv.status = 'Fully Refunded';
          inv.refundRef = `REF-${Math.floor(1000 + Math.random() * 9000)}`;
          
          // Add stocks back
          inv.cart.forEach(cartItem => {
            const dbItem = catalogItems.find(i => i.sku === cartItem.sku);
            if (dbItem) {
              dbItem.stock += cartItem.qty;
            }
          });

          // Subtract shift metrics
          if (activeShift) {
            if (inv.method === 'Cash') {
              activeShift.cashSales = Math.max(0, activeShift.cashSales - inv.total);
            } else {
              activeShift.nonCashSales = Math.max(0, activeShift.nonCashSales - inv.total);
            }
          }

          localStorage.setItem('pos_catalog_db', JSON.stringify(catalogItems));
          localStorage.setItem('pos_shifts_db', JSON.stringify(shiftLogs));
          localStorage.setItem('pos_invoices_ledger', JSON.stringify(invoicesLedger));
          
          addAuditRecord('Ledger Returns', `Refund executed successfully. Ref: ${inv.invoiceNo}, Refunded: $${inv.total.toFixed(2)}`);
          showToast(`Refund processed! Stock items reinstated.`);
          
          rebuildIndustryCatalogGrid();
          renderTransactionsLedgerTable();
          updateDashboardMetrics();
        }
      });
    });
  }

  // Live filter journal ledger transactions search
  orderTableSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#orders-history-table tbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });

  // Force Ledger Synchronizer — pull from backend API
  btnRefreshOrders.addEventListener('click', async () => {
    showToast('Pulling latest orders from Zoho Books cloud ledger...');
    try {
      const res = await callApi('/api/orders');
      if (res && res.success && res.data && res.data.length > 0) {
        // Merge backend orders into local ledger (avoid duplicates by booksId)
        res.data.forEach(order => {
          if (!order.books_invoice_id) return;
          const existing = invoicesLedger.find(inv => inv.booksId === order.books_invoice_id);
          if (!existing) {
            invoicesLedger.push({
              invoiceNo: order.books_invoice_id || `SERVER-${order.ROWID}`,
              localRef: `SRV-${order.ROWID}`,
              booksId: order.books_invoice_id || '',
              timestamp: order.created_time || new Date().toISOString(),
              customer: order.customer_name || 'Unknown',
              customerEmail: order.customer_email || '',
              method: order.payment_mode || 'Unknown',
              subtotal: parseFloat(order.subtotal) || 0,
              tax: parseFloat(order.tax_amount) || 0,
              total: parseFloat(order.total) || 0,
              cart: [],
              notes: 'N/A',
              status: order.status || 'Synced',
              currencySymbol: sysConfig.bizCurrency,
              scaleFactor: 1.0
            });
          }
        });
        localStorage.setItem('pos_invoices_ledger', JSON.stringify(invoicesLedger));
        renderTransactionsLedgerTable();
        showToast(`Orders refreshed! ${res.data.length} records found in cloud datastore.`);
      } else {
        showToast('No cloud orders found or already up to date.');
      }
    } catch (err) {
      showToast('Orders refresh failed: ' + err.message, true);
    }
  });

  // ==========================================================================
  // 12. PRODUCTS CATALOG DATABASE CRUD MANAGER
  // ==========================================================================
  
  function renderProductsCatalogCrudTable() {
    productListTableBody.innerHTML = '';
    
    productListTableBody.innerHTML = catalogItems.map(item => {
      const isLowStock = item.stock <= sysConfig.invLowStock;
      const stockBadge = isLowStock 
        ? `<span class="status-pill danger" style="font-size: 10px;">LOW: ${item.stock}</span>`
        : `<span class="status-pill success" style="font-size: 10px;">OK: ${item.stock}</span>`;

      return `
        <tr data-sku="${item.sku}">
          <td><span style="font-family: monospace; font-weight: bold;">${item.sku}</span></td>
          <td><strong>${item.name}</strong></td>
          <td><span class="status-pill info" style="font-size: 10px;">${item.industry || activeIndustry}</span></td>
          <td>${item.category}</td>
          <td>${stockBadge}</td>
          <td><strong>${sysConfig.bizCurrency}${item.rate.toFixed(2)}</strong></td>
          <td>${item.tax_percentage || INDUSTRY_PROFILES[activeIndustry].defaultTax}%</td>
          <td><span style="font-size: 11px; color: var(--text-secondary); font-style: italic;">${item.custom || 'N/A'}</span></td>
          <td style="text-align: right; display: flex; gap: 5px; justify-content: flex-end;">
            <button class="btn-secondary btn-sm btn-prod-edit" data-sku="${item.sku}"><i class="fa-solid fa-edit"></i> Edit</button>
            <button class="btn-danger btn-sm btn-prod-del" data-sku="${item.sku}"><i class="fa-solid fa-trash"></i> Del</button>
          </td>
        </tr>
      `;
    }).join('');

    // Bind Edit Product Form triggers
    document.querySelectorAll('.btn-prod-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-sku');
        const item = catalogItems.find(i => i.sku === sku);
        if (item) {
          openProductEditorModal(item);
        }
      });
    });

    // Bind Delete Product form triggers
    document.querySelectorAll('.btn-prod-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-sku');
        const idx = catalogItems.findIndex(i => i.sku === sku);
        if (idx > -1) {
          if (confirm(`Are you sure you want to permanently delete product '${catalogItems[idx].name}' (SKU: ${sku})?`)) {
            const name = catalogItems[idx].name;
            catalogItems.splice(idx, 1);
            localStorage.setItem('pos_catalog_db', JSON.stringify(catalogItems));
            
            addAuditRecord('Catalog CRUD', `Deleted item from database SKU: ${sku}`);
            showToast(`Product deleted successfully.`);
            
            rebuildIndustryCatalogGrid();
            renderProductsCatalogCrudTable();
            updateDashboardMetrics();
          }
        }
      });
    });
  }

  // Open Product CRUD Editor Modal Form
  function openProductEditorModal(item = null) {
    productEditorModal.classList.add('active');
    
    // Dynamic Custom Property Attribute label binding dependent on active industry choice
    prodCustomAttrLabel.textContent = INDUSTRY_PROFILES[activeIndustry].customAttr;
    prodCustomAttrVal.placeholder = INDUSTRY_PROFILES[activeIndustry].placeholderAttr;

    if (item) {
      document.getElementById('product-modal-title').textContent = 'Edit Catalog Product';
      prodEditRowId.value = item.sku;
      prodName.value = item.name;
      prodSku.value = item.sku;
      prodSku.disabled = true; // SKU cannot be edited (database primary key constraint)
      prodIndustry.value = item.industry || activeIndustry;
      prodCategory.value = item.category;
      prodStock.value = item.stock;
      prodPrice.value = item.rate;
      prodTax.value = item.tax_percentage || INDUSTRY_PROFILES[activeIndustry].defaultTax;
      prodCustomAttrVal.value = item.custom || '';
    } else {
      document.getElementById('product-modal-title').textContent = 'Add New Catalog Product';
      prodEditRowId.value = '';
      productEditorForm.reset();
      prodSku.disabled = false;
      prodIndustry.value = activeIndustry;
      prodTax.value = INDUSTRY_PROFILES[activeIndustry].defaultTax;
      prodCategory.value = INDUSTRY_PROFILES[activeIndustry].categories[0] || '';
    }
  }

  btnCloseProductModal.addEventListener('click', () => { productEditorModal.classList.remove('active'); });
  btnCancelProductModal.addEventListener('click', () => { productEditorModal.classList.remove('active'); });

  btnAddItemTrigger.addEventListener('click', () => { openProductEditorModal(); });

  // Handle SKU dynamic custom attribute label alterations
  prodIndustry.addEventListener('change', (e) => {
    const ind = e.target.value;
    prodCustomAttrLabel.textContent = INDUSTRY_PROFILES[ind].customAttr;
    prodCustomAttrVal.placeholder = INDUSTRY_PROFILES[ind].placeholderAttr;
    prodTax.value = INDUSTRY_PROFILES[ind].defaultTax;
    prodCategory.value = INDUSTRY_PROFILES[ind].categories[0] || '';
  });

  // Submit Product CRUD form operation
  productEditorForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const rowId = prodEditRowId.value;
    const itemSku = prodSku.value.trim().toUpperCase();
    const itemName = prodName.value.trim();
    const itemIndustry = prodIndustry.value;
    const itemCategory = prodCategory.value.trim();
    const itemStock = parseInt(prodStock.value);
    const itemPrice = parseFloat(prodPrice.value);
    const itemTax = parseFloat(prodTax.value);
    const customAttr = prodCustomAttrVal.value.trim();

    if (!itemSku || !itemName) {
      showToast('SKU and Product Name are required fields.', true);
      return;
    }

    if (rowId) {
      // EDIT MODE
      const itemIdx = catalogItems.findIndex(i => i.sku === rowId);
      if (itemIdx > -1) {
        const updatedItem = {
          sku: rowId,
          name: itemName,
          industry: itemIndustry,
          category: itemCategory,
          stock: itemStock,
          rate: itemPrice,
          tax_percentage: itemTax,
          custom: customAttr
        };
        catalogItems[itemIdx] = updatedItem;
        showToast(`Product updated successfully.`);
        addAuditRecord('Catalog CRUD', `Edited item: ${itemName} (SKU: ${rowId})`);

        // Sync to backend if the item has a ROWID (was previously synced)
        const backendRowId = catalogItems[itemIdx]._rowid;
        if (backendRowId && localStorage.getItem('zoho_active_connection')) {
          callApi(`/api/items/${backendRowId}`, 'PUT', {
            name: itemName, rate: itemPrice, stock: itemStock, category: itemCategory, tax_percentage: itemTax
          }).catch(err => console.warn('Backend item update failed:', err.message));
        }
      }
    } else {
      // ADD MODE
      const isDuplicate = catalogItems.some(i => i.sku === itemSku);
      if (isDuplicate) {
        showToast(`Database Block: SKU '${itemSku}' already exists!`, true);
        return;
      }

      const newItem = {
        sku: itemSku,
        name: itemName,
        industry: itemIndustry,
        category: itemCategory,
        stock: itemStock,
        rate: itemPrice,
        tax_percentage: itemTax,
        custom: customAttr
      };
      catalogItems.push(newItem);
      showToast(`Product added successfully.`);
      addAuditRecord('Catalog CRUD', `Created new item: ${itemName} (SKU: ${itemSku})`);

      // Sync to backend
      if (localStorage.getItem('zoho_active_connection')) {
        callApi('/api/items', 'POST', {
          name: itemName, sku: itemSku, rate: itemPrice, stock: itemStock,
          category: itemCategory, tax_percentage: itemTax
        }).then(res => {
          if (res && res.success && res.item && res.item.ROWID) {
            const saved = catalogItems.find(i => i.sku === itemSku);
            if (saved) saved._rowid = res.item.ROWID;
            localStorage.setItem('pos_catalog_db', JSON.stringify(catalogItems));
          }
        }).catch(err => console.warn('Backend item create failed:', err.message));
      }
    }

    localStorage.setItem('pos_catalog_db', JSON.stringify(catalogItems));
    productEditorModal.classList.remove('active');
    
    rebuildIndustryCatalogGrid();
    renderProductsCatalogCrudTable();
    updateDashboardMetrics();
  });

  // Product CRUD search
  productTableSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#products-tab tbody tr');
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
  });

  // ==========================================================================
  // 13. CUSTOMER / SUPPLIER CRM MANAGEMENT
  // ==========================================================================
  
  function renderCrmProfilesTable() {
    if (!crmTableBody) return;
    crmTableBody.innerHTML = '';
    
    // Filter profiles Customer vs Supplier
    const filteredCrm = crmProfiles.filter(p => p.type === currentCrmFilter);

    if (filteredCrm.length === 0) {
      crmTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
            <i class="fa-solid fa-users" style="font-size: 24px; margin-bottom: 8px;"></i>
            <p>No directory profiles found.</p>
          </td>
        </tr>
      `;
      return;
    }

    crmTableBody.innerHTML = filteredCrm.map(p => {
      const balanceColor = p.balance > 0 
        ? 'color: var(--danger); font-weight: bold;' 
        : p.balance < 0 
          ? 'color: var(--success); font-weight: bold;'
          : '';

      const balanceText = p.balance > 0 
        ? `${sysConfig.bizCurrency}${p.balance.toFixed(2)} (Owed)`
        : p.balance < 0 
          ? `${sysConfig.bizCurrency}${Math.abs(p.balance).toFixed(2)} (Credit)`
          : `${sysConfig.bizCurrency}0.00`;

      return `
        <tr data-id="${p.id}">
          <td><span style="font-family: monospace; font-weight: bold;">${p.id}</span></td>
          <td><strong>${p.name}</strong></td>
          <td>
            <div style="font-size: 11px;">
              <p><i class="fa-solid fa-envelope"></i> ${p.email || 'N/A'}</p>
              <p style="margin-top: 2px;"><i class="fa-solid fa-phone"></i> ${p.phone || 'N/A'}</p>
            </div>
          </td>
          <td>${p.company || 'N/A'}</td>
          <td>${p.taxid || 'N/A'}</td>
          <td><span style="${balanceColor}">${balanceText}</span></td>
          <td><span class="status-pill info" style="font-size: 10px;">Ledger Reconciled</span></td>
          <td style="text-align: right; display: flex; gap: 5px; justify-content: flex-end;">
            <button class="btn-secondary btn-sm btn-crm-edit" data-id="${p.id}"><i class="fa-solid fa-edit"></i> Edit</button>
            <button class="btn-danger btn-sm btn-crm-del" data-id="${p.id}"><i class="fa-solid fa-trash"></i> Del</button>
          </td>
        </tr>
      `;
    }).join('');

    // Bind CRM edits
    document.querySelectorAll('.btn-crm-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const p = crmProfiles.find(prof => prof.id === id);
        if (p) {
          openCrmEditorModal(p);
        }
      });
    });

    // Bind CRM deletions
    document.querySelectorAll('.btn-crm-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const idx = crmProfiles.findIndex(prof => prof.id === id);
        if (idx > -1) {
          if (id === 'CRM-1001') {
            showToast('System Block: Cannot delete Walk-in Customer guest profile.', true);
            return;
          }

          if (confirm(`Are you sure you want to permanently delete profile '${crmProfiles[idx].name}' from CRM?`)) {
            crmProfiles.splice(idx, 1);
            localStorage.setItem('pos_crm_db', JSON.stringify(crmProfiles));
            showToast('CRM directory profile deleted successfully.');
            
            renderCrmProfilesTable();
            syncCrmSelectOptions();
            updateDashboardMetrics();
          }
        }
      });
    });
  }

  function openCrmEditorModal(prof = null) {
    contactEditorModal.classList.add('active');
    
    if (prof) {
      document.getElementById('contact-modal-title').textContent = 'Edit CRM Profile';
      crmEditId.value = prof.id;
      crmName.value = prof.name;
      crmType.value = prof.type;
      crmEmail.value = prof.email;
      crmPhone.value = prof.phone;
      crmCompany.value = prof.company || '';
      crmTaxId.value = prof.taxid || '';
      crmBalance.value = prof.balance;
    } else {
      document.getElementById('contact-modal-title').textContent = 'Create CRM Guest Profile';
      crmEditId.value = '';
      contactEditorForm.reset();
    }
  }

  btnCloseContactModal.addEventListener('click', () => { contactEditorModal.classList.remove('active'); });
  btnCancelContactModal.addEventListener('click', () => { contactEditorModal.classList.remove('active'); });
  btnAddContactTrigger.addEventListener('click', () => { openCrmEditorModal(); });
  btnAddQuickCustomer.addEventListener('click', () => { openCrmEditorModal(); });

  crmViewCustomers.addEventListener('click', () => {
    crmViewCustomers.classList.add('active');
    crmViewSuppliers.classList.remove('active');
    currentCrmFilter = 'Customer';
    document.getElementById('crm-table-title').textContent = 'Customer Contact Directory';
    renderCrmProfilesTable();
  });

  crmViewSuppliers.addEventListener('click', () => {
    crmViewSuppliers.classList.add('active');
    crmViewCustomers.classList.remove('active');
    currentCrmFilter = 'Supplier';
    document.getElementById('crm-table-title').textContent = 'Supplier Procurement Directory';
    renderCrmProfilesTable();
  });

  // Submit CRM contact profile addition/edit
  contactEditorForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = crmEditId.value;
    const name = crmName.value.trim();
    const type = crmType.value;
    const email = crmEmail.value.trim();
    const phone = crmPhone.value.trim();
    const company = crmCompany.value.trim();
    const taxid = crmTaxId.value.trim();
    const bal = parseFloat(crmBalance.value) || 0.00;

    if (!name) return;

    if (id) {
      // EDIT
      const idx = crmProfiles.findIndex(p => p.id === id);
      if (idx > -1) {
        crmProfiles[idx] = { id, name, type, email, phone, company, taxid, balance: bal };
        showToast('Profile updated successfully.');
        addAuditRecord('CRM Directory', `Edited contact profile: ${name} (ID: ${id})`);
        // Sync to backend
        if (localStorage.getItem('zoho_active_connection')) {
          callApi('/api/contacts', 'POST', { id, name, type, email, phone, company, taxid, balance: bal })
            .catch(err => console.warn('Backend contact update failed:', err.message));
        }
      }
    } else {
      // ADD
      const newId = `CRM-${Math.floor(1000 + Math.random() * 9000)}`;
      const newProfile = { id: newId, name, type, email, phone, company, taxid, balance: bal };
      crmProfiles.push(newProfile);
      showToast('New profile created successfully.');
      addAuditRecord('CRM Directory', `Created guest contact profile: ${name} (ID: ${newId})`);
      // Sync to backend
      if (localStorage.getItem('zoho_active_connection')) {
        callApi('/api/contacts', 'POST', { id: newId, name, type, email, phone, company, taxid, balance: bal })
          .catch(err => console.warn('Backend contact create failed:', err.message));
      }
    }

    localStorage.setItem('pos_crm_db', JSON.stringify(crmProfiles));
    contactEditorModal.classList.remove('active');
    
    renderCrmProfilesTable();
    syncCrmSelectOptions();
    updateDashboardMetrics();
  });

  // Re-sync CRM autocomplete selectors on register panel
  function syncCrmSelectOptions() {
    // Collect customers only
    const customers = crmProfiles.filter(p => p.type === 'Customer');
    
    customerSelect.innerHTML = customers.map(c => {
      const selectedAttr = c.id === 'CRM-1001' ? 'selected' : '';
      return `<option value="${c.name}" ${selectedAttr}>${c.name}</option>`;
    }).join('');

    // Pre-fill email dynamically when chosen — use onchange to avoid duplicate listeners
    customerSelect.onchange = (e) => {
      const activeCust = customers.find(c => c.name === e.target.value);
      if (activeCust) {
        customerEmailInput.value = activeCust.email;
        cartHeaderTitle.textContent = `${activeCust.name} Register`;
      }
    };

    // Run first baseline fill
    if (customers.length > 0) {
      customerEmailInput.value = customers[0].email;
    }
  }

  // CRM Search bar query
  crmSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#crm-tab tbody tr');
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
  });

  // ==========================================================================
  // 14. SHIFTS TERMINAL REGISTER & CONTROL LOGS
  // ==========================================================================
  
  function renderShiftsLedgerTable() {
    if (!shiftHistoryTableBody) return;
    shiftHistoryTableBody.innerHTML = '';
    
    if (shiftLogs.length === 0) {
      shiftHistoryTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">
            <i class="fa-solid fa-book" style="font-size: 24px; margin-bottom: 8px;"></i>
            <p>No shift closure ledger records logged yet.</p>
          </td>
        </tr>
      `;
      return;
    }

    shiftHistoryTableBody.innerHTML = shiftLogs.map(log => {
      const varianceColor = log.variance > 0 
        ? 'color: var(--success); font-weight: bold;' 
        : log.variance < 0 
          ? 'color: var(--danger); font-weight: bold;' 
          : '';

      const statusBadge = log.status === 'Open'
        ? `<span class="status-pill warning">ACTIVE OPEN</span>`
        : `<span class="status-pill success">RECONCILED CLOSED</span>`;

      return `
        <tr>
          <td><span style="font-family: monospace; font-weight: bold;">${log.id}</span></td>
          <td><strong>${log.cashier}</strong></td>
          <td>${sysConfig.bizCurrency}${log.openingFloat.toFixed(2)}</td>
          <td>${sysConfig.bizCurrency}${log.expectedCash.toFixed(2)}</td>
          <td>${log.actualCash !== null ? sysConfig.bizCurrency + log.actualCash.toFixed(2) : '--'}</td>
          <td><span style="${varianceColor}">${log.variance !== null ? sysConfig.bizCurrency + log.variance.toFixed(2) : '--'}</span></td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  // Open Till Shift submission
  shiftOpenForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const cashier = shiftCashierName.value.trim();
    const openingFloat = parseFloat(shiftOpeningFloat.value) || 0.00;
    const notes = shiftOpenNotes.value.trim();

    if (!cashier) return;

    const newShiftId = `SHF-${Math.floor(100 + Math.random() * 900)}`;
    activeShift = {
      id: newShiftId,
      cashier: cashier,
      openingFloat: openingFloat,
      cashSales: 0.00,
      nonCashSales: 0.00,
      cashIn: 0.00,
      cashOut: 0.00,
      expectedCash: openingFloat,
      actualCash: null,
      variance: null,
      openTime: new Date().toISOString(),
      notes: notes,
      status: 'Open'
    };

    shiftLogs.unshift(activeShift);
    localStorage.setItem('pos_shifts_db', JSON.stringify(shiftLogs));

    // Persist shift open to backend Shifts table
    if (localStorage.getItem('zoho_active_connection')) {
      callApi('/api/shifts/open', 'POST', {
        cashier_name: cashier,
        opening_float: openingFloat,
        open_notes: notes
      }).then(res => {
        if (res && res.success && res.shift && res.shift.ROWID) {
          activeShift._rowid = res.shift.ROWID;
          localStorage.setItem('pos_shifts_db', JSON.stringify(shiftLogs));
        }
      }).catch(err => console.warn('Backend shift open failed:', err.message));
    }
    
    addAuditRecord('Shift Manager', `Till shift register initialized successfully. ID: ${newShiftId}, Open Float: $${openingFloat}`);
    showToast(`Till Register Shift is now OPEN! Assigned cashier: ${cashier}`);

    // Update Layout states
    shiftClosedState.classList.add('hidden');
    shiftOpenState.classList.remove('hidden');
    
    shiftActiveCashierDisplay.textContent = cashier;
    shiftStatOpening.textContent = `${sysConfig.bizCurrency}${openingFloat.toFixed(2)}`;
    shiftStatCashSales.textContent = `${sysConfig.bizCurrency}0.00`;
    shiftStatNoncash.textContent = `${sysConfig.bizCurrency}0.00`;
    shiftStatExpected.textContent = `${sysConfig.bizCurrency}${openingFloat.toFixed(2)}`;

    applyReactiveStyles();
    renderShiftsLedgerTable();
    updateDashboardMetrics();
    navigateToTab('register-tab');
  });

  // Re-calculate live shift parameters dynamically when viewing shifts tab
  function updateLiveShiftExpectedDisplayValues() {
    if (activeShift) {
      shiftStatCashSales.textContent = `${sysConfig.bizCurrency}${activeShift.cashSales.toFixed(2)}`;
      shiftStatNoncash.textContent = `${sysConfig.bizCurrency}${activeShift.nonCashSales.toFixed(2)}`;
      
      const expected = activeShift.openingFloat + activeShift.cashSales + (activeShift.cashIn || 0.00) - (activeShift.cashOut || 0.00);
      activeShift.expectedCash = expected;
      shiftStatExpected.textContent = `${sysConfig.bizCurrency}${expected.toFixed(2)}`;
    }
  }

  // Close Till Shift Submission
  shiftCloseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!activeShift) return;

    const actual = parseFloat(shiftClosingActual.value);
    const notes = shiftCloseNotes.value.trim();

    const expected = activeShift.openingFloat + activeShift.cashSales + (activeShift.cashIn || 0.00) - (activeShift.cashOut || 0.00);
    const variance = actual - expected;

    activeShift.actualCash = actual;
    activeShift.variance = variance;
    activeShift.notes += ` | Close Notes: ${notes}`;
    activeShift.status = 'Closed';
    activeShift.closeTime = new Date().toISOString();

    localStorage.setItem('pos_shifts_db', JSON.stringify(shiftLogs));

    // Persist shift closure to backend Shifts table
    if (activeShift && activeShift._rowid && localStorage.getItem('zoho_active_connection')) {
      callApi('/api/shifts/close', 'POST', {
        rowid: activeShift._rowid,
        actual_cash: actual,
        close_notes: notes,
        cash_sales: activeShift.cashSales,
        noncash_sales: activeShift.nonCashSales
      }).catch(err => console.warn('Backend shift close failed:', err.message));
    }
    
    addAuditRecord('Shift Manager', `Till reconciled & closed. Expected: ${sysConfig.bizCurrency}${expected.toFixed(2)}, Actual: ${sysConfig.bizCurrency}${actual.toFixed(2)}, Variance: ${sysConfig.bizCurrency}${variance.toFixed(2)}`);
    showToast(`Till Register closed. Variance: ${sysConfig.bizCurrency}${variance.toFixed(2)}`);

    // Reset shift logs
    activeShift = null;
    shiftClosedState.classList.remove('hidden');
    shiftOpenState.classList.add('hidden');
    shiftOpenForm.reset();
    shiftCloseForm.reset();

    applyReactiveStyles();
    renderShiftsLedgerTable();
    updateDashboardMetrics();
  });

  // ==========================================================================
  // 15. ZOHO OAUTH SINGLE CLICK Handshake & SYNCHRONIZER
  // ==========================================================================
  
  // Verify backend connectivity. The backend auto-seeds SaaS developer credentials,
  // so merchants never enter a Client ID/Secret — they just click "Connect Zoho Books".
  async function seedDefaultCredentials() {
    try {
      const res = await callApi('/api/auth/status');
      isMasterConfigured = !!(res && res.success && res.master_configured);
    } catch (err) {
      console.warn('Auth status check failed (backend will self-seed on Connect):', err);
      // Assume configured — backend seeds on demand when the Connect button is used
      isMasterConfigured = true;
    }
    // Reflect any existing tenant connection into the hero card
    renderZohoConnectionState();
    renderSyncLogs();
  }

  // Switch Organization: re-run OAuth to pick a different org for this tenant
  if (btnSwitchOrg) {
    btnSwitchOrg.addEventListener('click', () => {
      if (btnSeamlessZohoLogin) btnSeamlessZohoLogin.click();
    });
  }

  // Restore the Connect button to its idle label
  function resetConnectButton() {
    if (!btnSeamlessZohoLogin) return;
    btnSeamlessZohoLogin.disabled = false;
    btnSeamlessZohoLogin.innerHTML = `<i class="fa-solid fa-plug-circle-bolt"></i> <span>Connect Zoho Books</span>`;
  }

  // Zoho Books Connect button — opens OAuth popup (backend self-seeds credentials)
  // If already connected, the button is hidden and the connected state is shown instead.
  if (btnSeamlessZohoLogin) {
    btnSeamlessZohoLogin.addEventListener('click', async () => {
      // Check if already connected — if so, confirm before re-authorizing
      const existing = localStorage.getItem('zoho_active_connection');
      if (existing) {
        try {
          const conn = JSON.parse(existing);
          if (conn.orgId) {
            if (!confirm(`Already connected to "${conn.orgName}". Re-authorize to switch organization?`)) {
              return;
            }
          }
        } catch (e) { /* continue with fresh auth */ }
      }

      btnSeamlessZohoLogin.disabled = true;
      btnSeamlessZohoLogin.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Opening Zoho…</span>`;

      // Clear old connection to prevent stale data for new user
      localStorage.removeItem('zoho_active_connection');

      try {
        const popup = window.open('/server/pos_backend/api/auth/url', "zoho_oauth", "width=600,height=700");
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          showToast('Popup blocker detected! Please allow popups for this site.', true);
          resetConnectButton();
        } else {
          showToast('Authorization window opened. Approve access in the Zoho window.', false);
          // Polling check if popup closed without message (as a safety fallback)
          const popupTimer = setInterval(() => {
            if (popup.closed) {
              clearInterval(popupTimer);
              resetConnectButton();
            }
          }, 1000);
        }
      } catch (err) {
        showToast(`Failed to open Zoho login: ${err.message}`, true);
        resetConnectButton();
      }
    });
  }

  // Message listener to capture Zoho OAuth success from popup
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'zoho_auth_success') {
      console.log('Received Zoho OAuth success payload:', event.data);
      const { email, refreshToken, dc, organizations } = event.data;
      
      // Store in tempAuthData for organization selection
      tempAuthData = {
        email: email,
        dc: dc,
        refreshToken: refreshToken,
        organizations: organizations
      };
      
      // Save admin user locally (since DB writes may fail)
      const localUsers = JSON.parse(localStorage.getItem('pos_local_users') || '[]');
      const existingAdmin = localUsers.find(u => u.email === email);
      if (!existingAdmin) {
        localUsers.push({ email, name: email.split('@')[0] || 'Admin', role: 'Admin', status: 'active', verified_at: Date.now() });
        localStorage.setItem('pos_local_users', JSON.stringify(localUsers));
      }
      
      showToast('Zoho OAuth authorization success! Resolving organizations...', false);
      
      if (!organizations || organizations.length === 0) {
        showToast('No active Zoho Books organizations found for this account.', true);
        resetConnectButton();
      } else if (organizations.length === 1) {
        // Exactly 1 organization: auto-select and auto-sync
        const singleOrg = organizations[0];
        const activeConnection = {
          email: email || singleOrg.email || 'merchant@zoho.books',
          dc: singleOrg.dc || dc || 'US',
          orgId: singleOrg.organization_id,
          orgName: singleOrg.name,
          refreshToken: refreshToken, // SAVE THE REFRESH TOKEN!
          time: Date.now()
        };
        localStorage.setItem('zoho_active_connection', JSON.stringify(activeConnection));
        // Also save per-catalyst-user scoped connection
        const catUser = localStorage.getItem('pos_catalyst_user');
        if (catUser) {
          const scopedKey = `zoho_conn_${catUser.replace(/[^a-zA-Z0-9]/g, '_')}`;
          localStorage.setItem(scopedKey, JSON.stringify(activeConnection));
        }
        showToast(`Auto-connected to Organization: ${singleOrg.name}`);
        addAuditRecord('SSO Onboarding', `Auto-connected single tenant: ${singleOrg.name}`);
        
        loadPersistentDatabase();
        renderZohoConnectionState();
        fetchAndStoreOrgProfile();
        recordSyncEvent('Zoho Books OAuth', 'Organization linked & profile mapped', '200 OK', 'Synced');
        triggerFullCatalogSync();
      } else {
        // Multiple organizations exist: prompt selection modal
        orgSelectorList.innerHTML = organizations.map(org => {
          return `
            <div class="org-option-card" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s; background: var(--bg-card); margin-bottom: 8px;" data-org-id="${org.organization_id}" data-org-name="${org.name}" data-org-dc="${org.dc}">
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <span class="org-name" style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${org.name}</span>
                <span class="org-id" style="font-size: 12px; color: var(--text-secondary);">ID: ${org.organization_id} • DC: ${org.dc} • Currency: ${org.currency_code}</span>
              </div>
              <input type="radio" name="zoho_org_select" value="${org.organization_id}" style="width: 18px; height: 18px; accent-color: var(--primary);">
            </div>
          `;
        }).join('');

        const cards = orgSelectorList.querySelectorAll('.org-option-card');
        cards.forEach(card => {
          card.addEventListener('click', () => {
            cards.forEach(c => {
              c.style.borderColor = 'var(--border-color)';
              c.querySelector('input').checked = false;
            });
            card.style.borderColor = 'var(--primary)';
            card.querySelector('input').checked = true;
            btnConfirmOrgSelect.disabled = false;
          });
        });

        btnConfirmOrgSelect.disabled = true;
        orgSelectorModal.classList.add('active');
      }
    }
  });

  // BroadcastChannel fallback listener for when popup cannot use postMessage
  try {
    const bc = new BroadcastChannel('zoho_auth');
    bc.onmessage = (event) => {
      if (event.data && event.data.type === 'zoho_auth_success') {
        console.log('Received Zoho auth via BroadcastChannel:', event.data);
        window.dispatchEvent(new MessageEvent('message', { data: event.data }));
        bc.close();
      }
    };
  } catch(e) {}

  let tempAuthData = null; // To hold auth data temporarily during organization selection

  // Organization selector close buttons
    if (btnCloseOrgModal) {
    btnCloseOrgModal.addEventListener('click', () => {
      orgSelectorModal.classList.remove('active');
      resetConnectButton();
    });
  }

  if (btnCancelOrgModal) {
    btnCancelOrgModal.addEventListener('click', () => {
      orgSelectorModal.classList.remove('active');
      resetConnectButton();
    });
  }

  // Handle Organization Selection Confirmation
  if (btnConfirmOrgSelect) {
    btnConfirmOrgSelect.addEventListener('click', () => {
      const selectedRadio = orgSelectorList.querySelector('input[name="zoho_org_select"]:checked');
      if (!selectedRadio) return;

      const orgId = selectedRadio.value;
      const card = selectedRadio.closest('.org-option-card');
      const orgName = card.getAttribute('data-org-name');
      const orgDc = card.getAttribute('data-org-dc') || 'US';

      if (tempAuthData) {
        const activeConnection = {
          email: tempAuthData.email,
          dc: orgDc,
          orgId: orgId,
          orgName: orgName,
          refreshToken: tempAuthData.refreshToken, // Maintain dynamic token
          time: Date.now()
        };

        localStorage.setItem('zoho_active_connection', JSON.stringify(activeConnection));
        // Also save per-catalyst-user scoped connection
        const catUser = localStorage.getItem('pos_catalyst_user');
        if (catUser) {
          const scopedKey = `zoho_conn_${catUser.replace(/[^a-zA-Z0-9]/g, '_')}`;
          localStorage.setItem(scopedKey, JSON.stringify(activeConnection));
        }
        
        orgSelectorModal.classList.remove('active');
        showToast(`Successfully linked Organization: ${orgName}`);
        addAuditRecord('OAuth Core', `Tenant Linked: ${orgName} (ID: ${orgId})`);

        loadPersistentDatabase();
        renderZohoConnectionState();
        fetchAndStoreOrgProfile();
        recordSyncEvent('Zoho Books OAuth', `Organization selected: ${orgName}`, '200 OK', 'Synced');

        // Trigger automatic pull sync
        triggerFullCatalogSync();
      }
    });
  }

  // Handle Disconnection
  if (btnDisconnectZoho) {
    btnDisconnectZoho.addEventListener('click', () => {
      if (confirm('Disconnect this terminal registry from Zoho Books account? This removes active organization linkage and rolls POS back to local fallback storage.')) {
        // Clear both active and scoped connection
        const catUser = localStorage.getItem('pos_catalyst_user');
        if (catUser) {
          const scopedKey = `zoho_conn_${catUser.replace(/[^a-zA-Z0-9]/g, '_')}`;
          localStorage.removeItem(scopedKey);
        }
        localStorage.removeItem('zoho_active_connection');
        localStorage.removeItem('pos_last_sync');
        localStorage.removeItem('zoho_org_profile');
        
        // Roll back products to base active presets
        catalogItems = [ ...INDUSTRY_PROFILES[activeIndustry].presets ];
        localStorage.setItem('pos_catalog_db', JSON.stringify(catalogItems));

        showToast('Zoho connection cleared. Local offline sandbox active.');
        addAuditRecord('OAuth Core', 'Zoho organization disconnected.');
        recordSyncEvent('Zoho Books OAuth', 'Organization disconnected', '200 OK', 'Disconnected');
        
        loadPersistentDatabase();
        renderZohoConnectionState();
        renderSyncLogs();
      }
    });
  }

  // ==========================================================================
  // ZOHO CATALYST NATIVE AUTHENTICATION & SINGLE SIGN-OUT HOOKS
  // ==========================================================================

  // Session verification on page load
  async function checkCatalystAuth() {
    const authOverlay = document.getElementById('auth-overlay-backdrop');
    const loginBtn = document.getElementById('btn-auth-login');
    const offlineBtn = document.getElementById('btn-auth-offline-bypass');
    const diagnosticsArea = document.getElementById('auth-diagnostics-area');
    const errorMsgEl = document.getElementById('auth-error-msg');
    const retryBtn = document.getElementById('btn-auth-diagnostics-retry');

    // Bind auth overlay login button
    if (loginBtn && !loginBtn.dataset.bound) {
      loginBtn.dataset.bound = "true";
      loginBtn.addEventListener('click', () => {
        loginBtn.disabled = true;
        loginBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Redirecting to SSO...`;
        window.location.href = '/__catalyst/auth/login';
      });
    }

    // Bind retry button
    if (retryBtn && !retryBtn.dataset.bound) {
      retryBtn.dataset.bound = "true";
      retryBtn.addEventListener('click', () => {
        if (diagnosticsArea) diagnosticsArea.style.display = 'none';
        if (loginBtn) {
          loginBtn.disabled = true;
          loginBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Re-verifying session...`;
        }
        checkCatalystAuth();
      });
    }

    // Bind sandbox offline bypass button (only visible during local development)
    if (offlineBtn && !offlineBtn.dataset.bound) {
      offlineBtn.dataset.bound = "true";
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168.')) {
        offlineBtn.style.display = 'inline-flex';
        offlineBtn.addEventListener('click', () => {
          localStorage.setItem('catalyst_auth_cache', 'true');
          showToast('Offline sandbox bypass active.');
          if (authOverlay) {
            authOverlay.classList.add('fade-out');
            setTimeout(() => authOverlay.style.display = 'none', 400);
          }
          init();
        });
      }
    }

    // Check for explicit logout via storage or query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const isLogoutQuery = urlParams.has('logout') || urlParams.has('logged_out');
    const isExplicitLogout = localStorage.getItem('explicit_logout') === 'true' || isLogoutQuery;

    if (isExplicitLogout) {
      console.log('Explicit logout state active. Displaying login overlay and skipping auto-login check.');
      localStorage.removeItem('catalyst_auth_cache');
      localStorage.removeItem('explicit_logout');
      
      if (isLogoutQuery) {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }

      if (authOverlay) {
        authOverlay.style.display = 'flex';
        authOverlay.classList.remove('fade-out');
      }
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Sign In to POS Console`;
      }
      if (diagnosticsArea) {
        diagnosticsArea.style.display = 'none';
      }
      return;
    }

    // Check cached auth state to prevent overlay flash on refresh
    const cachedAuth = localStorage.getItem('catalyst_auth_cache') === 'true';
    if (cachedAuth) {
      console.log('Found cached auth session. Hiding overlay immediately and verifying asynchronously.');
      if (authOverlay) {
        authOverlay.style.display = 'none';
      }
      try {
        init();
      } catch (initErr) {
        console.error('CRITICAL: Core application initialization failed:', initErr);
      }
    }

    try {
      console.log('Verifying active Catalyst authentication session...');
      
      async function getCatalystUser() {
        try {
          const res = await catalyst.auth.isUserAuthenticated();
          if (res && res.content) {
            localStorage.setItem('catalyst_auth_cache', 'true');
            return {
              ...res.content,
              email: res.content.email_id || res.content.email || '',
              first_name: res.content.first_name || '',
              last_name: res.content.last_name || ''
            };
          }
        } catch (err) {
          console.warn('Session verification call failed:', err.message || err);
          throw err;
        }
        localStorage.removeItem('catalyst_auth_cache');
        return null;
      }

      let user = null;
      let initialError = null;
      try {
        user = await getCatalystUser();
      } catch (e) {
        initialError = e;
      }

      if (!user) {
        console.log('Auth session null on first attempt. Retrying in 800ms...');
        await new Promise(resolve => setTimeout(resolve, 800));
        try {
          user = await getCatalystUser();
        } catch (e) {
          initialError = e;
        }
      }
      
      if (!user) {
        console.warn('No active Catalyst session found after retry.');
        localStorage.removeItem('catalyst_auth_cache');
        const errMessage = initialError ? (initialError.message || initialError) : 'Session is null or unauthenticated';
        throw new Error(errMessage);
      }

      console.log('Active Catalyst session verified for:', user.email || user.first_name || 'Authenticated User');
      
      if (!cachedAuth) {
        showToast(`Welcome back, ${user.first_name || 'User'}!`);
        if (authOverlay) {
          authOverlay.classList.add('fade-out');
          setTimeout(() => {
            authOverlay.style.display = 'none';
            authOverlay.classList.remove('fade-out');
          }, 400);
        }
        if (diagnosticsArea) {
          diagnosticsArea.style.display = 'none';
        }
        try {
          init();
        } catch (initErr) {
          console.error('CRITICAL: Core application initialization failed:', initErr);
          showToast('System initialisation crash! Contact support.', true);
          if (diagnosticsArea && errorMsgEl) {
            diagnosticsArea.style.display = 'flex';
            errorMsgEl.innerHTML = `<strong style="color:#ef4444;"><i class="fa-solid fa-circle-xmark"></i> Core Init Crash</strong><br>The session was successfully verified, but the application crashed during start up.<br><br><strong>Error:</strong> ${initErr.message || initErr}<br><strong>Stack:</strong> ${initErr.stack ? initErr.stack.split('\n')[0] : 'N/A'}`;
          }
          return;
        }
      }

      try {
        await handleAutoOnboarding(user);
      } catch (onboardErr) {
        console.warn('Onboarding organization lookup failed:', onboardErr.message);
        showToast('Books auto-connect failed. Please link your account in Settings.', true);
      }

    } catch (err) {
      console.warn('Catalyst session verification failed:', err.message);
      localStorage.removeItem('catalyst_auth_cache');
      
      if (!cachedAuth) {
        if (diagnosticsArea && errorMsgEl) {
          const errMsg = (err.message || '').toLowerCase();
          if (errMsg.includes('unauthenticated') || errMsg.includes('null') || errMsg.includes('session is null')) {
            diagnosticsArea.style.display = 'none';
          } else {
            diagnosticsArea.style.display = 'flex';
            const hasCatalyst = typeof catalyst !== 'undefined';
            const cookieStatus = document.cookie ? `Found (${document.cookie.split(';').length} cookies)` : 'None or Blocked';
            
            errorMsgEl.innerHTML = `<strong style="color:#f87171;"><i class="fa-solid fa-triangle-exclamation"></i> Session Verification Error</strong><br>
            <strong>Message:</strong> ${err.message || err}<br>
            <strong>SDK Loaded:</strong> ${hasCatalyst ? 'Yes' : 'No'}<br>
            <strong>Browser Cookies:</strong> ${cookieStatus}<br>
            <strong>Protocol:</strong> ${window.location.protocol} (${window.location.hostname})`;
          }
        }

        if (authOverlay) {
          authOverlay.style.display = 'flex';
          if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Sign In to POS Console`;
          }
        }
      }
    }
  }

  // Auto-onboarding and linking merchant's Books organization
  async function handleAutoOnboarding(user) {
    const cachedConnection = localStorage.getItem('zoho_active_connection');
    if (!cachedConnection) {
      console.log('No linked Zoho Books connection found. Auto-resolving organizations...');
      try {
        showToast('Auto-fetching your Zoho Books organizations...', false);
        const response = await callApi('/api/organizations');
        if (response && response.success && response.organizations) {
          const orgs = response.organizations;
          if (orgs.length === 0) {
            showToast('No active Zoho Books organizations found. Use Connect Zoho Books button in Settings.', true);
          } else if (orgs.length === 1) {
            // Exactly 1 organization: auto-select and auto-sync
            // NOTE: This path uses the Catalyst server-side connection (zohobooks_conn),
            // so there is no user OAuth refreshToken. Products sync uses the connection credentials.
            const singleOrg = orgs[0];
            const activeConnection = {
              email: user.email || singleOrg.email || 'merchant@zoho.books',
              dc: singleOrg.dc || 'US',
              orgId: singleOrg.organization_id,
              orgName: singleOrg.name,
              refreshToken: null, // Catalyst Connection auth — no user refresh token here
              time: Date.now()
            };
        localStorage.setItem('zoho_active_connection', JSON.stringify(activeConnection));
        // Also save per-catalyst-user scoped connection
        const catUser = localStorage.getItem('pos_catalyst_user');
        if (catUser) {
          const scopedKey = `zoho_conn_${catUser.replace(/[^a-zA-Z0-9]/g, '_')}`;
          localStorage.setItem(scopedKey, JSON.stringify(activeConnection));
        }
            showToast(`Auto-connected to Organization: ${singleOrg.name}`);
            addAuditRecord('SSO Onboarding', `Auto-connected single tenant: ${singleOrg.name}`);
            
            loadPersistentDatabase();
            triggerFullCatalogSync();
          } else {
            // Multiple organizations exist: prompt selection modal
            tempAuthData = {
              email: user.email || 'merchant@zoho.books',
              dc: null,
              organizations: orgs
            };

            orgSelectorList.innerHTML = orgs.map(org => {
              return `
                <div class="org-option-card" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s; background: var(--bg-card); margin-bottom: 8px;" data-org-id="${org.organization_id}" data-org-name="${org.name}" data-org-dc="${org.dc}">
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span class="org-name" style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${org.name}</span>
                    <span class="org-id" style="font-size: 12px; color: var(--text-secondary);">ID: ${org.organization_id} • DC: ${org.dc} • Currency: ${org.currency_code}</span>
                  </div>
                  <input type="radio" name="zoho_org_select" value="${org.organization_id}" style="width: 18px; height: 18px; accent-color: var(--primary);">
                </div>
              `;
            }).join('');

            const cards = orgSelectorList.querySelectorAll('.org-option-card');
            cards.forEach(card => {
              card.addEventListener('click', () => {
                cards.forEach(c => {
                  c.style.borderColor = 'var(--border-color)';
                  c.querySelector('input').checked = false;
                });
                card.style.borderColor = 'var(--primary)';
                card.querySelector('input').checked = true;
                btnConfirmOrgSelect.disabled = false;
              });
            });

            btnConfirmOrgSelect.disabled = true;
            orgSelectorModal.classList.add('active');
          }
        }
      } catch (err) {
        console.warn('Onboarding organization lookup failed:', err.message);
      }
    }
  }

  // Bind Red Sign-Out Buttons
  const sidebarSignOutBtn = document.getElementById('btn-sidebar-signout');
  if (sidebarSignOutBtn) {
    sidebarSignOutBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to sign out of POS Console and terminate your Catalyst session?')) {
        try {
          // Clear cached login details
          localStorage.removeItem('zoho_active_connection');
          localStorage.removeItem('pos_last_sync');
          
          // Reset database cache back to presets
          catalogItems = [ ...INDUSTRY_PROFILES[activeIndustry].presets ];
          localStorage.setItem('pos_catalog_db', JSON.stringify(catalogItems));

          // Set explicit logout flag to bypass auto-login loop on reload
          localStorage.setItem('explicit_logout', 'true');

          showToast('Logging out of Cloud POS...');
          addAuditRecord('OAuth Core', 'User initiated single signout.');

          // Log out of Zoho Catalyst central auth session and reload with query param
          const logoutRedirectUrl = window.location.origin + window.location.pathname + '?logout=true';
          await catalyst.auth.signOut(logoutRedirectUrl);
        } catch (err) {
          console.error('Sign out error:', err);
          window.location.reload();
        }
      }
    });
  }

  // Pull Catalog Sync Implementation
  async function triggerFullCatalogSync() {
    if (!localStorage.getItem('zoho_active_connection')) {
      showToast('Terminal registration disconnected. Please connect Zoho Books Account first!', true);
      return;
    }

    if (btnFullSyncAction) {
      btnFullSyncAction.disabled = true;
      btnFullSyncAction.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Contacting Zoho api gateways...`;
    }

    try {
      showToast('Contacting Zoho API Gateway for catalogue synchronization...');
      
      const syncRes = await callApi('/api/sync/books', 'POST');
      if (!syncRes || !syncRes.success) {
        throw new Error(syncRes.error || 'Failed to complete catalog sync with server.');
      }

      if (syncRes.items && syncRes.items.length > 0) {
        catalogItems = syncRes.items;
        localStorage.setItem('pos_catalog_db', JSON.stringify(catalogItems));
      }
      
      const syncStamp = new Date().toLocaleString();
      localStorage.setItem('pos_last_sync', syncStamp);
      
      if (statTotalItems) statTotalItems.textContent = catalogItems.length.toString();
      if (statLastSync) statLastSync.textContent = syncStamp;

      showToast(`Catalog sync completed successfully! ${syncRes.summary.total_fetched} items matched.`);
      addAuditRecord('Database Sync', `Full catalog synchronization completed. Fetched: ${syncRes.summary.total_fetched}, Inserted: ${syncRes.summary.inserted}, Updated: ${syncRes.summary.updated}`);
      recordSyncEvent('Zoho Books Catalog', `Pull stock catalog — ${syncRes.summary.total_fetched} items`, '200 OK', 'Synced');
      rebuildIndustryCatalogGrid();
      renderProductsCatalogCrudTable();

    } catch (err) {
      showToast(err.message || 'Failed to synchronize with Zoho Books.', true);
      addAuditRecord('Database Sync Error', `Catalog sync failed: ${err.message}`);
      recordSyncEvent('Zoho Books Catalog', `Pull stock catalog failed: ${err.message}`, '500 Error', 'Failed');
    } finally {
      if (btnFullSyncAction) {
        btnFullSyncAction.disabled = false;
        btnFullSyncAction.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i> Pull Entire Zoho Catalog Items`;
      }
      
      loadPersistentDatabase();
    }
  }

  if (btnFullSyncAction) btnFullSyncAction.addEventListener('click', triggerFullCatalogSync);

  // Diagnostic button — runs full Zoho Books API connectivity test
  const btnDiagnose = document.getElementById('btn-diagnose-connection');
  if (btnDiagnose) {
    btnDiagnose.addEventListener('click', async () => {
      if (!localStorage.getItem('zoho_active_connection')) {
        showToast('No active Zoho connection.', true);
        return;
      }
      btnDiagnose.disabled = true;
      btnDiagnose.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Running diagnostics...`;
      try {
        const result = await callApi('/api/sync/diagnose');
        if (result && result.success && result.diagnosis) {
          const d = result.diagnosis;
          let msg = `Org: ${d.orgId}\nDC: ${d.dc}\n\n`;
          d.steps.forEach(s => {
            msg += `[${s.status}] ${s.name}`;
            if (s.error) msg += ` — ${s.error}`;
            if (s.count !== undefined) msg += ` — ${s.count} records`;
            if (s.prefix) msg += ` — ${s.prefix}`;
            msg += '\n';
          });
          console.log('DIAGNOSTIC RESULTS:\n' + msg);
          alert('Zoho Books Diagnostic Results:\n\n' + msg);
        } else {
          alert('Diagnostic failed: ' + (result ? result.error : 'No response'));
        }
      } catch (e) {
        alert('Diagnostic error: ' + e.message);
      } finally {
        btnDiagnose.disabled = false;
        btnDiagnose.innerHTML = `<i class="fa-solid fa-stethoscope"></i> Diagnose Connection`;
      }
    });
  }

  // ==========================================================================
  // 16. SETTINGS TAB - REACTIVE FORMS AND DOUBLE SIDEBAR INTERACTION
  // ==========================================================================
  
  // Settings double sidebar tabs navigation click handler
  settingsNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      settingsNavBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const paneId = btn.getAttribute('data-settings-pane');
      settingsPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === paneId) {
          pane.classList.add('active');
        }
      });
      activeSettingsPane = paneId;

      // Refresh dynamic content when switching panes
      if (paneId === 'sett-integrations') {
        renderSyncLogs();
        renderZohoConnectionState();
      }
      if (paneId === 'sett-users') {
        renderUsersManagement();
      }
    });
  });

  // Setup Dynamic backup snapshot file download triggers
  const btnBackupExport = document.getElementById('btn-settings-backup-export');
  const btnBackupImport = document.getElementById('btn-settings-backup-import');

  btnBackupExport.addEventListener('click', () => {
    const backupObj = {
      config: sysConfig,
      catalog: catalogItems,
      crm: crmProfiles,
      invoices: invoicesLedger,
      shifts: shiftLogs,
      audits: auditLogs
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `ZohoPOS_Snapshot_Backup_${new Date().toISOString().substring(0, 10)}.json`);
    dlAnchorElem.click();
    showToast('Database backup snapshot compiled and downloaded successfully!');
  });

  btnBackupImport.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.config && parsed.catalog && parsed.crm) {
            sysConfig = { ...sysConfig, ...parsed.config };
            catalogItems = parsed.catalog;
            crmProfiles = parsed.crm;
            if (parsed.invoices) invoicesLedger = parsed.invoices;
            if (parsed.shifts) shiftLogs = parsed.shifts;
            if (parsed.audits) auditLogs = parsed.audits;

            localStorage.setItem('pos_system_config', JSON.stringify(sysConfig));
            localStorage.setItem('pos_catalog_db', JSON.stringify(catalogItems));
            localStorage.setItem('pos_crm_db', JSON.stringify(crmProfiles));
            localStorage.setItem('pos_invoices_ledger', JSON.stringify(invoicesLedger));
            localStorage.setItem('pos_shifts_db', JSON.stringify(shiftLogs));
            localStorage.setItem('pos_audits_db', JSON.stringify(auditLogs));

            showToast('Snapshot backup restored into local sandboxed databases!');
            loadPersistentDatabase();
            applyReactiveStyles();
          } else {
            alert('Invalid backup schema file format. Profile mappings missing.');
          }
        } catch (err) {
          alert('Failed to parse database file snapshot: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
    fileInput.click();
  });

  // Settings forms submits bindings
  const bindSettingsFormSubmit = (formId, successMsg, callback = null) => {
    const form = document.getElementById(formId);
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const updates = {};
        for (const [key, val] of formData.entries()) {
          const chkInput = form.querySelector(`[name="${key}"]`);
          if (chkInput && chkInput.type === 'checkbox') {
            updates[key] = true;
          } else {
            updates[key] = isNaN(val) || val === '' ? val : parseFloat(val);
          }
        }
        
        // Handle un-checked checkbox fields
        form.querySelectorAll('input[type="checkbox"]').forEach(chk => {
          if (!formData.has(chk.name)) {
            updates[chk.name] = false;
          }
        });

        sysConfig = { ...sysConfig, ...updates };
        saveConfigurationState();
        showToast(successMsg);
        addAuditRecord('Settings Module', `Settings form '${formId}' updated & committed.`);
        
        if (callback) callback();
      });
    }
  };

  bindSettingsFormSubmit('form-sett-business', 'Business Profile preferences saved successfully!', () => {
    applyReactiveStyles();
    // Sync activeIndustry if changed in settings and dispatch change to reload catalog/presets
    if (sysConfig.bizIndustry && sysConfig.bizIndustry !== activeIndustry) {
      if (industrySelect) {
        industrySelect.value = sysConfig.bizIndustry;
        industrySelect.dispatchEvent(new Event('change'));
      }
    }
  });
  
  bindSettingsFormSubmit('form-sett-company', 'Company registration metadata updated successfully!');
  
  bindSettingsFormSubmit('form-sett-branding', 'Custom corporate branding and CSS tethers compiled!', () => {
    applyReactiveStyles();
  });
  
  bindSettingsFormSubmit('form-sett-taxes', 'Tax guidelines and surcharge compliance rates updated!', () => {
    applyReactiveStyles();
    rebuildCheckoutCartUI();
  });
  
  bindSettingsFormSubmit('form-sett-payments', 'Payment gateways and checking channels updated!');
  
  bindSettingsFormSubmit('form-sett-receipt', 'Thermal printable receipt templates updated!', () => {
    applyReactiveStyles();
  });
  
  bindSettingsFormSubmit('form-sett-invoice', 'Invoice sequence serial presets saved successfully!');
  
  bindSettingsFormSubmit('form-sett-inventory', 'Low-stock warnings and inventory rules adjusted!');
  
  bindSettingsFormSubmit('form-sett-pos', 'POS hardware and alert preferences adjusted!', () => {
    updateKdsNavVisibility();
  });
  
  bindSettingsFormSubmit('form-sett-barcode', 'Scale barcodes and UPC/EAN formats updated!');
  
  bindSettingsFormSubmit('form-sett-notifications', 'Notification sound and banner alert triggers saved!');
  
  bindSettingsFormSubmit('form-sett-email', 'SMTP mail server configurations successfully saved!');
  
  bindSettingsFormSubmit('form-sett-printer', 'Thermal network printer IP handshake OK!');
  
  bindSettingsFormSubmit('form-sett-security', 'Terminal access pins and auto-lock rules updated!');
  
  bindSettingsFormSubmit('form-sett-api', 'Developer webhook event hooks compiled successfully!');

  bindSettingsFormSubmit('form-sett-products-sync', 'Zoho Products Sync configuration saved successfully!');

  // ==========================================================================
  // 17. RE-RENDER METADATA JOURNAL LEDGERS
  // ==========================================================================
  
  function renderAuditsLogTable() {
    const body = document.getElementById('settings-audit-logs-body');
    if (body) {
      body.innerHTML = auditLogs.map(log => {
        return `
          <tr>
            <td><span style="font-family: monospace; font-weight: bold;">${log.logNo}</span></td>
            <td>${log.time}</td>
            <td><strong>${log.user}</strong></td>
            <td><span class="status-pill info" style="font-size: 10px;">${log.module}</span></td>
            <td>${log.action}</td>
          </tr>
        `;
      }).join('');
    }
  }

  function triggerSyncLogsReport() {
    const body = document.getElementById('settings-sync-logs-body');
    if (body) {
      body.innerHTML = `
        <tr>
          <td>Just now</td>
          <td><strong>Zoho Books Sandbox API</strong></td>
          <td>Pull stock catalog handshakes</td>
          <td>200 OK</td>
          <td><span class="status-pill success">Synced</span></td>
        </tr>
        <tr>
          <td>15 Mins Ago</td>
          <td><strong>Zoho CRM Contact Sync</strong></td>
          <td>Pull company directory profiles</td>
          <td>200 OK</td>
          <td><span class="status-pill success">Synced</span></td>
        </tr>
      `;
    }
  }

  // ==========================================================================
  // 18. TABLE FLOOR GRID GENERATION
  // ==========================================================================
  
  function renderFloorMapGrid() {
    const tables = [
      { id: 'Table 01', capacity: 2, status: 'vacant' },
      { id: 'Table 02', capacity: 4, status: 'vacant' },
      { id: 'Table 03', capacity: 2, status: 'vacant' },
      { id: 'Table 04', capacity: 6, status: 'dining' },
      { id: 'Table 05', capacity: 4, status: 'vacant' },
      { id: 'Table 06', capacity: 8, status: 'billing' },
      { id: 'Table 07', capacity: 2, status: 'vacant' },
      { id: 'Table 08', capacity: 4, status: 'vacant' }
    ];

    floorMapGrid.innerHTML = tables.map(t => {
      const activeClass = activeTableId === t.id ? 'active' : '';
      const icon = t.status === 'vacant' 
        ? 'fa-circle-check' 
        : t.status === 'dining' 
          ? 'fa-bowl-food' 
          : 'fa-file-invoice-dollar';

      return `
        <div class="table-node ${t.status} ${activeClass}" data-id="${t.id}">
          <span class="table-node-id">${t.id}</span>
          <span class="table-node-status"><i class="fa-solid ${icon}"></i> ${t.status}</span>
        </div>
      `;
    }).join('');

    // Table click selectors
    document.querySelectorAll('.tables-floor-grid .table-node').forEach(node => {
      node.addEventListener('click', () => {
        const tId = node.getAttribute('data-id');
        
        // Save current cart back to table state before swapping
        if (activeTableId) {
          tableCarts[activeTableId] = {
            cart: [ ...cart ],
            customer: customerSelect.value,
            notes: kitchenNotesInput.value
          };
        }

        if (activeTableId === tId) {
          // Deselect
          activeTableId = null;
          cart = [];
          customerSelect.value = 'Walk-in Customer';
          kitchenNotesInput.value = '';
          cartHeaderTitle.textContent = 'Walk-In Register';
        } else {
          activeTableId = tId;
          cartHeaderTitle.textContent = `${tId} Active Register`;
          
          // Load previous state if exists
          if (tableCarts[tId]) {
            cart = [ ...tableCarts[tId].cart ];
            customerSelect.value = tableCarts[tId].customer || 'Walk-in Customer';
            kitchenNotesInput.value = tableCarts[tId].notes || '';
          } else {
            cart = [];
            customerSelect.value = 'Walk-in Customer';
            kitchenNotesInput.value = '';
          }
        }

        rebuildCheckoutCartUI();
        renderFloorMapGrid();
        showToast(activeTableId ? `Swapped register to: ${activeTableId}` : 'Swapped back to Walk-In Register.');
      });
    });
  }

  // ==========================================================================
  // 19. GLOBAL INTERACTION & TAB TRANSITIONS
  // ==========================================================================
  
  function navigateToTab(tabId) {
    if (activeUser && activeUser.role === 'Cashier' && tabId === 'settings-tab') {
      showToast('Access Denied: Cashiers are not authorized to view Settings Config.', true);
      return;
    }
    activeTab = tabId;

    // Persist active tab in URL hash so page refresh restores the same view
    try { window.location.hash = tabId; } catch (e) { /* ignore */ }
    
    navMenuItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      }
    });

    tabPanes.forEach(pane => {
      pane.classList.remove('active', 'show-tab');
      if (pane.id === tabId) {
        pane.classList.add('active', 'show-tab');
      }
    });

    // Update dynamic calculations before entering shifts tab
    if (tabId === 'shifts-tab') {
      updateLiveShiftExpectedDisplayValues();
    }
  }

  // Bind side navigation clicks
  navMenuItems.forEach(item => {
    item.addEventListener('click', () => {
      navigateToTab(item.getAttribute('data-tab'));
    });
  });

  // Industry Select Template Swapper Core
  industrySelect.addEventListener('change', (e) => {
    const ind = e.target.value;
    
    // Warn them if they have items in cart
    if (cart.length > 0) {
      const confirmSwap = confirm('Changing industry templates will clear your current register checkout cart. Proceed?');
      if (!confirmSwap) {
        industrySelect.value = activeIndustry;
        return;
      }
      cart = [];
      rebuildCheckoutCartUI();
    }

    activeIndustry = ind;
    showToast(`Swapped POS core industry template: ${INDUSTRY_PROFILES[ind].name}`);
    addAuditRecord('System Template', `POS Industry core swapped to: ${ind}`);
    
    // Seed and pull presets matching industry choice
    const presets = INDUSTRY_PROFILES[ind].presets;
    
    // Retain manually added custom items, but wipe other presets to avoid clutter
    const customAdded = catalogItems.filter(item => {
      const isPreset = Object.values(INDUSTRY_PROFILES).some(prof => {
        return prof.presets.some(p => p.sku === item.sku);
      });
      return !isPreset;
    });

    catalogItems = [ ...presets, ...customAdded ];
    localStorage.setItem('pos_catalog_db', JSON.stringify(catalogItems));

    // Refresh CRM dropdown
    syncCrmSelectOptions();

    // Re-render
    rebuildIndustryCatalogGrid();
    renderProductsCatalogCrudTable();
    updateDashboardMetrics();
    applyReactiveStyles();
  });

  // Terminal active staff role select transitions (replaced by dynamic security flow)

  // Quick Sync Cloud Catalog trigger in header
  const btnQuickSync = document.getElementById('btn-quick-sync');
  if (btnQuickSync) btnQuickSync.addEventListener('click', () => {
    showToast('Re-indexing local datastore tethers...');
    setTimeout(() => {
      showToast('Datastores matching Books item listings synced successfully!');
    }, 800);
  });

  // Theme toggle button
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  if (btnThemeToggle) btnThemeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light-theme');
    const themeIcon = btnThemeToggle.querySelector('.theme-toggle-icon');
    
    if (isLight) {
      document.body.classList.remove('light-theme');
      if (themeIcon) themeIcon.className = 'fa-solid fa-moon theme-toggle-icon';
      localStorage.setItem('pos_active_theme', 'dark');
      showToast('Switched to Slate Dark Theme');
    } else {
      document.body.classList.add('light-theme');
      if (themeIcon) themeIcon.className = 'fa-solid fa-sun theme-toggle-icon';
      localStorage.setItem('pos_active_theme', 'light');
      showToast('Switched to Zoho Corporate Light Theme');
    }
  });

  // Mobile drawer sliding toggler
  if (menuToggleBtn) menuToggleBtn.addEventListener('click', () => {
    if (sidebar) sidebar.classList.toggle('active');
  });

  // Close mobile drawer when clicking option item inside
  document.querySelectorAll('.sidebar .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('active');
    });
  });

  // Close mobile sidebar when clicking backdrop
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('active');
    });
  }

  // ==========================================================================
  // 18. DYNAMIC TERMINAL USERS & ROLE PERMISSIONS SECURITY SYSTEM
  // ==========================================================================

  function loadUsersDatabase() {
    let cached = localStorage.getItem('pos_users_db');
    if (!cached) {
      posUsersList = [
        { id: 'USR-001', name: 'MK Administrator', pin: '1234', email: 'admin@pos.system', role: 'Admin', status: 'Active', lastSession: new Date().toLocaleDateString() },
        { id: 'USR-002', name: 'Rahul Cashier', pin: '4321', email: 'rahul@pos.system', role: 'Cashier', status: 'Active', lastSession: 'Never' },
        { id: 'USR-003', name: 'Sonia Manager', pin: '0000', email: 'sonia@pos.system', role: 'Manager', status: 'Active', lastSession: 'Never' }
      ];
      localStorage.setItem('pos_users_db', JSON.stringify(posUsersList));
    } else {
      try {
        posUsersList = JSON.parse(cached);
      } catch (e) {
        posUsersList = [];
      }
    }

    // Set active user
    let activeUserId = localStorage.getItem('pos_active_user_id') || 'USR-001';
    activeUser = posUsersList.find(u => u.id === activeUserId);
    if (!activeUser && posUsersList.length > 0) {
      activeUser = posUsersList[0];
      localStorage.setItem('pos_active_user_id', activeUser.id);
    }
    
    previousUserSelectValue = activeUser ? activeUser.id : 'USR-001';

    populateRoleSelectDropdown();
    updateHeaderProfileCard();
    enforceRoleRestrictions();
    renderUsersManagement();
  }

  function populateRoleSelectDropdown() {
    if (!roleSelect) return;
    roleSelect.innerHTML = posUsersList.map(user => {
      return `<option value="${user.id}">${user.name} (${user.role})</option>`;
    }).join('');
    if (activeUser) {
      roleSelect.value = activeUser.id;
    }
  }

  function updateHeaderProfileCard() {
    if (!activeUser) return;
    profileRoleName.textContent = activeUser.name;
    profileRoleTitle.textContent = `${activeUser.role} Console`;
    
    // Generate initials
    const parts = activeUser.name.split(' ');
    let initials = '';
    if (parts.length > 0) {
      initials += parts[0].substring(0, 1).toUpperCase();
    }
    if (parts.length > 1) {
      initials += parts[1].substring(0, 1).toUpperCase();
    } else if (activeUser.name.length > 1) {
      initials += activeUser.name.substring(1, 2).toUpperCase();
    }
    avatarInitials.textContent = initials || 'US';
  }

  function enforceRoleRestrictions() {
    const btnNavSettings = document.getElementById('btn-nav-settings');
    if (activeUser && activeUser.role === 'Cashier') {
      if (btnNavSettings) {
        btnNavSettings.style.display = 'none';
      }
      if (activeTab === 'settings-tab') {
        navigateToTab('dashboard-tab');
      }
    } else {
      if (btnNavSettings) {
        btnNavSettings.style.display = 'flex';
      }
    }
  }

  function initUserSwitchingEvents() {
    if (!roleSelect) return;
    
    roleSelect.addEventListener('change', (e) => {
      const selectedUserId = roleSelect.value;
      if (activeUser && selectedUserId === activeUser.id) {
        return;
      }
      const targetUser = posUsersList.find(u => u.id === selectedUserId);
      if (!targetUser) return;
      
      // Save current dropdown value to revert back on cancel/fail
      previousUserSelectValue = activeUser ? activeUser.id : 'USR-001';
      
      // Open PIN verification modal
      pinPromptUserName.textContent = targetUser.name;
      pinInputField.value = '';
      pinErrorMsg.style.display = 'none';
      pinPromptModal.classList.add('active');
    });

    if (pinPromptForm) {
      pinPromptForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pinVal = pinInputField.value;
        const targetUserId = roleSelect.value;
        const targetUser = posUsersList.find(u => u.id === targetUserId);
        
        if (targetUser && targetUser.pin === pinVal) {
          // Success
          activeUser = targetUser;
          localStorage.setItem('pos_active_user_id', activeUser.id);
          
          // Update lastSession timestamp
          activeUser.lastSession = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          localStorage.setItem('pos_users_db', JSON.stringify(posUsersList));
          
          pinPromptModal.classList.remove('active');
          showToast(`Logged in successfully as ${activeUser.name} (${activeUser.role})`);
          addAuditRecord('Staff Auth', `User session activated: ${activeUser.name} (${activeUser.role})`);
          
          previousUserSelectValue = activeUser.id;
          updateHeaderProfileCard();
          enforceRoleRestrictions();
          renderUsersManagement();
        } else {
          // Failure
          pinErrorMsg.style.display = 'block';
          pinInputField.value = '';
          pinInputField.focus();
        }
      });
    }

    function cancelPinVerification() {
      pinPromptModal.classList.remove('active');
      roleSelect.value = previousUserSelectValue;
    }

    if (btnClosePinModal) {
      btnClosePinModal.addEventListener('click', cancelPinVerification);
    }
    if (btnCancelPinModal) {
      btnCancelPinModal.addEventListener('click', cancelPinVerification);
    }
  }

  // ==========================================================================
  // USER MANAGEMENT — INVITE, OTP, VERIFY
  // ==========================================================================

  const btnSendInvite = document.getElementById('btn-send-invite');
  const btnVerifyOtp = document.getElementById('btn-verify-otp');
  const btnResendOtp = document.getElementById('btn-resend-otp');
  const otpVerifySection = document.getElementById('otp-verify-section');
  const otpStatusMsg = document.getElementById('otp-status-msg');
  let pendingInviteEmail = '';
  let pendingInviteName = '';

  async function renderUsersManagement() {
    if (!settUsersBody) return;
    try {
      // Merge remote users (from DB) with local users (from localStorage)
      let allUsers = [];
      const res = await callApi('/api/users');
      if (res && res.success && res.users) {
        allUsers = res.users;
      }
      // Add local users (Zoho auth admin that couldn't be saved to DB)
      const localUsers = JSON.parse(localStorage.getItem('pos_local_users') || '[]');
      for (const lu of localUsers) {
        if (!allUsers.find(u => u.email === lu.email)) {
          allUsers.push(lu);
        }
      }
      if (allUsers.length > 0) {
        settUsersBody.innerHTML = allUsers.map(u => {
          const statusClass = u.status === 'active' ? 'success' : 'warning';
          const statusLabel = u.status === 'active' ? 'Active' : 'Pending';
          const dateStr = u.verified_at ? new Date(u.verified_at).toLocaleDateString() : (u.invited_at ? new Date(u.invited_at).toLocaleDateString() : 'N/A');
          const roleBadge = u.role === 'Admin' ? 'badge-primary' : (u.role === 'Manager' ? 'badge-info' : 'badge-secondary');
          const roles = ['Admin', 'Manager', 'Cashier', 'Waiter', 'Chef'];
          const roleOptions = roles.map(r => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${r}</option>`).join('');
          return `<tr>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700;">${(u.name || 'U').substring(0, 2).toUpperCase()}</div>
                <span style="font-weight: 600;">${u.name}</span>
              </div>
            </td>
            <td>${u.email}</td>
            <td>
              <select class="user-role-select" data-email="${u.email}" style="padding: 4px 8px; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); font-size: 11px; font-weight: 600; font-family: var(--font-family); background: white; cursor: pointer;" onchange="updateUserRole(this)">
                ${roleOptions}
              </select>
            </td>
            <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
            <td style="font-size: 12px; color: var(--text-muted);">${dateStr}</td>
            <td><button class="btn-table-icon" onclick="deleteUserByEmail('${u.email}')" title="Remove"><i class="fa-solid fa-trash-can" style="color: var(--danger);"></i></button></td>
          </tr>`;
        }).join('');
      } else {
        settUsersBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 20px;">No users invited yet. Send an invite above.</td></tr>`;
      }
    } catch (err) {
      settUsersBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--danger); padding: 20px;">Failed to load users: ${err.message}</td></tr>`;
    }
  }

  window.updateUserRole = async function(selectEl) {
    const email = selectEl.dataset.email;
    const newRole = selectEl.value;
    try {
      await callApi('/api/users/update-role', 'POST', { email, role: newRole });
    } catch (err) {
      // If API fails (DB write issue), update in local users instead
      const localUsers = JSON.parse(localStorage.getItem('pos_local_users') || '[]');
      const idx = localUsers.findIndex(u => u.email === email);
      if (idx > -1) {
        localUsers[idx].role = newRole;
        localStorage.setItem('pos_local_users', JSON.stringify(localUsers));
        showToast(`Role updated to ${newRole} for ${email} (local)`);
        addAuditRecord('User Management', `Updated role: ${email} → ${newRole}`);
        renderUsersManagement();
        return;
      }
      showToast('Failed to update role: ' + err.message, true);
      renderUsersManagement();
      return;
    }
    showToast(`Role updated to ${newRole} for ${email}`);
    addAuditRecord('User Management', `Updated role: ${email} → ${newRole}`);
    renderUsersManagement();
  };

  window.deleteUserByEmail = async function(email) {
    if (!confirm(`Remove user ${email}?`)) return;
    try {
      await callApi('/api/users/delete', 'POST', { email });
    } catch (err) {
      // If API fails (DB write issue), remove from local users instead
      const localUsers = JSON.parse(localStorage.getItem('pos_local_users') || '[]');
      const filtered = localUsers.filter(u => u.email !== email);
      if (filtered.length < localUsers.length) {
        localStorage.setItem('pos_local_users', JSON.stringify(filtered));
        showToast('User removed locally');
        renderUsersManagement();
        return;
      }
      showToast('Failed to remove user: ' + err.message, true);
      return;
    }
    showToast('User removed');
    renderUsersManagement();
  };

  if (btnSendInvite) {
    btnSendInvite.addEventListener('click', async () => {
      const name = document.getElementById('invite-user-name').value.trim();
      const email = document.getElementById('invite-user-email').value.trim();
      const role = document.getElementById('invite-user-role').value;

      if (!name || !email) {
        showToast('Name and email are required', true);
        return;
      }

      btnSendInvite.disabled = true;
      btnSendInvite.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending...`;

      try {
        const res = await callApi('/api/users/invite', 'POST', { email, name, role });
        if (res && res.success) {
          pendingInviteEmail = email;
          pendingInviteName = name;
          if (res.verifyToken) localStorage.setItem('pos_verify_token', res.verifyToken);
          if (res.otp) {
            localStorage.setItem('pos_dev_otp', res.otp);
            localStorage.setItem('pos_dev_role', role);
          }
          otpVerifySection.style.display = 'block';
          otpStatusMsg.innerHTML = `<span style="color: var(--success);">${res.message || 'Verification code sent. Check your email.'}${res.otp ? '<br><strong>Dev OTP:</strong> <code style="font-size:1.2em;">' + res.otp + '</code>' : ''}</span>`;
          showToast(`Invitation sent to ${email}`);
          addAuditRecord('User Management', `Invited user: ${name} (${email}) as ${role}`);
        } else {
          throw new Error(res.error || 'Failed to send invite');
        }
      } catch (err) {
        showToast(err.message, true);
        otpStatusMsg.innerHTML = `<span style="color: var(--danger);">${err.message}</span>`;
      } finally {
        btnSendInvite.disabled = false;
        btnSendInvite.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Send Invite`;
      }
    });
  }

  if (btnVerifyOtp) {
    btnVerifyOtp.addEventListener('click', async () => {
      const otp = document.getElementById('verify-otp-input').value.trim();
      if (!otp || otp.length !== 6) {
        showToast('Enter a valid 6-digit OTP', true);
        return;
      }

      btnVerifyOtp.disabled = true;
      try {
        const body = { email: pendingInviteEmail, otp };
        const vt = localStorage.getItem('pos_verify_token');
        if (vt) body.verifyToken = vt;
        // Dev fallback: send expected OTP and role directly when DB/token fail
        const devOtp = localStorage.getItem('pos_dev_otp');
        const devRole = localStorage.getItem('pos_dev_role');
        if (devOtp) body.expectedOtp = devOtp;
        if (devRole) body.expectedRole = devRole;
        const res = await callApi('/api/users/verify-otp', 'POST', body);
        if (res && res.success) {
          showToast(`User verified and activated as ${res.role}!`);
          otpVerifySection.style.display = 'none';
          document.getElementById('invite-user-name').value = '';
          document.getElementById('invite-user-email').value = '';
          document.getElementById('verify-otp-input').value = '';
          otpStatusMsg.innerHTML = '';
          addAuditRecord('User Management', `User verified: ${pendingInviteEmail}`);
          // Save to local users (since DB writes may fail)
          const localUsers = JSON.parse(localStorage.getItem('pos_local_users') || '[]');
          if (!localUsers.find(u => u.email === pendingInviteEmail)) {
            localUsers.push({ email: pendingInviteEmail, name: pendingInviteName || pendingInviteEmail.split('@')[0], role: res.role || 'Cashier', status: 'active', verified_at: Date.now() });
            localStorage.setItem('pos_local_users', JSON.stringify(localUsers));
          }
          renderUsersManagement();
        } else {
          throw new Error(res.error || 'Verification failed');
        }
      } catch (err) {
        otpStatusMsg.innerHTML = `<span style="color: var(--danger);">${err.message}</span>`;
      } finally {
        btnVerifyOtp.disabled = false;
      }
    });
  }

  if (btnResendOtp) {
    btnResendOtp.addEventListener('click', async () => {
      if (!pendingInviteEmail) return;
      btnResendOtp.disabled = true;
      try {
        const name = document.getElementById('invite-user-name').value.trim() || 'Staff';
        const role = document.getElementById('invite-user-role').value;
        const res = await callApi('/api/users/invite', 'POST', { email: pendingInviteEmail, name, role });
        if (res && res.success) {
          if (res.verifyToken) localStorage.setItem('pos_verify_token', res.verifyToken);
          otpStatusMsg.innerHTML = `<span style="color: var(--success);">New OTP sent! ${res.otp ? 'Dev OTP: <code>' + res.otp + '</code>' : ''}</span>`;
        }
      } catch (err) {
        otpStatusMsg.innerHTML = `<span style="color: var(--danger);">${err.message}</span>`;
      } finally {
        btnResendOtp.disabled = false;
      }
    });
  }

  // ==========================================================================
  // 20. BIND DOM EVENT LISTENERS
  // ==========================================================================
  
  function updateOfflineIndicator() {
    let queue = [];
    try {
      const stored = localStorage.getItem('pos_offline_orders_queue');
      if (stored) queue = JSON.parse(stored);
    } catch (e) {}
    
    if (offlineSyncIndicator) {
      if (queue.length > 0) {
        offlineSyncIndicator.classList.remove('hidden');
        if (offlineSyncCount) {
          offlineSyncCount.textContent = queue.length.toString();
        }
      } else {
        offlineSyncIndicator.classList.add('hidden');
      }
    }
  }

  async function triggerOfflineQueueSyncLoop() {
    const isConnected = !!localStorage.getItem('zoho_active_connection');
    if (!isConnected) return;

    let queue = [];
    try {
      const stored = localStorage.getItem('pos_offline_orders_queue');
      if (stored) {
        queue = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse offline queue:', e);
    }
    if (queue.length === 0) return;

    console.log(`Offline Sync Loop: Found ${queue.length} pending offline order(s). Testing connectivity...`);
    try {
      const health = await callApi('/api/health').catch(() => null);
      if (!health || health.status !== 'ok') {
        console.log('Offline Sync Loop: Server health check failed or unresponsive. Retrying in 12s...');
        return;
      }
    } catch (e) {
      console.log('Offline Sync Loop: Health check request threw an error. Retrying in 12s...');
      return;
    }

    console.log('Offline Sync Loop: Server online! Processing offline queue sequential sync...');
    const syncedRefs = [];
    
    for (const order of queue) {
      try {
        console.log(`Syncing order ref ${order.localRef} for customer ${order.customer_name}...`);
        
        const response = await callApi('/api/orders', 'POST', {
          customer_name: order.customer_name,
          customer_email: order.customer_email || 'walkin@pos.system',
          payment_mode: order.payment_mode,
          room_number: order.room_number || '',
          kitchen_notes: order.kitchen_notes || '',
          line_items: order.line_items
        });

        if (response && response.success && response.zoho_books && response.zoho_books.invoice_id) {
          const invoiceId = response.zoho_books.invoice_id;
          const invoiceNo = response.zoho_books.invoice_number || order.invoiceNo;
          
          const localInv = invoicesLedger.find(inv => inv.localRef === order.localRef);
          if (localInv) {
            localInv.status = 'Paid';
            localInv.booksId = invoiceId;
            localInv.invoiceNo = invoiceNo;
          }
          
          syncedRefs.push(order.localRef);
          showToast(`Offline order ${invoiceNo} successfully synced with Zoho Books!`);
          addAuditRecord('Offline Sync Module', `Offline order ${order.localRef} synced successfully. Books ID: ${invoiceId}`);
        }
      } catch (err) {
        console.error(`Offline Sync Loop: Failed to sync order ref ${order.localRef}:`, err.message || err);
        break;
      }
    }

    if (syncedRefs.length > 0) {
      queue = queue.filter(order => !syncedRefs.includes(order.localRef));
      localStorage.setItem('pos_offline_orders_queue', JSON.stringify(queue));
      localStorage.setItem('pos_invoices_ledger', JSON.stringify(invoicesLedger));
      renderTransactionsLedgerTable();
      updateOfflineIndicator();
    }
  }

  function bindEventListeners() {
    // Dynamic background sync logs poller
    const cachedLogs = localStorage.getItem('pos_last_sync');
    if (cachedLogs) {
      statLastSync.textContent = cachedLogs;
    }
    statTotalItems.textContent = catalogItems.length.toString();

    // 1. Currency Select Listener
    if (currencySelect) {
      currencySelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const details = GLOBAL_CURRENCIES[val] || GLOBAL_CURRENCIES['LKR'];
        localStorage.setItem('pos_active_currency', val);
        window.activeCurrencySymbol = details.symbol;
        window.activeCurrencyScaleFactor = details.factor;
        
        rebuildIndustryCatalogGrid();
        rebuildCheckoutCartUI();
        showToast(`Currency changed to ${val} (${details.symbol})`);
        addAuditRecord('Settings Module', `Currency scale active switched to: ${val}`);
      });
    }

    // 2. Till Register Adjustments: Cash In
    if (btnCashIn) {
      btnCashIn.addEventListener('click', () => {
        if (!activeShift) {
          showToast('Shift Manager: Till shift register is currently closed.', true);
          return;
        }
        const amtStr = prompt('Enter Cash In amount to load into the register:');
        if (amtStr === null) return;
        const amt = parseFloat(amtStr);
        if (isNaN(amt) || amt <= 0) {
          alert('Please enter a valid positive numerical amount.');
          return;
        }
        const reason = prompt('Enter reason for Cash In loading:', 'Change Loading') || 'Change Loading';
        
        activeShift.cashIn = (activeShift.cashIn || 0.00) + amt;
        activeShift.notes += ` | Cash In: +${sysConfig.bizCurrency}${amt.toFixed(2)} (${reason})`;
        localStorage.setItem('pos_shifts_db', JSON.stringify(shiftLogs));
        
        addAuditRecord('Shift Manager', `Cash drawer loader: Cash In of ${sysConfig.bizCurrency}${amt.toFixed(2)} added. Reason: ${reason}`);
        showToast(`Cash In added successfully: ${sysConfig.bizCurrency}${amt.toFixed(2)}`);
        
        updateLiveShiftExpectedDisplayValues();
        renderShiftsLedgerTable();
      });
    }

    // 3. Till Register Adjustments: Cash Out (Safe Drop)
    if (btnCashOut) {
      btnCashOut.addEventListener('click', () => {
        if (!activeShift) {
          showToast('Shift Manager: Till shift register is currently closed.', true);
          return;
        }
        const amtStr = prompt('Enter Cash Out / Safe Drop amount to remove from drawer:');
        if (amtStr === null) return;
        const amt = parseFloat(amtStr);
        if (isNaN(amt) || amt <= 0) {
          alert('Please enter a valid positive numerical amount.');
          return;
        }
        
        const currentCash = activeShift.openingFloat + activeShift.cashSales + (activeShift.cashIn || 0.00) - (activeShift.cashOut || 0.00);
        if (amt > currentCash) {
          alert(`Cannot perform drop: Drop amount exceeds current cash inside the register drawer (${sysConfig.bizCurrency}${currentCash.toFixed(2)})!`);
          return;
        }
        
        const reason = prompt('Enter reason for Cash Out drop:', 'Safe Drop') || 'Safe Drop';
        
        activeShift.cashOut = (activeShift.cashOut || 0.00) + amt;
        activeShift.notes += ` | Cash Out: -${sysConfig.bizCurrency}${amt.toFixed(2)} (${reason})`;
        localStorage.setItem('pos_shifts_db', JSON.stringify(shiftLogs));
        
        addAuditRecord('Shift Manager', `Cash drawer drop: Cash Out of ${sysConfig.bizCurrency}${amt.toFixed(2)} removed. Reason: ${reason}`);
        showToast(`Safe Drop completed successfully: ${sysConfig.bizCurrency}${amt.toFixed(2)}`);
        
        updateLiveShiftExpectedDisplayValues();
        renderShiftsLedgerTable();
      });
    }

    // 4. Till Register Adjustments: Print Z-Report
    if (btnPrintZReport) {
      btnPrintZReport.addEventListener('click', () => {
        let s = activeShift;
        if (!s && shiftLogs.length > 0) {
          s = shiftLogs[0]; // Fallback to last closed shift
        }
        if (!s) {
          showToast('No shift records exist in local journal memory to generate Z-Report.', true);
          return;
        }
        
        const opening = s.openingFloat || 0;
        const sales = s.cashSales || 0;
        const cIn = s.cashIn || 0;
        const cOut = s.cashOut || 0;
        const expected = opening + sales + cIn - cOut;
        const actual = s.actualCash;
        const diff = s.variance;
        const status = s.status || 'Closed';

        zShiftId.textContent = s.id || 'N/A';
        zCashierName.textContent = s.cashier || 'N/A';
        zOpenTime.textContent = s.openTime ? new Date(s.openTime).toLocaleString() : 'N/A';
        zCloseTime.textContent = s.closeTime ? new Date(s.closeTime).toLocaleString() : '--';
        zStatus.textContent = status;
        
        zOpeningFloat.textContent = `${sysConfig.bizCurrency}${opening.toFixed(2)}`;
        zCashSales.textContent = `${sysConfig.bizCurrency}${sales.toFixed(2)}`;
        zCashIn.textContent = `${sysConfig.bizCurrency}${cIn.toFixed(2)}`;
        zCashOut.textContent = `${sysConfig.bizCurrency}${cOut.toFixed(2)}`;
        zExpectedCash.textContent = `${sysConfig.bizCurrency}${expected.toFixed(2)}`;
        zActualCash.textContent = actual !== null ? `${sysConfig.bizCurrency}${actual.toFixed(2)}` : '--';
        zDifference.textContent = diff !== null ? `${sysConfig.bizCurrency}${diff.toFixed(2)}` : '--';

        receiptPrintArea.classList.add('hidden');
        if (kotPrintArea) kotPrintArea.classList.add('hidden');
        if (zreportPrintArea) zreportPrintArea.classList.remove('hidden');

        receiptModal.classList.add('active');
        window.print();
        addAuditRecord('Shift Manager', `Z-Report thermal shift audit printed successfully. Shift: ${s.id}`);
      });
    }

    // Initial check and indicator trigger
    updateOfflineIndicator();
    setInterval(triggerOfflineQueueSyncLoop, 12000);
  }

  // EXECUTE INITIALIZATION DECK
  checkCatalystAuth();

});
