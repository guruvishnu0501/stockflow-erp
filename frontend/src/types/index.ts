export type UserRole = 'Admin' | 'Procurement Manager' | 'Sales Manager' | 'Inventory Manager';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Overstock';

export interface Category {
  id: number;
  code: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Material {
  id: number;
  material_code: string;
  name: string;
  description?: string;
  category_id?: number;
  category_name?: string;
  subcategory?: string;
  sku: string;
  uom: string;
  purchase_price: number;
  selling_price: number;
  tax_rate: number;
  min_stock_level: number;
  max_stock_level: number;
  reorder_level: number;
  default_warehouse_id?: number;
  warehouse_name?: string;
  primary_vendor_id?: number;
  vendor_name?: string;
  is_active: boolean;
  total_stock: number;
  stock_status: StockStatus;
  created_at: string;
  updated_at: string;
}

export type PartnerStatus = 'Active' | 'Inactive' | 'Blocked';

export interface Vendor {
  id: number;
  code: string;
  company_name: string;
  contact_person?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  tax_id?: string;
  payment_terms: string;
  status: PartnerStatus;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  code: string;
  customer_name: string;
  contact_person?: string;
  company_name?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  tax_id?: string;
  credit_limit: number;
  payment_terms: string;
  status: PartnerStatus;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  location: string;
  manager_name?: string;
  capacity: number;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  batch_number?: string;
  uom: string;
  updated_at: string;
}

export type MovementType =
  | 'Goods Receipt'
  | 'Goods Issue'
  | 'Sales'
  | 'Purchase'
  | 'Return'
  | 'Adjustment'
  | 'Transfer';

export interface StockMovement {
  id: number;
  movement_type: MovementType;
  material_id: number;
  material_code: string;
  material_name: string;
  warehouse_id: number;
  warehouse_name: string;
  dest_warehouse_id?: number;
  dest_warehouse_name?: string;
  quantity: number;
  balance_after: number;
  batch_number?: string;
  reference_type?: string;
  reference_id?: string;
  reason?: string;
  notes?: string;
  username?: string;
  created_at: string;
}

export type PRStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Converted to PO';
export type PRPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface PRItem {
  id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  uom: string;
  quantity: number;
  estimated_unit_price: number;
  notes?: string;
}

export interface PurchaseRequisition {
  id: number;
  pr_number: string;
  requested_by_id: number;
  requested_by_name: string;
  department: string;
  status: PRStatus;
  priority: PRPriority;
  request_date: string;
  required_date: string;
  reason?: string;
  items: PRItem[];
  created_at: string;
  updated_at: string;
}

export type POStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Sent to Vendor'
  | 'Partially Received'
  | 'Fully Received'
  | 'Cancelled';

export interface POItem {
  id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  uom: string;
  quantity: number;
  received_quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  line_total: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_id: number;
  vendor_name: string;
  pr_id?: number;
  created_by_id: number;
  created_by_name: string;
  po_date: string;
  expected_delivery_date: string;
  currency: string;
  payment_terms: string;
  shipping_address: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: POStatus;
  notes?: string;
  items: POItem[];
  created_at: string;
  updated_at: string;
}

export interface GoodsReceiptItem {
  id: number;
  po_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  uom: string;
  received_quantity: number;
  rejected_quantity: number;
  batch_number?: string;
  notes?: string;
}

export interface GoodsReceipt {
  id: number;
  gr_number: string;
  po_id: number;
  po_number: string;
  vendor_id: number;
  vendor_name: string;
  warehouse_id: number;
  warehouse_name: string;
  receipt_date: string;
  received_by_id: number;
  received_by_name: string;
  notes?: string;
  items: GoodsReceiptItem[];
  created_at: string;
}

export type SOStatus =
  | 'Draft'
  | 'Confirmed'
  | 'Processing'
  | 'Partially Delivered'
  | 'Delivered'
  | 'Cancelled';

export interface SOItem {
  id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  uom: string;
  quantity: number;
  delivered_quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  line_total: number;
}

export interface SalesOrder {
  id: number;
  so_number: string;
  customer_id: number;
  customer_name: string;
  created_by_id: number;
  created_by_name: string;
  order_date: string;
  requested_delivery_date: string;
  shipping_address: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: SOStatus;
  notes?: string;
  items: SOItem[];
  created_at: string;
  updated_at: string;
}

export type DeliveryStatus = 'Pending' | 'Picking' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface DeliveryItem {
  id: number;
  so_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  uom: string;
  quantity: number;
  batch_number?: string;
}

export interface Delivery {
  id: number;
  delivery_number: string;
  so_id: number;
  so_number: string;
  customer_id: number;
  customer_name: string;
  warehouse_id: number;
  warehouse_name: string;
  delivery_date: string;
  status: DeliveryStatus;
  shipping_notes?: string;
  created_by_id: number;
  created_by_name: string;
  items: DeliveryItem[];
  created_at: string;
  updated_at: string;
}

export type InvoiceType = 'Sales' | 'Purchase';
export type PaymentStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue';

export interface InvoiceItem {
  id: number;
  material_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

export interface Payment {
  id: number;
  payment_number: string;
  invoice_id: number;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  invoice_type: InvoiceType;
  customer_id?: number;
  customer_name?: string;
  vendor_id?: number;
  vendor_name?: string;
  reference_type?: string;
  reference_id?: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_status: PaymentStatus;
  notes?: string;
  items: InvoiceItem[];
  payments: Payment[];
  created_at: string;
  updated_at: string;
}

export interface AlertItem {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  link?: string;
  created_at?: string;
}

export interface DashboardData {
  total_products: number;
  total_inventory_value: number;
  total_stock_quantity: number;
  low_stock_items_count: number;
  pending_po_count: number;
  pending_so_count: number;
  total_vendors: number;
  total_customers: number;
  today_sales: number;
  monthly_sales: number;
  monthly_purchases: number;
  gross_revenue: number;
  monthly_sales_chart: Array<{ month: string; sales: number; purchases: number }>;
  sales_vs_purchases_chart: Array<{ month: string; sales: number; purchases: number }>;
  inventory_by_category_chart: Array<{ name: string; value: number; quantity: number }>;
  top_selling_products: Array<{
    material_id: number;
    material_code: string;
    material_name: string;
    quantity_sold: number;
    revenue: number;
  }>;
  low_stock_products: Array<{
    material_id: number;
    material_code: string;
    material_name: string;
    current_stock: number;
    min_stock_level: number;
    reorder_level: number;
    uom: string;
    status: string;
  }>;
  recent_purchase_orders: Array<{
    id: number;
    po_number: string;
    vendor_name: string;
    po_date: string;
    total_amount: number;
    status: string;
  }>;
  recent_sales_orders: Array<{
    id: number;
    so_number: string;
    customer_name: string;
    order_date: string;
    total_amount: number;
    status: string;
  }>;
  recent_stock_movements: Array<{
    id: number;
    movement_type: string;
    material_name: string;
    quantity: number;
    reference_id?: string;
    created_at: string;
  }>;
  recent_invoices: Array<{
    id: number;
    invoice_number: string;
    invoice_type: string;
    party_name: string;
    total_amount: number;
    payment_status: string;
  }>;
  alerts: AlertItem[];
}

export interface AuditLog {
  id: number;
  user_id?: number;
  username: string;
  action: string;
  module: string;
  record_id?: string;
  description: string;
  old_values?: string;
  new_values?: string;
  ip_address?: string;
  created_at: string;
}
