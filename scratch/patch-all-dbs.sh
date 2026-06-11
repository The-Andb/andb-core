#!/bin/bash

# Find all andb-storage.db files in FlexibleWorkplace and Application Support
db_files=$(find /Volumes/FlexibleWorkplace /Users/anph/Library/Application\ Support -name "andb-storage.db" 2>/dev/null)

for db in $db_files; do
  echo "Checking database: $db"
  if [ -f "$db" ]; then
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
