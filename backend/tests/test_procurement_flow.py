def test_full_procurement_lifecycle(client, auth_headers):
    """
    Test End-to-End SAP MM Procurement:
    PR -> Approve -> Convert to PO -> Approve PO -> Goods Receipt (MIGO) -> Stock Increases
    """
    # 1. Create Purchase Requisition
    pr_payload = {
        "department": "Plant Maintenance",
        "priority": "High",
        "required_date": "2026-11-15",
        "reason": "Test PR cycle",
        "items": [
            {"material_id": 1, "quantity": 100.0, "estimated_unit_price": 4.50}
        ]
    }
    pr_res = client.post("/api/v1/purchase-requisitions", json=pr_payload, headers=auth_headers)
    assert pr_res.status_code == 200
    pr_data = pr_res.json()
    pr_id = pr_data["id"]
    assert pr_data["status"] == "Draft"

    # 2. Approve PR
    appr_res = client.put(f"/api/v1/purchase-requisitions/{pr_id}/approve", headers=auth_headers)
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "Approved"

    # 3. Convert PR to PO
    conv_payload = {
        "vendor_id": 1,
        "expected_delivery_date": "2026-11-20",
        "shipping_address": "Central Warehouse"
    }
    conv_res = client.post(f"/api/v1/purchase-requisitions/{pr_id}/convert-to-po", json=conv_payload, headers=auth_headers)
    assert conv_res.status_code == 200
    po_id = conv_res.json()["po_id"]

    # 4. Approve PO
    po_appr = client.put(f"/api/v1/purchase-orders/{po_id}/approve", headers=auth_headers)
    assert po_appr.status_code == 200
    assert po_appr.json()["status"] == "Approved"

    # Check stock before receipt
    mat_before = client.get("/api/v1/materials/1", headers=auth_headers).json()
    stock_before = mat_before["total_stock"]

    # 5. Goods Receipt (MIGO) for 100 units
    po_detail = client.get(f"/api/v1/purchase-orders/{po_id}", headers=auth_headers).json()
    po_item_id = po_detail["items"][0]["id"]

    gr_payload = {
        "po_id": po_id,
        "warehouse_id": 1,
        "notes": "Testing GR reception",
        "items": [
            {
                "po_item_id": po_item_id,
                "material_id": 1,
                "received_quantity": 100.0,
                "batch_number": "BATCH-TEST-GR"
            }
        ]
    }
    gr_res = client.post("/api/v1/goods-receipts", json=gr_payload, headers=auth_headers)
    assert gr_res.status_code == 200

    # 6. Verify inventory increased by exactly 100 units
    mat_after = client.get("/api/v1/materials/1", headers=auth_headers).json()
    assert mat_after["total_stock"] == stock_before + 100.0

    # 7. Verify PO is now Fully Received
    po_final = client.get(f"/api/v1/purchase-orders/{po_id}", headers=auth_headers).json()
    assert po_final["status"] == "Fully Received"
