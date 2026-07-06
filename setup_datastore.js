/**
 * Catalyst Datastore Table Setup Script
 * 
 * Run this script to verify your tables exist. If they don't,
 * create them manually in the Catalyst Console:
 *   https://console.catalyst.zoho.com → Your Project → Data Store → Create Table
 * 
 * Usage: node setup_datastore.js
 */

const catalyst = require('zcatalyst-sdk-node');
const axios = require('axios');

// Table definitions from your datastore_schema.json
const REQUIRED_TABLES = [
  {
    name: 'Items',
    description: 'Caches product and service items synced from Zoho Books',
    columns: [
      { name: 'books_item_id', type: 'Text', max_length: 100, mandatory: true },
      { name: 'name', type: 'Text', max_length: 255, mandatory: true },
      { name: 'rate', type: 'Double', mandatory: true },
      { name: 'sku', type: 'Text', max_length: 100 },
      { name: 'tax_id', type: 'Text', max_length: 100 },
      { name: 'tax_percentage', type: 'Double', default_value: '0.0' },
      { name: 'stock', type: 'Double', default_value: '999.0' },
      { name: 'category', type: 'Text', max_length: 100, default_value: 'General' },
      { name: 'org_id', type: 'Text', max_length: 100 }
    ]
  },
  {
    name: 'Orders',
    description: 'Records POS checkouts linked to Zoho Books invoices',
    columns: [
      { name: 'customer_name', type: 'Text', max_length: 255, mandatory: true },
      { name: 'customer_email', type: 'Text', max_length: 255 },
      { name: 'subtotal', type: 'Double', mandatory: true },
      { name: 'tax_amount', type: 'Double', mandatory: true },
      { name: 'total', type: 'Double', mandatory: true },
      { name: 'payment_mode', type: 'Text', max_length: 50, mandatory: true },
      { name: 'status', type: 'Text', max_length: 50, default_value: 'Synced' },
      { name: 'books_invoice_id', type: 'Text', max_length: 100 },
      { name: 'org_id', type: 'Text', max_length: 100 }
    ]
  },
  {
    name: 'OrderItems',
    description: 'Stores individual line items associated with orders',
    columns: [
      { name: 'order_id', type: 'Text', max_length: 100, mandatory: true },
      { name: 'item_id', type: 'Text', max_length: 100, mandatory: true },
      { name: 'quantity', type: 'Double', mandatory: true },
      { name: 'rate', type: 'Double', mandatory: true }
    ]
  },
  {
    name: 'Configurations',
    description: 'Stores OAuth credentials, theme settings, and user data',
    columns: [
      { name: 'config_key', type: 'Text', max_length: 100, mandatory: true, unique: true },
      { name: 'config_value', type: 'Text', max_length: 1000 }
    ]
  }
];

async function checkTables() {
  console.log('Checking Datastore table status...\n');

  for (const table of REQUIRED_TABLES) {
    try {
      const catalystApp = catalyst.initialize();
      const result = await catalystApp.zcql().executeZCQLQuery(`SELECT ROWID FROM ${table.name} LIMIT 1`);
      console.log(`✅ ${table.name} - EXISTS (${result.length} sample rows)`);
    } catch (err) {
      console.log(`❌ ${table.name} - MISSING (${err.message})`);
      console.log(`   → Create manually in Catalyst Console:`);
      console.log(`     1. Go to https://console.catalyst.zoho.com`);
      console.log(`     2. Select your POS project`);
      console.log(`     3. Go to Data Store → Create Table`);
      console.log(`     4. Table name: "${table.name}"`);
      console.log(`     5. Add columns:`);
      for (const col of table.columns) {
        const mandatory = col.mandatory ? ' (Required)' : '';
        const unique = col.unique ? ' (Unique)' : '';
        const maxLen = col.max_length ? ` [Max: ${col.max_length}]` : '';
        console.log(`        - ${col.name}: ${col.type}${maxLen}${mandatory}${unique}`);
      }
      console.log('');
    }
  }
}

checkTables().catch(console.error);
