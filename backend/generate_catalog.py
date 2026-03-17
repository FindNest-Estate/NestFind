import json
from typing import TypedDict, List, Dict, Optional, cast

from typing import List, Dict, Any, Optional

# We use Dict[str, Any] instead of TypedDict for simpler JSON parsing
# and compatibility with dynamic keys and Pyre2.
SchemaDef = Dict[str, Any]
TableDef = Dict[str, Any]
ColumnDef = Dict[str, Any]
ForeignKeyDef = Dict[str, Any]
ConstraintDef = Dict[str, Any]
IndexDef = Dict[str, Any]

def generate_catalog() -> None:
    with open("schema_dump.json", "r", encoding="utf-8") as f:
        # Load and cast safely to SchemaDef to satisfy Pyre strictly
        schema: SchemaDef = cast(SchemaDef, json.load(f))

    catalog: List[str] = []
    catalog.append("# Schema Catalog\n")
    
    # Tables Summary
    catalog.append("## Tables Overview\n")
    schema_tables = cast(Dict[str, TableDef], schema.get("tables", {}))
    for t_name in sorted(schema_tables.keys()):
        t_data: TableDef = schema_tables[t_name]
        catalog.append(f"- **{t_name}** ({len(t_data.get('columns', []))} columns)")
    catalog.append("\n")

    # Detailed Table Views
    catalog.append("## Detailed Table Information\n")
    for t_name in sorted(schema_tables.keys()):
        t_data_det: TableDef = schema_tables[t_name]
        catalog.append(f"### Table: `{t_name}`\n")
        
        # Columns
        catalog.append("**Columns:**")
        catalog.append("| Column | Type | Nullable | Default |")
        catalog.append("|--------|------|----------|---------|")
        columns = cast(List[Dict[str, Any]], t_data_det.get("columns", []))
        for col in columns:
            nullable = "YES" if col.get("nullable") else "NO"
            default_val = col.get("default")
            default = str(default_val) if default_val is not None else "NULL"
            if len(default) > 40:
                default = default[:37] + "..."
            catalog.append(f"| {col.get('name', '')} | {col.get('type', '')} | {nullable} | {default} |")
        catalog.append("\n")
        
        # Primary Key & Constraints
        catalog.append("**Constraints & Indexes:**\n")
        constraints = cast(List[Dict[str, Any]], t_data_det.get("constraints", []))
        for c in constraints:
            catalog.append(f"- Constraint: `{c.get('name')}` ({c.get('type')}) on column `{c.get('column')}`")
        indexes = cast(List[Dict[str, Any]], t_data_det.get("indexes", []))
        for i in indexes:
            idx_def = i.get("definition", "")
            if len(idx_def) > 100:
                idx_def = idx_def[:97] + "..."
            idx_name = i.get("name", "Unknown")
            catalog.append(f"- Index: `{idx_name}`\n  - {idx_def}")
        catalog.append("\n")

        # Foreign Keys
        foreign_keys = cast(List[Dict[str, Any]], t_data_det.get("foreign_keys", []))
        if foreign_keys:
            catalog.append("**Foreign Keys:**\n")
            for fk in foreign_keys:
                catalog.append(f"- `{fk.get('column')}` -> `{fk.get('references_table')}`.`{fk.get('references_column')}`")
            catalog.append("\n")

        catalog.append("---\n")
        
    # Enums
    catalog.append("## Custom ENUM Types\n")
    enums = cast(Dict[str, List[str]], schema.get("enums", {}))
    for e_name in sorted(enums.keys()):
        e_vals = enums[e_name]
        catalog.append(f"### `{e_name}`")
        for v in sorted(e_vals):
            catalog.append(f"- {v}")
        catalog.append("\n")

    with open("schema_catalog.md", "w", encoding="utf-8") as f:
        f.write("\n".join(catalog))
    print("Catalog generation complete! Saved to schema_catalog.md")

if __name__ == "__main__":
    generate_catalog()
