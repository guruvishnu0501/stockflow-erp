from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.warehouse import Warehouse, WarehouseStatus
from app.models.partner import Vendor, Customer, PartnerStatus
from app.models.material import Category, Material
from app.models.inventory import Inventory, StockMovement, MovementType
from app.models.purchase import (
    PurchaseRequisition, PurchaseRequisitionItem, PRStatus, PRPriority,
    PurchaseOrder, PurchaseOrderItem, POStatus,
    GoodsReceipt, GoodsReceiptItem
)
from app.models.sales import (
    SalesOrder, SalesOrderItem, SOStatus,
    Delivery, DeliveryItem, DeliveryStatus
)
from app.models.invoice import Invoice, InvoiceItem, InvoiceType, Payment, PaymentStatus
from app.models.audit import AuditLog
from app.core.security import get_password_hash

def seed_database(db: Session):
    # Check if data already exists
    if db.query(User).first():
        print("Database already seeded. Skipping initial seed.")
        return

    print("Seeding initial ERP master and transaction data...")

    # 1. USERS
    users = [
        User(
            email="admin@stockflow.com",
            username="admin",
            full_name="Alexander Vance (Admin)",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            department="Executive Management",
            is_active=True
        ),
        User(
            email="procurement@stockflow.com",
            username="procure_mgr",
            full_name="Sarah Jenkins (Procurement Mgr)",
            hashed_password=get_password_hash("procure123"),
            role=UserRole.PROCUREMENT_MANAGER,
            department="Procurement & Sourcing",
            is_active=True
        ),
        User(
            email="sales@stockflow.com",
            username="sales_mgr",
            full_name="David Chen (Sales Mgr)",
            hashed_password=get_password_hash("sales123"),
            role=UserRole.SALES_MANAGER,
            department="Global Sales & Distribution",
            is_active=True
        ),
        User(
            email="inventory@stockflow.com",
            username="inv_mgr",
            full_name="Marcus Brody (Inventory Mgr)",
            hashed_password=get_password_hash("inv123"),
            role=UserRole.INVENTORY_MANAGER,
            department="Warehouse & Logistics",
            is_active=True
        )
    ]
    db.add_all(users)
    db.commit()
    admin_user = users[0]
    procure_user = users[1]
    sales_user = users[2]
    inv_user = users[3]

    # 2. WAREHOUSES
    warehouses = [
        Warehouse(code="WH-CDC", name="Central Distribution Center", location="Chicago, IL, USA", manager_name="Marcus Brody", capacity=50000, status=WarehouseStatus.ACTIVE),
        Warehouse(code="WH-WCF", name="West Coast Fulfillment Hub", location="Oakland, CA, USA", manager_name="Elena Rostova", capacity=30000, status=WarehouseStatus.ACTIVE),
        Warehouse(code="WH-ECL", name="East Coast Logistics Depot", location="Newark, NJ, USA", manager_name="Travis Scott", capacity=25000, status=WarehouseStatus.ACTIVE)
    ]
    db.add_all(warehouses)
    db.commit()
    wh_main = warehouses[0]
    wh_west = warehouses[1]
    wh_east = warehouses[2]

    # 3. CATEGORIES
    categories = [
        Category(code="CAT-ELEC", name="Microcontrollers & Embedded", description="SoCs, MCU boards, development kits and chips"),
        Category(code="CAT-SENS", name="Sensors & Transducers", description="Industrial environmental, optical and inertial sensors"),
        Category(code="CAT-AUTO", name="Automation & Robotics", description="Actuators, motor drivers, PLCs, and control units"),
        Category(code="CAT-RAWM", name="Metals & Enclosures", description="Aluminum chassis, extruded profiles, raw sheets"),
        Category(code="CAT-PASS", name="Passive Components & Cables", description="Capacitors, inductors, harness assemblies, connectors")
    ]
    db.add_all(categories)
    db.commit()

    # 4. VENDORS (>= 10 vendors)
    vendors_data = [
        ("VEN-1001", "ABC Electronics Corp", "Alice Cooper", "sales@abcelectronics.com", "+1-555-0101", "100 Silicon Way", "San Jose", "CA", "USA", "US-GST-9921", "Net 30"),
        ("VEN-1002", "Apex Silicon Solutions", "Brian Miller", "orders@apexsilicon.com", "+1-555-0102", "420 Micro Blvd", "Austin", "TX", "USA", "US-GST-4412", "Net 45"),
        ("VEN-1003", "Global Metals & Alloys", "Carlos Gomez", "contact@globalmetals.com", "+1-555-0103", "88 Industrial Pkwy", "Pittsburgh", "PA", "USA", "US-GST-7719", "Net 30"),
        ("VEN-1004", "Techtronics Component Supply", "Diana Ross", "procure@techtronics.com", "+1-555-0104", "12 Semiconductor Dr", "Phoenix", "AZ", "USA", "US-GST-3301", "Net 60"),
        ("VEN-1005", "Precision Fasteners & Hardware", "Edward Norton", "sales@precisionfasteners.com", "+1-555-0105", "300 Assembly Rd", "Detroit", "MI", "USA", "US-GST-8820", "Net 30"),
        ("VEN-1006", "MegaPacks Packaging Solutions", "Fiona Gallagher", "supply@megapacks.com", "+1-555-0106", "75 Container Way", "Memphis", "TN", "USA", "US-GST-1294", "Net 15"),
        ("VEN-1007", "Delta Sensors & Instrumentation", "George Clark", "info@deltasensors.com", "+1-555-0107", "50 Precision Ave", "Boston", "MA", "USA", "US-GST-6644", "Net 30"),
        ("VEN-1008", "Nordic Polymer Materials", "Hanna Lind", "orders@nordicpolymers.com", "+1-555-0108", "99 Polymer St", "Seattle", "WA", "USA", "US-GST-5511", "Net 45"),
        ("VEN-1009", "Titan Dynamics Motors", "Ian Wright", "sales@titandynamics.com", "+1-555-0109", "210 Kinetic Blvd", "Cleveland", "OH", "USA", "US-GST-2234", "Net 30"),
        ("VEN-1010", "Quantum Interconnects & Cables", "Julia Roberts", "b2b@quantumcables.com", "+1-555-0110", "15 Wire Loop", "Atlanta", "GA", "USA", "US-GST-8841", "Net 30")
    ]
    vendors = []
    for code, name, contact, email, phone, addr, city, state, country, tax, terms in vendors_data:
        v = Vendor(code=code, company_name=name, contact_person=contact, email=email, phone=phone, address=addr, city=city, state=state, country=country, tax_id=tax, payment_terms=terms, status=PartnerStatus.ACTIVE)
        vendors.append(v)
    db.add_all(vendors)
    db.commit()

    # 5. CUSTOMERS (>= 15 customers)
    customers_data = [
        ("CUST-2001", "Tech Solutions Pvt Ltd", "Rajesh Patel", "billing@techsolutions.com", "+1-555-1101", "500 Innovation Park", "San Jose", "CA", "USA", "GST-CUST-01", 150000.0, "Net 30"),
        ("CUST-2002", "OmniTech Robotics Systems", "Laura Croft", "accounts@omnitech.com", "+1-555-1102", "120 Cyber Way", "Pittsburgh", "PA", "USA", "GST-CUST-02", 200000.0, "Net 45"),
        ("CUST-2003", "Summit Manufacturing Group", "Michael Chang", "purchasing@summitmfg.com", "+1-555-1103", "340 Industrial Loop", "Chicago", "IL", "USA", "GST-CUST-03", 250000.0, "Net 30"),
        ("CUST-2004", "Horizon Automation Labs", "Natalie Portman", "ops@horizonauto.com", "+1-555-1104", "780 Robot Rd", "Detroit", "MI", "USA", "GST-CUST-04", 100000.0, "Net 30"),
        ("CUST-2005", "Zenith Aerospace Engineering", "Oscar Isaac", "finance@zenithaero.com", "+1-555-1105", "990 Flight Path", "Seattle", "WA", "USA", "GST-CUST-05", 500000.0, "Net 60"),
        ("CUST-2006", "Stellar Medical Devices", "Patricia Arquette", "supplies@stellarmed.com", "+1-555-1106", "40 Bio Medical Dr", "Boston", "MA", "USA", "GST-CUST-06", 180000.0, "Net 30"),
        ("CUST-2007", "Vanguard Logistics Automation", "Quinn Fabray", "invoices@vanguardlogistics.com", "+1-555-1107", "310 Depot St", "Memphis", "TN", "USA", "GST-CUST-07", 120000.0, "Net 30"),
        ("CUST-2008", "BluePeak Renewable Energy", "Richard Madden", "ap@bluepeakenergy.com", "+1-555-1108", "600 Solar Ave", "Denver", "CO", "USA", "GST-CUST-08", 300000.0, "Net 45"),
        ("CUST-2009", "HyperDrive Systems", "Sophia Bush", "accounts@hyperdrivesys.com", "+1-555-1109", "80 Mobility Blvd", "Austin", "TX", "USA", "GST-CUST-09", 220000.0, "Net 30"),
        ("CUST-2010", "Nova Mechatronics", "Thomas Hardy", "procure@novamecha.com", "+1-555-1110", "22 Motor Park", "Columbus", "OH", "USA", "GST-CUST-10", 90000.0, "Net 30"),
        ("CUST-2011", "CyberCore Computing Labs", "Uma Thurman", "billing@cybercorelabs.com", "+1-555-1111", "101 Data Center Way", "Dallas", "TX", "USA", "GST-CUST-11", 160000.0, "Net 30"),
        ("CUST-2012", "Prime Industrial Automation", "Victor Stone", "payables@primeind.com", "+1-555-1112", "45 Factory St", "Cleveland", "OH", "USA", "GST-CUST-12", 140000.0, "Net 30"),
        ("CUST-2013", "Atlas Dynamics Robotics", "Wanda Maximoff", "orders@atlasdyn.com", "+1-555-1113", "90 Research Dr", "Cambridge", "MA", "USA", "GST-CUST-13", 350000.0, "Net 45"),
        ("CUST-2014", "Pulse Electronics OEM", "Xavier Dolan", "contact@pulseelec.com", "+1-555-1114", "180 Assembly Way", "San Diego", "CA", "USA", "GST-CUST-14", 130000.0, "Net 30"),
        ("CUST-2015", "Vertex Networks & Comms", "Yvonne Strahovski", "invoices@vertexnetworks.com", "+1-555-1115", "52 Telecom Blvd", "Atlanta", "GA", "USA", "GST-CUST-15", 210000.0, "Net 30")
    ]
    customers = []
    for code, name, contact, email, phone, addr, city, state, country, tax, credit, terms in customers_data:
        c = Customer(code=code, customer_name=name, company_name=name, contact_person=contact, email=email, phone=phone, address=addr, city=city, state=state, country=country, tax_id=tax, credit_limit=credit, payment_terms=terms, status=PartnerStatus.ACTIVE)
        customers.append(c)
    db.add_all(customers)
    db.commit()

    # 6. MATERIALS (>= 30 materials)
    materials_specs = [
        # Microcontrollers
        ("MAT-1001", "ESP32-WROOM-32D Development Board", "Dual-core 240MHz Wi-Fi & Bluetooth microcontroller module", 1, "Dev Boards", "SKU-ESP32-32D", "PC", 4.50, 9.99, 18.0, 50.0, 2000.0, 100.0, 1, 1),
        ("MAT-1002", "STM32F401 Black Pill MCU Board", "ARM Cortex-M4 84MHz 32-bit development board", 1, "Dev Boards", "SKU-STM32-F401", "PC", 3.80, 8.50, 18.0, 40.0, 1500.0, 80.0, 1, 1),
        ("MAT-1003", "Raspberry Pi RP2040 Chip Dual-Core", "Dual ARM Cortex-M0+ silicon microcontroller IC", 1, "Chips", "SKU-RP2040-IC", "PC", 0.90, 2.20, 18.0, 200.0, 5000.0, 400.0, 1, 2),
        ("MAT-1004", "ATmega328P-PU DIP-28 Microcontroller", "8-bit AVR RISC microcontroller standard IC", 1, "Chips", "SKU-ATM328P-DIP", "PC", 1.80, 4.25, 18.0, 100.0, 3000.0, 250.0, 1, 2),
        ("MAT-1005", "Arduino Nano Every 4808 Clone", "Compact embedded breadboard module 20MHz", 1, "Dev Boards", "SKU-ARD-NANO-EV", "PC", 5.20, 12.00, 18.0, 30.0, 1000.0, 75.0, 1, 1),
        ("MAT-1006", "Nordic nRF52840 BLE 5.0 Module", "Advanced Bluetooth Low Energy multi-protocol SoC", 1, "Wireless", "SKU-NRF-52840", "PC", 6.50, 15.50, 18.0, 40.0, 1200.0, 90.0, 1, 2),
        
        # Sensors
        ("MAT-1007", "BME280 Environmental Sensor Module", "Digital Barometric Pressure, Temperature and Humidity sensor", 2, "Climate", "SKU-BME280-MOD", "PC", 3.20, 7.50, 18.0, 60.0, 1500.0, 120.0, 1, 7),
        ("MAT-1008", "MPU-6050 6-Axis Gyro & Accelerometer", "Motion tracking I2C MEMS sensor module", 2, "Motion", "SKU-MPU6050-6AX", "PC", 1.40, 3.80, 18.0, 100.0, 2500.0, 200.0, 1, 7),
        ("MAT-1009", "VL53L0X Time-of-Flight Laser Distance", "Laser-ranging sensor module 2m range I2C", 2, "Optical", "SKU-VL53L0X-TOF", "PC", 4.10, 9.20, 18.0, 35.0, 1000.0, 70.0, 1, 7),
        ("MAT-1010", "MAX30102 High-Sensitivity Pulse Oximeter", "Heart-rate and pulse oximetry optical sensor module", 2, "Biometric", "SKU-MAX30102-BIO", "PC", 2.90, 6.80, 18.0, 40.0, 1000.0, 80.0, 1, 7),
        ("MAT-1011", "DS18B20 Waterproof Temperature Probe", "Digital 1-Wire temperature sensor probe with 1m cable", 2, "Industrial", "SKU-DS18B20-WP", "PC", 1.60, 3.90, 18.0, 80.0, 2000.0, 150.0, 1, 7),
        ("MAT-1012", "SCT-013-000 Non-Invasive AC Current Clamp", "Split-core current transformer 100A sensor", 2, "Power", "SKU-SCT013-100A", "PC", 5.80, 13.50, 18.0, 25.0, 800.0, 60.0, 1, 7),
        
        # Automation & Robotics
        ("MAT-1013", "NEMA 17 Stepper Motor 42BYGHW", "High torque bipolar stepper motor 1.8 degree 1.5A", 3, "Motors", "SKU-NEMA17-STEP", "PC", 8.90, 19.99, 18.0, 50.0, 1200.0, 120.0, 1, 9),
        ("MAT-1014", "TMC2209 Ultra-Silent Stepper Driver", "SilentStepStick stepper motor driver module with UART", 3, "Drivers", "SKU-TMC2209-DRV", "PC", 3.10, 7.80, 18.0, 80.0, 2000.0, 160.0, 1, 4),
        ("MAT-1015", "MG996R High-Torque Metal Gear Servo", "Standard 180-degree metal gear RC robot servo motor", 3, "Servos", "SKU-MG996R-SERVO", "PC", 4.80, 11.20, 18.0, 60.0, 1500.0, 140.0, 1, 9),
        ("MAT-1016", "24V 350W Industrial Switching Power Supply", "Meanwell-type enclosed regulated AC-DC power converter", 3, "Power", "SKU-PSU-24V350W", "PC", 22.00, 48.00, 18.0, 15.0, 400.0, 35.0, 1, 4),
        ("MAT-1017", "L298N Dual H-Bridge Motor Controller", "High power dual motor driver module 2A per channel", 3, "Drivers", "SKU-L298N-DUAL", "PC", 2.10, 5.00, 18.0, 70.0, 1800.0, 150.0, 1, 4),
        ("MAT-1018", "Optocoupler 4-Channel Isolated Relay Module", "5V optical isolation control board with LED indicators", 3, "Relays", "SKU-RELAY-4CH-5V", "PC", 3.40, 8.20, 18.0, 50.0, 1200.0, 110.0, 1, 4),
        
        # Raw Metals & Enclosures
        ("MAT-1019", "2020 T-Slot Aluminum Extrusion 1000mm", "Silver anodized structural aluminum frame profile", 4, "Extrusions", "SKU-ALUM-2020-1M", "MTR", 5.20, 12.50, 18.0, 100.0, 3000.0, 250.0, 2, 3),
        ("MAT-1020", "2040 V-Slot Linear Rail Profile 1000mm", "Black anodized precision linear motion extrusion", 4, "Extrusions", "SKU-ALUM-2040-1M", "MTR", 8.80, 21.00, 18.0, 60.0, 1800.0, 150.0, 2, 3),
        ("MAT-1021", "CNC Cast Aluminum Motor Bracket NEMA 17", "Rigid mounting bracket with hardware", 4, "Brackets", "SKU-BRKT-NEMA17", "PC", 2.40, 6.20, 18.0, 80.0, 2000.0, 180.0, 2, 5),
        ("MAT-1022", "M3 Hex Socket Cap Screws Assortment 500pc", "Grade 12.9 high tensile alloy steel black bolts box", 4, "Fasteners", "SKU-FAST-M3-BOX", "BOX", 9.50, 22.00, 18.0, 30.0, 800.0, 70.0, 2, 5),
        ("MAT-1023", "M5 T-Nuts Drop-In Hammer Slot Pack 100pc", "Carbon steel nickel-plated T-nuts for 2020 rail", 4, "Fasteners", "SKU-TNUT-M5-100", "BOX", 4.20, 10.50, 18.0, 50.0, 1500.0, 120.0, 2, 5),
        ("MAT-1024", "IP67 Waterproof Polycarbonate Enclosure 158x90", "Durable industrial dustproof junction box grey", 4, "Boxes", "SKU-ENC-IP67-158", "PC", 6.80, 16.00, 18.0, 40.0, 1000.0, 90.0, 2, 8),
        
        # Passives & Cables
        ("MAT-1025", "100uF 35V Low ESR Electrolytic Capacitors 50pc", "High endurance aluminum radial capacitor pack", 5, "Capacitors", "SKU-CAP-100UF-50", "BOX", 2.10, 5.50, 18.0, 60.0, 2500.0, 150.0, 3, 10),
        ("MAT-1026", "SMD 0805 Resistor Kit 8500pcs 170 Values", "Full standard decade series 1% precision sample book", 5, "Resistors", "SKU-RES-0805-KIT", "BOX", 14.50, 34.00, 18.0, 20.0, 500.0, 50.0, 3, 10),
        ("MAT-1027", "USB Type-C to Type-A High-Speed Cable 1m", "Braided shielded 3A fast charging and data transfer", 5, "Cables", "SKU-CBL-USBC-1M", "PC", 1.80, 4.99, 18.0, 120.0, 4000.0, 300.0, 3, 10),
        ("MAT-1028", "JST-XH 2.54mm 2/3/4/5 Pin Connector Kit 460pc", "Crimp terminal housings and male/female headers box", 5, "Connectors", "SKU-JST-XH-KIT", "BOX", 8.20, 18.90, 18.0, 40.0, 1200.0, 100.0, 3, 10),
        ("MAT-1029", "22 AWG Flexible Silicone Stranded Wire Spool 50m", "Tinned copper heat resistant red/black power wire", 5, "Wire", "SKU-WIRE-22AWG-50", "MTR", 11.00, 26.50, 18.0, 30.0, 800.0, 75.0, 3, 10),
        ("MAT-1030", "Cat6 UTP Gigabit Ethernet Patch Cable 3m", "Snagless molded RJ45 network patch cord blue", 5, "Cables", "SKU-CBL-CAT6-3M", "PC", 2.20, 6.00, 18.0, 80.0, 2500.0, 200.0, 3, 10)
    ]
    materials = []
    for code, name, desc, cat_idx, subcat, sku, uom, p_price, s_price, tax, min_s, max_s, reorder, wh_idx, ven_idx in materials_specs:
        m = Material(
            material_code=code,
            name=name,
            description=desc,
            category_id=cat_idx,
            subcategory=subcat,
            sku=sku,
            uom=uom,
            purchase_price=p_price,
            selling_price=s_price,
            tax_rate=tax,
            min_stock_level=min_s,
            max_stock_level=max_s,
            reorder_level=reorder,
            default_warehouse_id=wh_idx,
            primary_vendor_id=ven_idx,
            is_active=True
        )
        materials.append(m)
    db.add_all(materials)
    db.commit()

    # 7. INVENTORY INITIAL BALANCES & STOCK MOVEMENTS
    # We assign realistic quantities so some are healthy, some are low stock for dashboard alerts!
    today = datetime.now(timezone.utc).date()
    stock_quantities = [
        350, 280, 1200, 850, 220, 180,  # MCUs: healthy
        15, 200, 18, 120, 240, 12,      # Sensors: MAT-1007 (15 <= 120 reorder -> Low stock!), MAT-1009 (18 <= 70 -> Low stock!), MAT-1012 (12 <= 60 -> Low stock!)
        310, 450, 290, 85, 360, 220,    # Automation: healthy
        620, 410, 500, 140, 280, 95,    # Raw metals: healthy
        400, 80, 650, 220, 150, 320     # Passives: healthy
    ]

    for idx, mat in enumerate(materials):
        qty = float(stock_quantities[idx])
        wh_id = mat.default_warehouse_id or 1
        inv = Inventory(
            material_id=mat.id,
            warehouse_id=wh_id,
            quantity_on_hand=qty,
            quantity_reserved=0.0,
            batch_number=f"BATCH-2026-{mat.id:03d}"
        )
        db.add(inv)
        db.flush()

        movement = StockMovement(
            movement_type=MovementType.GOODS_RECEIPT,
            material_id=mat.id,
            warehouse_id=wh_id,
            quantity=qty,
            balance_after=qty,
            batch_number=f"BATCH-2026-{mat.id:03d}",
            reference_type="Initial Material Stock",
            reference_id=f"INIT-{mat.material_code}",
            reason="Opening balance on ERP go-live",
            notes="Initial stock uploaded into system",
            created_by_id=inv_user.id,
            created_at=datetime.now(timezone.utc) - timedelta(days=60)
        )
        db.add(movement)

    db.commit()

    # 8. HISTORICAL TRANSACTIONS (PR, PO, GR, SO, Delivery, Invoices, Payments)
    # PR 1: ESP32 replenishment (Approved & Converted)
    pr1 = PurchaseRequisition(
        pr_number="PR-00001",
        requested_by_id=procure_user.id,
        department="Engineering Lab",
        status=PRStatus.CONVERTED_TO_PO,
        priority=PRPriority.HIGH,
        request_date=today - timedelta(days=25),
        required_date=today - timedelta(days=15),
        reason="Replenishment of ESP32 boards for IoT assembly pipeline",
        created_at=datetime.now(timezone.utc) - timedelta(days=25)
    )
    db.add(pr1)
    db.flush()

    pr1_item = PurchaseRequisitionItem(
        pr_id=pr1.id,
        material_id=materials[0].id,
        quantity=100.0,
        estimated_unit_price=4.50,
        notes="Primary batch"
    )
    db.add(pr1_item)

    # PO 1 (from PR 1) - FULLY RECEIVED
    po1 = PurchaseOrder(
        po_number="PO-00001",
        vendor_id=vendors[0].id,
        pr_id=pr1.id,
        created_by_id=procure_user.id,
        po_date=today - timedelta(days=24),
        expected_delivery_date=today - timedelta(days=14),
        currency="USD",
        payment_terms="Net 30",
        shipping_address="Central Distribution Center, 100 Logistics Way, Chicago, IL",
        subtotal=450.0,
        tax_amount=81.0,
        discount_amount=0.0,
        total_amount=531.0,
        status=POStatus.FULLY_RECEIVED,
        notes="Urgent replenishment for production line",
        created_at=datetime.now(timezone.utc) - timedelta(days=24)
    )
    db.add(po1)
    db.flush()

    po1_item = PurchaseOrderItem(
        po_id=po1.id,
        material_id=materials[0].id,
        quantity=100.0,
        received_quantity=100.0,
        unit_price=4.50,
        tax_rate=18.0,
        discount_percent=0.0,
        line_total=531.0
    )
    db.add(po1_item)

    # GR 1 for PO 1
    gr1 = GoodsReceipt(
        gr_number="GR-00001",
        po_id=po1.id,
        vendor_id=vendors[0].id,
        warehouse_id=wh_main.id,
        receipt_date=today - timedelta(days=16),
        received_by_id=inv_user.id,
        notes="All 100 ESP32 units inspected and verified.",
        created_at=datetime.now(timezone.utc) - timedelta(days=16)
    )
    db.add(gr1)
    db.flush()

    gr1_item = GoodsReceiptItem(
        gr_id=gr1.id,
        po_item_id=po1_item.id,
        material_id=materials[0].id,
        received_quantity=100.0,
        rejected_quantity=0.0,
        batch_number="BATCH-ESP32-101",
        notes="Quality inspection passed"
    )
    db.add(gr1_item)

    # Purchase Invoice 1 (PINV)
    pinv1 = Invoice(
        invoice_number="PINV-00001",
        invoice_type=InvoiceType.PURCHASE,
        vendor_id=vendors[0].id,
        reference_type="PurchaseOrder",
        reference_id=po1.po_number,
        invoice_date=today - timedelta(days=16),
        due_date=today + timedelta(days=14),
        subtotal=450.0,
        tax_amount=81.0,
        discount_amount=0.0,
        total_amount=531.0,
        paid_amount=531.0,
        payment_status=PaymentStatus.PAID,
        notes="Auto-generated on GR-00001",
        created_at=datetime.now(timezone.utc) - timedelta(days=16)
    )
    db.add(pinv1)
    db.flush()

    pay1 = Payment(
        payment_number="PAY-00001",
        invoice_id=pinv1.id,
        payment_date=today - timedelta(days=10),
        amount=531.0,
        payment_method="Bank Wire",
        reference_number="WIRE-BNK-992384",
        notes="Full payment released to ABC Electronics",
        created_at=datetime.now(timezone.utc) - timedelta(days=10)
    )
    db.add(pay1)

    # PO 2: Pending Approval
    po2 = PurchaseOrder(
        po_number="PO-00002",
        vendor_id=vendors[1].id,
        created_by_id=procure_user.id,
        po_date=today - timedelta(days=3),
        expected_delivery_date=today + timedelta(days=10),
        currency="USD",
        payment_terms="Net 45",
        shipping_address="Central Distribution Center, Chicago, IL",
        subtotal=1800.0,
        tax_amount=324.0,
        discount_amount=0.0,
        total_amount=2124.0,
        status=POStatus.PENDING_APPROVAL,
        notes="Procurement of RP2040 microcontrollers",
        created_at=datetime.now(timezone.utc) - timedelta(days=3)
    )
    db.add(po2)
    db.flush()

    po2_item = PurchaseOrderItem(
        po_id=po2.id,
        material_id=materials[2].id,
        quantity=2000.0,
        received_quantity=0.0,
        unit_price=0.90,
        tax_rate=18.0,
        discount_percent=0.0,
        line_total=2124.0
    )
    db.add(po2_item)

    # SALES ORDER 1 - DELIVERED & PAID
    so1 = SalesOrder(
        so_number="SO-00001",
        customer_id=customers[0].id,
        created_by_id=sales_user.id,
        order_date=today - timedelta(days=12),
        requested_delivery_date=today - timedelta(days=7),
        shipping_address="Tech Solutions Pvt Ltd, 500 Innovation Park, San Jose, CA",
        subtotal=499.50,
        tax_amount=89.91,
        discount_amount=0.0,
        total_amount=589.41,
        status=SOStatus.DELIVERED,
        notes="Priority client shipment",
        created_at=datetime.now(timezone.utc) - timedelta(days=12)
    )
    db.add(so1)
    db.flush()

    so1_item = SalesOrderItem(
        so_id=so1.id,
        material_id=materials[0].id,
        quantity=50.0,
        delivered_quantity=50.0,
        unit_price=9.99,
        discount_percent=0.0,
        tax_rate=18.0,
        line_total=589.41
    )
    db.add(so1_item)

    del1 = Delivery(
        delivery_number="DEL-00001",
        so_id=so1.id,
        customer_id=customers[0].id,
        warehouse_id=wh_main.id,
        delivery_date=today - timedelta(days=8),
        status=DeliveryStatus.DELIVERED,
        shipping_notes="Delivered via FedEx Priority Express",
        created_by_id=sales_user.id,
        created_at=datetime.now(timezone.utc) - timedelta(days=8)
    )
    db.add(del1)
    db.flush()

    del1_item = DeliveryItem(
        delivery_id=del1.id,
        so_item_id=so1_item.id,
        material_id=materials[0].id,
        quantity=50.0,
        batch_number="BATCH-ESP32-101"
    )
    db.add(del1_item)

    sinv1 = Invoice(
        invoice_number="SINV-00001",
        invoice_type=InvoiceType.SALES,
        customer_id=customers[0].id,
        reference_type="SalesOrder",
        reference_id=so1.so_number,
        invoice_date=today - timedelta(days=8),
        due_date=today + timedelta(days=22),
        subtotal=499.50,
        tax_amount=89.91,
        discount_amount=0.0,
        total_amount=589.41,
        paid_amount=589.41,
        payment_status=PaymentStatus.PAID,
        notes="Paid in full via ACH transfer",
        created_at=datetime.now(timezone.utc) - timedelta(days=8)
    )
    db.add(sinv1)
    db.flush()

    pay_cust1 = Payment(
        payment_number="PAY-00002",
        invoice_id=sinv1.id,
        payment_date=today - timedelta(days=5),
        amount=589.41,
        payment_method="ACH Transfer",
        reference_number="ACH-8841029",
        notes="Client settled invoice",
        created_at=datetime.now(timezone.utc) - timedelta(days=5)
    )
    db.add(pay_cust1)

    # SALES ORDER 2 - CONFIRMED & PENDING DELIVERY
    so2 = SalesOrder(
        so_number="SO-00002",
        customer_id=customers[1].id,
        created_by_id=sales_user.id,
        order_date=today - timedelta(days=1),
        requested_delivery_date=today + timedelta(days=4),
        shipping_address="OmniTech Robotics Systems, 120 Cyber Way, Pittsburgh, PA",
        subtotal=399.80,
        tax_amount=71.96,
        discount_amount=0.0,
        total_amount=471.76,
        status=SOStatus.CONFIRMED,
        notes="Awaiting warehouse packing",
        created_at=datetime.now(timezone.utc) - timedelta(days=1)
    )
    db.add(so2)
    db.flush()

    so2_item = SalesOrderItem(
        so_id=so2.id,
        material_id=materials[12].id,  # NEMA 17 Stepper Motor
        quantity=20.0,
        delivered_quantity=0.0,
        unit_price=19.99,
        discount_percent=0.0,
        tax_rate=18.0,
        line_total=471.76
    )
    db.add(so2_item)

    # AUDIT LOG SEEDING
    audit_entries = [
        AuditLog(username="admin", action="SYSTEM_INIT", module="Core", record_id="SYS-01", description="System initialised with standard Master Data", created_at=datetime.now(timezone.utc) - timedelta(days=60)),
        AuditLog(username="procure_mgr", action="APPROVE_PR", module="Purchase Requisition", record_id="PR-00001", description="Sarah Jenkins approved PR-00001 for ESP32 replenishment", created_at=datetime.now(timezone.utc) - timedelta(days=25)),
        AuditLog(username="procure_mgr", action="CONVERT_PR_TO_PO", module="Procurement", record_id="PO-00001", description="Converted PR-00001 into Purchase Order PO-00001", created_at=datetime.now(timezone.utc) - timedelta(days=24)),
        AuditLog(username="inv_mgr", action="RECEIVE_GOODS", module="Goods Receipt", record_id="GR-00001", description="Marcus Brody received 100 units against PO-00001 into WH-CDC", created_at=datetime.now(timezone.utc) - timedelta(days=16)),
        AuditLog(username="sales_mgr", action="CREATE_SALES_ORDER", module="Sales Order", record_id="SO-00001", description="David Chen created SO-00001 for Tech Solutions Pvt Ltd. ATP check passed.", created_at=datetime.now(timezone.utc) - timedelta(days=12)),
        AuditLog(username="sales_mgr", action="POST_GOODS_ISSUE", module="Goods Issue", record_id="DEL-00001", description="Posted Goods Issue for Delivery DEL-00001. Inventory reduced by 50 units.", created_at=datetime.now(timezone.utc) - timedelta(days=8))
    ]
    db.add_all(audit_entries)
    db.commit()

    print("Initial ERP demo data successfully seeded!")
