/**
 * Site-specific scraper configurations
 * Each website has a template workflow that AI can adapt
 */

import { Workflow } from '@mytypes/index'

/**
 * AutoZone parts search workflow template
 */
export const autoZoneTemplate: Workflow = {
  id: 'template-autozone',
  domain: 'autozone.com',
  path: '/jobs/part-search',
  version: 1,
  steps: [
    {
      type: 'navigate',
      url: 'https://www.autozone.com',
      waitForNavigation: false,
    },
    {
      type: 'wait',
      ms: 2000,
    },
    {
      type: 'click',
      selector: '[data-testid="start-here-button"]',
      delay: 500,
    },
    {
      type: 'input',
      selector: 'input[placeholder*="Year"]',
      valueKey: 'year',
      clearFirst: true,
    },
    {
      type: 'wait',
      ms: 1000,
    },
    {
      type: 'click',
      selector: '.year-option[data-year]',
    },
    {
      type: 'input',
      selector: 'input[placeholder*="Make"]',
      valueKey: 'make',
      clearFirst: true,
    },
    {
      type: 'wait',
      ms: 1000,
    },
    {
      type: 'click',
      selector: '.make-option[data-make]',
    },
    {
      type: 'input',
      selector: 'input[placeholder*="Model"]',
      valueKey: 'model',
      clearFirst: true,
    },
    {
      type: 'wait',
      ms: 1000,
    },
    {
      type: 'click',
      selector: '.model-option[data-model]',
    },
    {
      type: 'input',
      selector: 'input[placeholder*="earch"]',
      valueKey: 'part',
      clearFirst: true,
    },
    {
      type: 'wait',
      ms: 500,
    },
    {
      type: 'click',
      selector: 'button:is(:has-text("Search"), [type="submit"])',
      waitForNavigation: true,
    },
    {
      type: 'wait',
      ms: 2000,
    },
    {
      type: 'extract',
      selector: '[data-component="ProductCard"]',
      key: 'parts',
      multiple: true,
    },
  ],
  selectors: {
    startButton: '[data-testid="start-here-button"]',
    yearInput: 'input[placeholder*="Year"]',
    makeInput: 'input[placeholder*="Make"]',
    modelInput: 'input[placeholder*="Model"]',
    partInput: 'input[placeholder*="earch"]',
    searchButton: 'button:is(:has-text("Search"), [type="submit"])',
    partCards: '[data-component="ProductCard"]',
    price: '.price',
    productName: '.product-name',
    productUrl: 'a.product-link',
  },
  validationRules: [
    {
      key: 'parts',
      required: true,
      type: 'array',
    },
    {
      key: 'price',
      required: true,
      type: 'number',
      pattern: /^\d+(\.\d{2})?$/,
    },
    {
      key: 'productName',
      required: true,
      type: 'string',
    },
  ],
  successRate: 0,
  totalRuns: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

/**
 * O'Reilly Auto parts search workflow template
 */
export const oreillyTemplate: Workflow = {
  id: 'template-oreilly',
  domain: 'oreillyauto.com',
  path: '/jobs/part-search',
  version: 1,
  steps: [
    {
      type: 'navigate',
      url: 'https://www.oreillyauto.com',
    },
    {
      type: 'wait',
      ms: 2000,
    },
    {
      type: 'click',
      selector: '.garage-start',
    },
    {
      type: 'input',
      selector: '#add-year',
      valueKey: 'year',
    },
    {
      type: 'wait',
      ms: 1000,
    },
    {
      type: 'click',
      selector: '.years-list li',
    },
    {
      type: 'input',
      selector: '#add-make',
      valueKey: 'make',
    },
    {
      type: 'wait',
      ms: 1000,
    },
    {
      type: 'click',
      selector: '.makes-list li',
    },
    {
      type: 'input',
      selector: '#add-model',
      valueKey: 'model',
    },
    {
      type: 'wait',
      ms: 1000,
    },
    {
      type: 'click',
      selector: '.models-list li',
    },
    {
      type: 'input',
      selector: '.search-input',
      valueKey: 'part',
    },
    {
      type: 'click',
      selector: '.search-button',
      waitForNavigation: true,
    },
    {
      type: 'wait',
      ms: 2000,
    },
    {
      type: 'extract',
      selector: '.product-item',
      key: 'parts',
      multiple: true,
    },
  ],
  selectors: {
    garageStart: '.garage-start',
    yearInput: '#add-year',
    makeInput: '#add-make',
    modelInput: '#add-model',
    partInput: '.search-input',
    searchButton: '.search-button',
    productItems: '.product-item',
    price: '.price',
    partTitle: '.part-title',
  },
  validationRules: [
    {
      key: 'parts',
      required: true,
      type: 'array',
    },
    {
      key: 'price',
      required: true,
      type: 'number',
    },
  ],
  successRate: 0,
  totalRuns: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

/**
 * NAPA parts search workflow template
 */
export const napaTemplate: Workflow = {
  id: 'template-napa',
  domain: 'napaonline.com',
  path: '/jobs/part-search',
  version: 1,
  steps: [
    {
      type: 'navigate',
      url: 'https://www.napaonline.com',
    },
    {
      type: 'wait',
      ms: 2000,
    },
    {
      type: 'input',
      selector: '#year',
      valueKey: 'year',
    },
    {
      type: 'wait',
      ms: 500,
    },
    {
      type: 'input',
      selector: '#make',
      valueKey: 'make',
    },
    {
      type: 'wait',
      ms: 500,
    },
    {
      type: 'input',
      selector: '#model',
      valueKey: 'model',
    },
    {
      type: 'wait',
      ms: 500,
    },
    {
      type: 'input',
      selector: '#search-box',
      valueKey: 'part',
    },
    {
      type: 'click',
      selector: '.search-button',
      waitForNavigation: true,
    },
    {
      type: 'wait',
      ms: 2000,
    },
    {
      type: 'extract',
      selector: '.product-listing',
      key: 'parts',
      multiple: true,
    },
  ],
  selectors: {
    yearInput: '#year',
    makeInput: '#make',
    modelInput: '#model',
    partInput: '#search-box',
    searchButton: '.search-button',
    productListings: '.product-listing',
    price: '.product-price',
    partName: '.product-name',
  },
  validationRules: [
    {
      key: 'parts',
      required: true,
      type: 'array',
    },
  ],
  successRate: 0,
  totalRuns: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

/**
 * Advance Auto Parts search workflow template
 */
export const advanceAutoTemplate: Workflow = {
  id: 'template-advanceauto',
  domain: 'advanceautoparts.com',
  path: '/jobs/part-search',
  version: 1,
  steps: [
    {
      type: 'navigate',
      url: 'https://www.advanceautoparts.com',
    },
    {
      type: 'wait',
      ms: 2000,
    },
    {
      type: 'click',
      selector: '.vehicle-selector',
    },
    {
      type: 'input',
      selector: 'input[name="year"]',
      valueKey: 'year',
    },
    {
      type: 'wait',
      ms: 1000,
    },
    {
      type: 'input',
      selector: 'input[name="make"]',
      valueKey: 'make',
    },
    {
      type: 'wait',
      ms: 1000,
    },
    {
      type: 'input',
      selector: 'input[name="model"]',
      valueKey: 'model',
    },
    {
      type: 'wait',
      ms: 1000,
    },
    {
      type: 'input',
      selector: '.search-box',
      valueKey: 'part',
    },
    {
      type: 'click',
      selector: '.search-submit',
      waitForNavigation: true,
    },
    {
      type: 'wait',
      ms: 2000,
    },
    {
      type: 'extract',
      selector: '.product-result',
      key: 'parts',
      multiple: true,
    },
  ],
  selectors: {
    vehicleSelector: '.vehicle-selector',
    yearInput: 'input[name="year"]',
    makeInput: 'input[name="make"]',
    modelInput: 'input[name="model"]',
    searchBox: '.search-box',
    searchSubmit: '.search-submit',
    productResults: '.product-result',
    price: '.product-price',
    productTitle: '.product-title',
  },
  validationRules: [
    {
      key: 'parts',
      required: true,
      type: 'array',
    },
  ],
  successRate: 0,
  totalRuns: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

/**
 * Alldata labor lookup workflow template
 */
export const alldataTemplate: Workflow = {
  id: 'template-alldata',
  domain: 'alldatadiy.com',
  path: '/manuals/labor-time',
  version: 1,
  steps: [
    {
      type: 'navigate',
      url: 'https://www.alldatadiy.com',
    },
    {
      type: 'wait',
      ms: 2000,
    },
    {
      type: 'input',
      selector: 'input[placeholder*="Year"]',
      valueKey: 'year',
    },
    {
      type: 'wait',
      ms: 1000,
    },
    {
      type: 'input',
      selector: 'input[placeholder*="Make"]',
      valueKey: 'make',
    },
    {
      type: 'wait',
      ms: 1000,
    },
    {
      type: 'input',
      selector: 'input[placeholder*="Model"]',
      valueKey: 'model',
    },
    {
      type: 'wait',
      ms: 1000,
    },
    {
      type: 'input',
      selector: '.job-search',
      valueKey: 'laborTask',
    },
    {
      type: 'click',
      selector: '.search-proceed',
      waitForNavigation: true,
    },
    {
      type: 'wait',
      ms: 3000,
    },
    {
      type: 'extract',
      selector: '.labor-time-result',
      key: 'labor',
    },
  ],
  selectors: {
    yearInput: 'input[placeholder*="Year"]',
    makeInput: 'input[placeholder*="Make"]',
    modelInput: 'input[placeholder*="Model"]',
    jobSearch: '.job-search',
    searchProceed: '.search-proceed',
    laborResult: '.labor-time-result',
    laborHours: '.labor-hours',
    jobDescription: '.job-description',
  },
  validationRules: [
    {
      key: 'labor',
      required: true,
      type: 'object',
    },
    {
      key: 'laborHours',
      required: true,
      type: 'number',
    },
  ],
  successRate: 0,
  totalRuns: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const siteTemplates = {
  'autozone.com': autoZoneTemplate,
  'oreillyauto.com': oreillyTemplate,
  'napaonline.com': napaTemplate,
  'advanceautoparts.com': advanceAutoTemplate,
  'alldatadiy.com': alldataTemplate,
}
