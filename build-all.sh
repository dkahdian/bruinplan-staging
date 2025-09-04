#!/bin/bash
# Build script for BruinPlan - Builds all pages including course batches
set -e

MAX_BATCHES=${MAX_BATCHES:-148}  # Total batches calculated from ~14,783 courses ÷ 100
SKIP_COURSES=${SKIP_COURSES:-false}
BUILD_TIMEOUT=${BUILD_TIMEOUT:-300}  # 5 minutes per batch

echo "BruinPlan Build Script Starting..."
echo "Total Course Batches: $MAX_BATCHES"
echo "Build Timeout per batch: ${BUILD_TIMEOUT}s"

# Create temporary storage for course files
TEMP_COURSES_DIR="temp_courses"
if [ -d "$TEMP_COURSES_DIR" ]; then
    rm -rf "$TEMP_COURSES_DIR"
fi
mkdir -p "$TEMP_COURSES_DIR"

# Function to run build with error handling, timeout, and course preservation
build_batch() {
    local batch_number=$1
    local description=$2
    local temp_dir=$3
    
    echo "Building $description..."
    
    if [ "$batch_number" -ge 0 ] 2>/dev/null; then
        export COURSE_BATCH=$batch_number
        echo "   Course Batch: $batch_number"
    else
        unset COURSE_BATCH
    fi
    
    local start_time=$(date +%s)
    
    # Run build with timeout
    if timeout $BUILD_TIMEOUT npm run build >/dev/null 2>&1; then
        # For course batches, copy the generated course HTML files to temp storage
        if [ "$batch_number" -ge 0 ] 2>/dev/null && [ -d "build/courses" ]; then
            if [ -n "$temp_dir" ]; then
                for file in build/courses/*.html; do
                    if [ -f "$file" ]; then
                        cp "$file" "$temp_dir/"
                        echo "     Saved: $(basename "$file")"
                    fi
                done 2>/dev/null || true
            fi
        fi
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo "   SUCCESS: $description completed in ${duration}s"
        return 0
    else
        echo "   ERROR: $description failed or timed out"
        return 1
    fi
}

# Step 1: Build main pages and majors (no course batch)
if ! build_batch -1 "Main pages and majors" ""; then
    echo "Main build failed. Exiting."
    exit 1
fi

# Step 2: Build course batches with preservation
if [ "$SKIP_COURSES" != "true" ]; then
    successful_batches=0
    failed_batches=0
    
    echo "Starting course batch processing..."
    
    for ((batch=0; batch<MAX_BATCHES; batch++)); do
        batch_description="Course batch $((batch + 1))/$MAX_BATCHES"
        
        # Show progress
        percent=$((batch * 100 / MAX_BATCHES))
        echo "Progress: $percent% ($batch_description)"
        
        if build_batch $batch "$batch_description" "$TEMP_COURSES_DIR"; then
            ((successful_batches++))
        else
            ((failed_batches++))
            echo "WARNING: Batch $batch failed, but continuing with remaining batches..."
        fi
        
        # Memory cleanup between batches
        if [ $((batch % 10)) -eq 9 ]; then
            echo "   Cleaning up memory after batch $((batch + 1))..."
            sleep 2
        fi
    done
    
    # Step 3: Final build and course integration
    echo "Performing final build and integrating course files..."
    
    # Do final build for all other pages (without course batch)
    unset COURSE_BATCH
    if ! build_batch -1 "Final build" ""; then
        echo "Final build failed. Continuing with course integration..."
    fi
    
    # Integrate all preserved course files
    if [ -d "$TEMP_COURSES_DIR" ]; then
        course_count=$(find "$TEMP_COURSES_DIR" -name "*.html" 2>/dev/null | wc -l || echo "0")
        if [ "$course_count" -gt 0 ]; then
            # Ensure courses directory exists
            mkdir -p "build/courses"
            
            echo "Integrating $course_count course pages into final build..."
            cp "$TEMP_COURSES_DIR"/*.html "build/courses/" 2>/dev/null || true
            echo "All course pages successfully integrated!"
        else
            echo "WARNING: No course files found in temporary storage"
        fi
        
        # Clean up temp directory
        rm -rf "$TEMP_COURSES_DIR"
    fi
    
    echo "Course Batch Summary:"
    echo "   Successful: $successful_batches"
    echo "   Failed: $failed_batches"
    success_rate=$((successful_batches * 100 / MAX_BATCHES))
    echo "   Success Rate: ${success_rate}%"
    
    # Final build statistics
    total_course_html=$(find build/courses/ -name "*.html" 2>/dev/null | wc -l || echo "0")
    total_major_html=$(find build/majors/ -name "*.html" 2>/dev/null | wc -l || echo "0")
    
    echo "Generated Files:"
    echo "   Course Pages: $total_course_html"
    echo "   Major Pages: $total_major_html"
else
    echo "Skipping course batches (SKIP_COURSES=true)"
fi

# Always generate sitemaps (even if courses were skipped)
echo "Final Step: Generating Sitemaps"
echo "========================================"

echo "Generating sitemaps from built HTML files..."
if npx tsx generate-all-sitemaps.ts >/dev/null 2>&1; then
    echo "Sitemaps generated successfully!"
else
    echo "WARNING: Sitemap generation failed"
    echo "Site will still function, but search engines may not index all pages"
fi

# Clean up environment variable
unset COURSE_BATCH

echo "BruinPlan build complete!"
echo "Site ready in build/ directory"
