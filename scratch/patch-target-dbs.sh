#!/bin/bash

# Target DB files
dbs=(
  "/Users/anph/Library/Application Support/The Andb Dev_dev/andb-storage.db"
  "/Users/anph/Library/Application Support/The Andb Test_v3_test/andb-storage.db"
  "/Users/anph/Library/Application Support/The Andb_v3/andb-storage.db"
  "/Users/anph/Library/Application Support/TheAndb_v3/andb-storage.db"
  "/Users/anph/Library/Application Support/The Andb Dev_v3_dev/andb-storage.db"
  "/Users/anph/Library/Application Support/The Andb_v3_test/andb-storage.db"
  "/Users/anph/Library/Application Support/TheAndb_v3_dev/andb-storage.db"
  "/Users/anph/Library/Application Support/The Andb/andb-storage.db"
  "/Users/anph/Library/Application Support/Electron_v3/andb-storage.db"
  "/Volumes/FlexibleWorkplace/The-Andb/andb-core/andb-storage.db"
  "/Volumes/FlexibleWorkplace/The-Andb/andb-desktop/temp_test_data/andb-storage.db"
  "/Volumes/FlexibleWorkplace/The-Andb/andb-desktop/andb-storage.db"
  "/Volumes/FlexibleWorkplace/The-Andb/andb-test/andb-storage.db"
  "/Volumes/FlexibleWorkplace/The-Andb/andb-cli/andb-storage.db"
  "/Volumes/FlexibleWorkplace/The-Andb/andb-mcp/andb-storage.db"
  "/Volumes/FlexibleWorkplace/The-Andb/andb-storage.db"
  "/Volumes/FlexibleWorkplace/side-pr/TheAndbData/andb-storage.db"
  "/Volumes/FlexibleWorkplace/side-pr/andb-storage.db"
)

for db in "${dbs[@]}"; do
  if [ -f "$db" ]; then
    echo "Checking database: $db"
    # Check if ddl_exports table exists
    has_table=$(sqlite3 "$db" "SELECT name FROM sqlite_master WHERE type='table' AND name='ddl_exports';" 2>/dev/null)
    if [ "$has_table" = "ddl_exports" ]; then
      # Check if definer column exists
      has_definer=$(sqlite3 "$db" "PRAGMA table_info(ddl_exports);" 2>/dev/null | grep -w "definer")
      if [ -z "$has_definer" ]; then
        echo "--> [PATCHING] Adding definer column to $db"
        sqlite3 "$db" "ALTER TABLE ddl_exports ADD COLUMN definer TEXT;" 2>/dev/null
        if [ $? -eq 0 ]; then
          echo "--> [SUCCESS] Patched definer column."
        else
          echo "--> [FAILED] Could not patch."
        fi
      else
        echo "--> [OK] definer column already exists."
      fi
    else
      echo "--> [SKIP] Table ddl_exports does not exist."
    fi
  fi
done
