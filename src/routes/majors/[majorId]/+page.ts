import { loadMajor, majorIdToDisplayName } from '../../../lib/data-layer/api.js';
import { error } from '@sveltejs/kit';

// Enable prerendering for this route
export const prerender = true;

// Generate entries for all majors at build time
export const entries = async () => {
	try {
		// Check if we're running in Node.js environment (build time)
		if (typeof process !== 'undefined' && process.versions?.node) {
			// Use dynamic import to avoid bundling Node.js modules for browser
			const fs = await import('fs');
			const path = await import('path');
			
			const majorIndexPath = path.join(process.cwd(), 'static', 'major_index.json');
			const majorIndexData = JSON.parse(fs.readFileSync(majorIndexPath, 'utf-8'));
			
			return majorIndexData.map((major: any) => ({ 
				majorId: major.name.toLowerCase()
					.replace(/[,\.]/g, '') // Remove commas and periods
					.replace(/\s+/g, '') // Remove spaces
					.replace(/[^a-z0-9]/g, '') // Remove any other special characters
			}));
		}
		
		// Fallback for non-Node environments
		return [];
	} catch (err) {
		console.error('Error generating major entries:', err);
		return [];
	}
};

export const load = async ({ params, fetch }: { params: { majorId: string }, fetch: typeof globalThis.fetch }) => {
	const { majorId } = params;
	
	if (!majorId) {
		throw error(400, 'Major ID is required');
	}
	
	try {
		const major = await loadMajor(majorId, fetch);		
		if (!major) {
			throw error(404, 'That major doesn\'t exist!');
		}
		
		return {
			major,
			majorId
		};
	} catch (err) {
		console.error('Error loading major:', err);
		// Check if it's a SvelteKit HttpError
		if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
			throw err; // Re-throw SvelteKit errors (HttpError)
		}
		throw error(500, 'Failed to load major data');
	}
};
