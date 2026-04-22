"""
Seed Script — Green Valley Township Sample Data.
Creates a complete sample project with plots, buildings, roads, parks, and amenities.
Uses normalized 0-1 coordinates for screen-independent rendering.

Run: python seed_green_valley.py
"""
import asyncio
import json
import os
import uuid
from decimal import Decimal

import asyncpg
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "postgresql://nestfind_user:your_secure_password_here@localhost:5432/nestfind_auth")


async def seed():
    conn = await asyncpg.connect(DB_URL)

    # -----------------------------------------------------------------------
    # We need a developer user. Find one or use a known admin.
    # -----------------------------------------------------------------------
    dev_user = await conn.fetchrow(
        "SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id WHERE r.name = 'DEVELOPER' LIMIT 1"
    )
    if not dev_user:
        # Try admin
        dev_user = await conn.fetchrow("SELECT id FROM users LIMIT 1")
    if not dev_user:
        print("ERROR: No users found. Create a user first.")
        await conn.close()
        return

    developer_id = dev_user["id"]
    print(f"Using developer: {developer_id}")

    # -----------------------------------------------------------------------
    # 1. CREATE PROJECT
    # -----------------------------------------------------------------------
    project_id = uuid.uuid4()
    await conn.execute(
        """
        INSERT INTO dev_projects (
            id, developer_id, project_name, project_type, status,
            location, city, state, pincode, latitude, longitude,
            total_land_area, total_units, description, amenities,
            visualization_enabled, master_plan_type,
            viewport_config
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT DO NOTHING
        """,
        project_id, developer_id,
        "Green Valley Township",
        "GATED_COMMUNITY",
        "UNDER_CONSTRUCTION",
        "Survey No 42, Shamshabad Road",
        "Hyderabad",
        "Telangana",
        "500078",
        Decimal("17.2403"),
        Decimal("78.4294"),
        Decimal("25.0"),  # 25 acres
        48,
        "A premium gated community with 48 plots, parks, clubhouse, and well-planned internal roads. East-facing plots available with excellent Vastu compliance.",
        json.dumps(["24/7 Security", "Clubhouse", "Children's Play Area", "Landscaped Gardens", "Wide Internal Roads", "Underground Drainage", "Water Treatment Plant"]),
        True,
        "IMAGE",
        json.dumps({"width": 1, "height": 1, "background_color": "#e8f5e9"}),
    )
    print(f"Created project: Green Valley Township ({project_id})")

    # -----------------------------------------------------------------------
    # 2. CREATE BUILDINGS (2 towers)
    # -----------------------------------------------------------------------
    tower_a_id = uuid.uuid4()
    tower_b_id = uuid.uuid4()

    for bid, name, code, px, py, floors in [
        (tower_a_id, "Skyline Tower A", "TA", 0.72, 0.25, 12),
        (tower_b_id, "Skyline Tower B", "TB", 0.82, 0.25, 10),
    ]:
        await conn.execute(
            """
            INSERT INTO dev_buildings (
                id, project_id, building_name, building_code,
                position_x, position_y, total_floors, units_per_floor,
                facing, status
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT DO NOTHING
            """,
            bid, project_id, name, code, Decimal(str(px)), Decimal(str(py)),
            floors, 4, "EAST", "ACTIVE"
        )

    # Generate floors for Tower A
    for i in range(12):
        floor_id = uuid.uuid4()
        label = "Ground Floor" if i == 0 else f"Floor {i}"
        await conn.execute(
            "INSERT INTO dev_floors (id, building_id, floor_number, floor_label, total_units) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
            floor_id, tower_a_id, i, label, 4
        )
        # Create 4 units per floor
        for u in range(1, 5):
            unit_num = f"TA-{i}{u:02d}"
            facings = ["East", "West", "North", "South"]
            price = 4500000 + (i * 100000) + (u * 50000)
            await conn.execute(
                """
                INSERT INTO dev_units (
                    id, project_id, building_id, floor_id, unit_number, unit_type,
                    area_sqft, price, facing, floor, bedrooms, bathrooms, parking, status
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                ON CONFLICT DO NOTHING
                """,
                uuid.uuid4(), project_id, tower_a_id, floor_id,
                unit_num, "Apartment",
                Decimal("1200"), Decimal(str(price)),
                facings[u - 1], i, 2, 2, 1,
                "AVAILABLE" if i < 10 else ("SOLD" if u <= 2 else "RESERVED")
            )

    print("Created Tower A with 12 floors, 48 units")

    # -----------------------------------------------------------------------
    # 3. CREATE PLOTS (24 plots in grid layout)
    # -----------------------------------------------------------------------
    plot_data = []
    plot_w = 0.06
    plot_h = 0.08
    statuses = ["AVAILABLE"] * 16 + ["RESERVED"] * 4 + ["SOLD"] * 3 + ["NEGOTIATION"]
    facings = ["East", "West", "North", "South", "NE", "SE"]

    row_configs = [
        # (start_x, start_y, count)
        (0.05, 0.10, 6),   # Row 1: top
        (0.05, 0.22, 6),   # Row 2
        (0.05, 0.50, 6),   # Row 3: below road
        (0.05, 0.62, 6),   # Row 4: bottom
    ]

    plot_idx = 0
    for row_x, row_y, count in row_configs:
        for i in range(count):
            plot_num = f"P{(plot_idx + 1):03d}"
            x = row_x + i * (plot_w + 0.015)
            y = row_y

            unit_id = uuid.uuid4()
            status = statuses[plot_idx % len(statuses)]
            facing = facings[plot_idx % len(facings)]
            area = 200 + (plot_idx % 5) * 50
            price = 3000000 + area * 5000

            await conn.execute(
                """
                INSERT INTO dev_units (
                    id, project_id, unit_number, unit_type,
                    area_sqft, price, facing, status
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                ON CONFLICT DO NOTHING
                """,
                unit_id, project_id, plot_num, "Plot",
                Decimal(str(area)), Decimal(str(price)),
                facing, status
            )

            # Create polygon for this plot
            coords = [
                [round(x, 6), round(y, 6)],
                [round(x + plot_w, 6), round(y, 6)],
                [round(x + plot_w, 6), round(y + plot_h, 6)],
                [round(x, 6), round(y + plot_h, 6)],
            ]
            await conn.execute(
                """
                INSERT INTO dev_layout_polygons (
                    id, project_id, polygon_type, label, coordinates,
                    area_sqft, linked_unit_id, z_order
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                ON CONFLICT DO NOTHING
                """,
                uuid.uuid4(), project_id, "PLOT", plot_num,
                json.dumps(coords), Decimal(str(area)),
                unit_id, 10
            )
            plot_idx += 1

    print(f"Created {plot_idx} plots with polygons")

    # -----------------------------------------------------------------------
    # 4. CREATE ROADS
    # -----------------------------------------------------------------------
    roads = [
        ("Main Avenue", "MAIN", [[0.02, 0.40], [0.98, 0.40]], 0.04),
        ("Cross Road 1", "INTERNAL", [[0.25, 0.05], [0.25, 0.95]], 0.02),
        ("Cross Road 2", "INTERNAL", [[0.55, 0.05], [0.55, 0.95]], 0.02),
        ("Perimeter Road", "MAIN", [[0.02, 0.02], [0.98, 0.02], [0.98, 0.98], [0.02, 0.98], [0.02, 0.02]], 0.03),
    ]
    for rname, rtype, points, width in roads:
        await conn.execute(
            """
            INSERT INTO dev_roads (id, project_id, road_name, road_type, path_points, width)
            VALUES ($1,$2,$3,$4,$5,$6)
            ON CONFLICT DO NOTHING
            """,
            uuid.uuid4(), project_id, rname, rtype,
            json.dumps(points), Decimal(str(width))
        )

        # Also create road polygons for the map
        road_coords = []
        for j in range(len(points) - 1):
            p1, p2 = points[j], points[j + 1]
            hw = width / 2
            if p1[0] == p2[0]:  # Vertical
                road_coords = [
                    [p1[0] - hw, p1[1]], [p1[0] + hw, p1[1]],
                    [p2[0] + hw, p2[1]], [p2[0] - hw, p2[1]]
                ]
            else:  # Horizontal
                road_coords = [
                    [p1[0], p1[1] - hw], [p2[0], p2[1] - hw],
                    [p2[0], p2[1] + hw], [p1[0], p1[1] + hw]
                ]
            if road_coords:
                await conn.execute(
                    """
                    INSERT INTO dev_layout_polygons (
                        id, project_id, polygon_type, label, coordinates, z_order,
                        style
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
                    ON CONFLICT DO NOTHING
                    """,
                    uuid.uuid4(), project_id, "ROAD", rname,
                    json.dumps(road_coords), 5,
                    json.dumps({"fill": "#94a3b8", "stroke": "#64748b", "strokeWidth": 1})
                )

    print("Created roads")

    # -----------------------------------------------------------------------
    # 5. CREATE PARKS & AMENITIES
    # -----------------------------------------------------------------------
    amenities = [
        ("Central Park", "PARK", 0.35, 0.55, [[0.30, 0.50], [0.48, 0.50], [0.48, 0.62], [0.30, 0.62]]),
        ("Clubhouse", "CLUBHOUSE", 0.60, 0.75, [[0.55, 0.72], [0.68, 0.72], [0.68, 0.82], [0.55, 0.82]]),
        ("Children's Playground", "PLAYGROUND", 0.15, 0.80, [[0.10, 0.78], [0.22, 0.78], [0.22, 0.85], [0.10, 0.85]]),
        ("Swimming Pool", "SWIMMING_POOL", 0.80, 0.75, [[0.77, 0.73], [0.87, 0.73], [0.87, 0.80], [0.77, 0.80]]),
        ("Main Gate", "GATE", 0.50, 0.98, None),
    ]

    for name, atype, px, py, coords in amenities:
        polygon_id = None
        if coords:
            polygon_id = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO dev_layout_polygons (
                    id, project_id, polygon_type, label, coordinates, z_order,
                    style
                ) VALUES ($1,$2,$3,$4,$5,$6,$7)
                ON CONFLICT DO NOTHING
                """,
                polygon_id, project_id,
                "PARK" if atype in ("PARK", "PLAYGROUND") else "AMENITY",
                name, json.dumps(coords), 8,
                json.dumps({"fill": "#a7f3d0" if "PARK" in atype or "PLAY" in atype else "#bfdbfe",
                            "stroke": "#34d399" if "PARK" in atype or "PLAY" in atype else "#60a5fa"})
            )

        await conn.execute(
            """
            INSERT INTO dev_amenities (
                id, project_id, amenity_type, name, position_x, position_y, polygon_id,
                icon
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT DO NOTHING
            """,
            uuid.uuid4(), project_id, atype, name,
            Decimal(str(px)), Decimal(str(py)),
            polygon_id,
            {"PARK": "TreePine", "CLUBHOUSE": "Building2", "PLAYGROUND": "Baby",
             "SWIMMING_POOL": "Waves", "GATE": "DoorOpen"}.get(atype, "MapPin")
        )

    # -----------------------------------------------------------------------
    # 6. CREATE BUILDING FOOTPRINTS
    # -----------------------------------------------------------------------
    for bid, name, px, py in [(tower_a_id, "Skyline Tower A", 0.72, 0.25), (tower_b_id, "Skyline Tower B", 0.82, 0.25)]:
        bw, bh = 0.06, 0.12
        await conn.execute(
            """
            INSERT INTO dev_layout_polygons (
                id, project_id, polygon_type, label, coordinates, z_order,
                linked_building_id, style
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT DO NOTHING
            """,
            uuid.uuid4(), project_id, "BUILDING_FOOTPRINT", name,
            json.dumps([
                [px - bw/2, py - bh/2], [px + bw/2, py - bh/2],
                [px + bw/2, py + bh/2], [px - bw/2, py + bh/2]
            ]),
            15, bid,
            json.dumps({"fill": "#c7d2fe", "stroke": "#6366f1", "strokeWidth": 2})
        )

    print("Created amenities and building footprints")
    print(f"\n✅ Green Valley Township seeded successfully!")
    print(f"   Project ID: {project_id}")
    print(f"   Tower A ID: {tower_a_id}")
    print(f"   Tower B ID: {tower_b_id}")
    print(f"   24 Plots + 48 Apartment Units + Roads + Parks + Amenities")

    await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
