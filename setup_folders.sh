#!/bin/bash

# Configuration
BASE_DIR="./regulatory_files"
RECIPIENTS=("REC_001" "REC_002")
ENTITIES=("ENT_ALPHA" "ENT_BETA")
DOC_TYPES=("VTIS" "FTIS" "PTIS" "REFERENTIEL")

echo "Creating directory structure in $BASE_DIR..."

for rec in "${RECIPIENTS[@]}"; do
    for ent in "${ENTITIES[@]}"; do
        for type in "${DOC_TYPES[@]}"; do
            DIR="$BASE_DIR/$rec/$ent/$type"
            mkdir -p "$DIR"

            # Create sample files with .xml extension
            touch "$DIR/doc_202401_${type}_001.xml"
            touch "$DIR/doc_202401_${type}_002.xml"

            # Create some already processed files with .AR3 extension
            touch "$DIR/doc_202312_${type}_processed.AR3"

            echo "Created: $DIR"
        done
    done
done

echo "Structure created successfully."
ls -R "$BASE_DIR"
