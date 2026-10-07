import uuid

def test_prevent_overselling_hard_reject(client, auth_headers):
    """
    CRITICAL TEST REQUIREMENT:
    If inventory = 10 and user attempts to sell 15,
    the API must reject the transaction and inventory must remain unchanged.
    """
    unique_suffix = uuid.uuid4().hex[:6].upper()
    mat_code = f"MAT-ATP-{unique_suffix}"
    sku_code = f"SKU-ATP-{unique_suffix}"

    # 1. Create a dedicated test material with exactly 10 units in inventory
    mat_res = client.post("/api/v1/materials", json={
        "material_code": mat_code,
        "name": f"ATP Test Board {unique_suffix}",
        "sku": sku_code,
        "uom": "PC",
        "purchase_price": 5.0,
        "selling_price": 12.0,
        "min_stock_level": 2.0,
        "max_stock_level": 50.0,
        "reorder_level": 5.0,
        "default_warehouse_id": 1,
        "initial_stock": 10.0
    }, headers=auth_headers)
    assert mat_res.status_code == 200, f"Error creating test material: {mat_res.text}"
    mat_id = mat_res.json()["id"]

    # Verify inventory is exactly 10 via API
    mat_detail = client.get(f"/api/v1/materials/{mat_id}", headers=auth_headers).json()
    assert mat_detail["total_stock"] == 10.0

    # 2. Attempt to create a Sales Order for 15 units (exceeds 10 available)
    so_payload = {
        "customer_id": 1,
        "requested_delivery_date": "2026-11-01",
        "shipping_address": "Test Street 123",
        "items": [
            {
                "material_id": mat_id,
                "quantity": 15.0,
                "unit_price": 12.0
            }
        ]
    }
    so_res = client.post("/api/v1/sales-orders", json=so_payload, headers=auth_headers)
    
    # 3. Assert rejection
    assert so_res.status_code == 400, f"Expected 400 Bad Request, got {so_res.status_code}: {so_res.text}"
    assert "Stock Availability Check failed" in so_res.json()["detail"] or "Insufficient" in so_res.json()["detail"]

    # 4. Verify inventory remains UNCHANGED at 10.0
    mat_after = client.get(f"/api/v1/materials/{mat_id}", headers=auth_headers).json()
    assert mat_after["total_stock"] == 10.0
