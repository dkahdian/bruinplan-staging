#!/usr/bin/env pwsh
# Build script for BruinPlan - Builds all pages including course batches
param(
    [int]$MaxBatches = 148,  # Total batches calculated from ~14,783 courses ÷ 100
    [switch]$SkipCourses,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

Write-Host "BruinPlan Build Script Starting..." -ForegroundColor Green
Write-Host "Total Course Batches: $MaxBatches" -ForegroundColor Cyan

# Create temporary storage for course files
$tempCoursesDir = "temp_courses"
if (Test-Path $tempCoursesDir) {
    Remove-Item $tempCoursesDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempCoursesDir -Force | Out-Null

# Function to run build with error handling and course preservation
function Invoke-BuildBatch {
    param([int]$BatchNumber, [string]$Description, [string]$TempDir)
    
    Write-Host "Building $Description..." -ForegroundColor Yellow
    
    if ($BatchNumber -ge 0) {
        $env:COURSE_BATCH = $BatchNumber
        Write-Host "   Course Batch: $BatchNumber" -ForegroundColor Cyan
    } else {
        Remove-Item Env:\COURSE_BATCH -ErrorAction SilentlyContinue
    }
    
    $startTime = Get-Date
    
    try {
        if ($Verbose) {
            npm run build
        } else {
            npm run build 2>&1 | Out-Null
        }
        
        # For course batches, copy the generated course HTML files to temp storage
        if ($BatchNumber -ge 0 -and (Test-Path "build\courses")) {
            $courseFiles = Get-ChildItem "build\courses\" -Filter "*.html" -ErrorAction SilentlyContinue
            foreach ($file in $courseFiles) {
                Copy-Item $file.FullName -Destination $TempDir -Force
                Write-Host "     Saved: $($file.Name)" -ForegroundColor DarkGreen
            }
        }
        
        $duration = (Get-Date) - $startTime
        Write-Host "   SUCCESS: $Description completed in $([math]::Round($duration.TotalSeconds, 1))s" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "   ERROR: $Description failed: $_" -ForegroundColor Red
        return $false
    }
}

# Step 1: Build main pages and majors (no course batch)
$success = Invoke-BuildBatch -BatchNumber -1 -Description "Main pages and majors" -TempDir ""
if (-not $success) {
    Write-Host "Main build failed. Exiting." -ForegroundColor Red
    exit 1
}

# Step 2: Build course batches with preservation
if (-not $SkipCourses) {
    $successfulBatches = 0
    $failedBatches = 0
    
    Write-Host "Starting course batch processing..." -ForegroundColor Magenta
    
    for ($batch = 0; $batch -lt $MaxBatches; $batch++) {
        $batchDescription = "Course batch $($batch + 1)/$MaxBatches"
        
        # Show progress
        $percent = [math]::Round(($batch / $MaxBatches) * 100, 1)
        Write-Progress -Activity "Building Course Batches" -Status $batchDescription -PercentComplete $percent
        
        $batchSuccess = Invoke-BuildBatch -BatchNumber $batch -Description $batchDescription -TempDir $tempCoursesDir
        
        if ($batchSuccess) {
            $successfulBatches++
        } else {
            $failedBatches++
            Write-Warning "Batch $batch failed, but continuing with remaining batches..."
        }
        
        # Memory cleanup between batches
        if (($batch + 1) % 10 -eq 0) {
            Write-Host "   Cleaning up memory after batch $($batch + 1)..." -ForegroundColor DarkGray
            [System.GC]::Collect()
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Progress -Activity "Building Course Batches" -Completed
    
    # Step 3: Final build and course integration
    Write-Host "Performing final build and integrating course files..." -ForegroundColor Magenta
    
    # Do final build for all other pages (without course batch)
    Remove-Item Env:\COURSE_BATCH -ErrorAction SilentlyContinue
    $finalSuccess = Invoke-BuildBatch -BatchNumber -1 -Description "Final build" -TempDir ""
    
    # Integrate all preserved course files
    if (Test-Path $tempCoursesDir) {
        $courseFiles = Get-ChildItem $tempCoursesDir -Filter "*.html" -ErrorAction SilentlyContinue
        if ($courseFiles.Count -gt 0) {
            # Ensure courses directory exists
            if (!(Test-Path "build\courses")) {
                New-Item -ItemType Directory -Path "build\courses" -Force | Out-Null
            }
            
            Write-Host "Integrating $($courseFiles.Count) course pages into final build..." -ForegroundColor Cyan
            foreach ($file in $courseFiles) {
                Copy-Item $file.FullName -Destination "build\courses\" -Force
            }
            Write-Host "All course pages successfully integrated!" -ForegroundColor Green
        } else {
            Write-Warning "No course files found in temporary storage"
        }
        
        # Clean up temp directory
        Remove-Item $tempCoursesDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "Course Batch Summary:" -ForegroundColor Magenta
    Write-Host "   Successful: $successfulBatches" -ForegroundColor Green
    Write-Host "   Failed: $failedBatches" -ForegroundColor Red
    Write-Host "   Success Rate: $([math]::Round(($successfulBatches / $MaxBatches) * 100, 1))%" -ForegroundColor Cyan
    
    # Final build statistics
    $totalCourseHtml = (Get-ChildItem "build\courses\" -Filter "*.html" -ErrorAction SilentlyContinue | Measure-Object).Count
    $totalMajorHtml = (Get-ChildItem "build\majors\" -Filter "*.html" -ErrorAction SilentlyContinue | Measure-Object).Count
    
    Write-Host "Generated Files:" -ForegroundColor Magenta
    Write-Host "   Course Pages: $totalCourseHtml" -ForegroundColor Cyan
    Write-Host "   Major Pages: $totalMajorHtml" -ForegroundColor Cyan
} else {
    Write-Host "Skipping course batches (SkipCourses flag set)" -ForegroundColor Yellow
}

# Always generate sitemaps (even if courses were skipped)
Write-Host "`nFinal Step: Generating Sitemaps" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

Write-Host "Generating sitemaps from built HTML files..." -ForegroundColor Yellow
try {
    if ($Verbose) {
        npx tsx generate-all-sitemaps.ts
    } else {
        npx tsx generate-all-sitemaps.ts 2>&1 | Out-Null
    }
    Write-Host "Sitemaps generated successfully!" -ForegroundColor Green
}
catch {
    Write-Host "WARNING: Sitemap generation failed: $_" -ForegroundColor Yellow
    Write-Host "Site will still function, but search engines may not index all pages" -ForegroundColor Yellow
}

# Clean up environment variable
Remove-Item Env:\COURSE_BATCH -ErrorAction SilentlyContinue

Write-Host "BruinPlan build complete!" -ForegroundColor Green
Write-Host "Site ready in build/ directory" -ForegroundColor Cyan
