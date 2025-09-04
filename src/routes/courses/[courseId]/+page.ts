import { getCourseIndex, getCourseById } from '../../../lib/data-layer/api.js';
import { error } from '@sveltejs/kit';

// Enable prerendering for course pages
export const prerender = true;

// Generate entries for courses at build time (in batches for performance)
export const entries = async () => {
	try {
		// Check if we're running in Node.js environment (build time)
		if (typeof process !== 'undefined' && process.versions?.node) {
			// Use dynamic import to avoid bundling Node.js modules for browser
			const fs = await import('fs');
			const path = await import('path');
			
			const courseIndexPath = path.join(process.cwd(), 'static', 'course_index.json');
			const courseIndexData = JSON.parse(fs.readFileSync(courseIndexPath, 'utf-8'));
			
			// Batch processing to avoid overwhelming the build system
			const BATCH_SIZE = 100;
			const currentBatch = parseInt(process.env.COURSE_BATCH || '0');
			const totalCourses = courseIndexData.length;
			const totalBatches = Math.ceil(totalCourses / BATCH_SIZE);
			
			console.log(`Processing course batch ${currentBatch + 1}/${totalBatches} (${BATCH_SIZE} courses per batch, ${totalCourses} total)`);
			
			const startIndex = currentBatch * BATCH_SIZE;
			const endIndex = Math.min(startIndex + BATCH_SIZE, totalCourses);
			const batchCourses = courseIndexData.slice(startIndex, endIndex);
			
			console.log(`Batch ${currentBatch + 1}: Processing courses ${startIndex + 1} to ${endIndex}`);
			
			return batchCourses.map((course: any) => ({ 
				courseId: course.id.replace(/[^A-Z0-9]/g, '') // Convert "A&O SCI 1" to "AOSCI1"
			}));
		}
		
		// Fallback for non-Node environments
		return [];
	} catch (err) {
		console.error('Error generating course entries:', err);
		return [];
	}
};

export const load = async ({ params, fetch, url }: { 
  params: { courseId: string }, 
  fetch: typeof globalThis.fetch, 
  url: URL 
}) => {
  // Convert URL format (AOSCI1, MATH31A) back to course ID format (A&O SCI 1, MATH 31A)
  let courseId = params.courseId;
  let course;
  
  try {
    // Check if we're running in Node.js environment (build time)
    if (typeof process !== 'undefined' && process.versions?.node) {
      // Use dynamic import and direct file access at build time
      const fs = await import('fs');
      const path = await import('path');
      
      // Load course index to find the matching course
      const courseIndexPath = path.join(process.cwd(), 'static', 'course_index.json');
      const courseIndex = JSON.parse(fs.readFileSync(courseIndexPath, 'utf-8'));
      
      // Find a course that matches when all non-alphanumeric characters are removed
      const compressedParam = params.courseId.replace(/[^A-Z0-9]/g, '');
      const matchingCourse = courseIndex.find((course: any) => 
        course.id.replace(/[^A-Z0-9]/g, '') === compressedParam
      );
      
      if (!matchingCourse) {
        throw error(404, 'That course doesn\'t exist!');
      }
      
      courseId = matchingCourse.id;
      
      // Load the subject file directly to get the full course data
      const subjectFilePath = path.join(process.cwd(), 'static', 'courses', `${matchingCourse.subject}.json`);
      const subjectCourses = JSON.parse(fs.readFileSync(subjectFilePath, 'utf-8'));
      course = subjectCourses.find((c: any) => c.id === courseId);
    } else {
      // Browser environment - use the existing logic with fetch
      const courseIndex = await getCourseIndex(fetch);
      const compressedParam = params.courseId.replace(/[^A-Z0-9]/g, '');
      
      const matchingCourse = courseIndex.find((course: any) => 
        course.id.replace(/[^A-Z0-9]/g, '') === compressedParam
      );
      
      if (matchingCourse) {
        courseId = matchingCourse.id;
      } else {
        // Fallback to the simple conversion for cases not in the index
        courseId = params.courseId.replace(/([A-Z]+)(\d+)/, '$1 $2');
      }
      
      course = await getCourseById(courseId, fetch);
    }
    
    if (!course) {
      throw error(404, 'That course doesn\'t exist!');
    }
    
    // Get query parameters to determine what prerequisites to show (only in browser)
    const showWarnings = typeof process === 'undefined' ? url.searchParams.get('warnings') !== 'false' : true;
    
    return {
      course,
      courseId: courseId,
      showWarnings
    };
  } catch (err) {
    // Check if it's a SvelteKit HttpError
    if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
      throw err; // Re-throw SvelteKit errors (HttpError)
    }
    console.error('Error loading course:', err);
    throw error(500, 'Failed to load course data');
  }
};