import uuid

def test_get_materials(client, auth_headers):
    response = client.get("/api/v1/materials", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 30
    assert "material_code" in data[0]
    assert "stock_status" in data[0]

def test_create_and_update_material(client, auth_headers):
    uid = uuid.uuid4().hex[:6].upper()
    new_mat = {
        "material_code": f"MAT-TEST-{uid}",
        "name": "Custom Test Sensor",
        "sku": f"SKU-TEST-{uid}",
        "uom": "PC",
        "purchase_price": 10.0,
        "selling_price": 25.0,
        "min_stock_level": 5.0,
        "max_stock_level": 100.0,
        "reorder_level": 15.0,
        "initial_stock": 0.0
    }
    response = client.post("/api/v1/materials", json=new_mat, headers=auth_headers)
    assert response.status_code == 200
    created = response.json()
    assert created["material_code"] == new_mat["material_code"]

    # Update
    update_payload = {"selling_price": 30.0}
    up_res = client.put(f"/api/v1/materials/{created['id']}", json=update_payload, headers=auth_headers)
    assert up_res.status_code == 200
    assert up_res.json()["selling_price"] == 30.0
