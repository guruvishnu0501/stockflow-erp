def test_full_sales_lifecycle(client, auth_headers):
    """
    Test End-to-End SAP SD Sales:
    Sales Order (ATP check) -> Delivery (VL01N) -> Post Goods Issue (PGI) -> Inventory decreases -> Invoice Generated
    """
    # 1. Check stock of material 1
    mat_before = client.get("/api/v1/materials/1", headers=auth_headers).json()
    stock_before = mat_before["total_stock"]
    assert stock_before >= 20.0

    # 2. Create Sales Order for 20 units
    so_payload = {
        "customer_id": 1,
        "requested_delivery_date": "2026-11-20",
        "shipping_address": "Tech Solutions Headquarters",
        "notes": "Automated test order",
        "items": [
            {
                "material_id": 1,
                "quantity": 20.0,
                "unit_price": 9.99,
                "discount_percent": 0.0,
                "tax_rate": 18.0
            }
        ]
    }
    so_res = client.post("/api/v1/sales-orders", json=so_payload, headers=auth_headers)
    assert so_res.status_code == 200
    so_data = so_res.json()
    so_id = so_data["id"]
    so_item_id = so_data["items"][0]["id"]
    assert so_data["status"] == "Confirmed"

    # 3. Create Outbound Delivery (VL01N)
    del_payload = {
        "so_id": so_id,
        "warehouse_id": 1,
        "shipping_notes": "Outbound express test",
        "items": [
            {
                "so_item_id": so_item_id,
                "material_id": 1,
                "quantity": 20.0,
                "batch_number": "BATCH-TEST-SO"
            }
        ]
    }
    del_res = client.post("/api/v1/deliveries", json=del_payload, headers=auth_headers)
    assert del_res.status_code == 200
    del_id = del_res.json()["id"]

    # 4. Post Goods Issue (PGI)
    pgi_res = client.post(f"/api/v1/deliveries/{del_id}/post-goods-issue", headers=auth_headers)
    assert pgi_res.status_code == 200
    assert pgi_res.json()["status"] == "Delivered"

    # 5. Verify stock decreased by exactly 20 units
    mat_after = client.get("/api/v1/materials/1", headers=auth_headers).json()
    assert mat_after["total_stock"] == stock_before - 20.0

    # 6. Verify Sales Invoice was automatically created for this Sales Order
    inv_res = client.get(f"/api/v1/invoices?customer_id=1&invoice_type=Sales", headers=auth_headers)
    assert inv_res.status_code == 200
    invoices = inv_res.json()
    matching = [inv for inv in invoices if inv["reference_id"] == so_data["so_number"]]
    assert len(matching) > 0
    assert matching[0]["payment_status"] == "Pending"
