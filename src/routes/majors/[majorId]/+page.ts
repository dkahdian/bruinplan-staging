import { loadMajor, majorIdToDisplayName } from '../../../lib/data-layer/api.js';
import { error } from '@sveltejs/kit';

// Enable prerendering for this route
export const prerender = true;

// Generate entries for all majors at build time
export const entries = async () => {
	try {
		// Use the data layer API which now handles server-side file access correctly
		const { getMajorIndex } = await import('../../../lib/data-layer/api.js');
		const majorIndexData = await getMajorIndex();
		
		return majorIndexData.map((major: any) => ({ 
			majorId: major.name.toLowerCase()
				.replace(/[,\.]/g, '') // Remove commas and periods
				.replace(/\s+/g, '') // Remove spaces
				.replace(/[^a-z0-9]/g, '') // Remove any other special characters
		}));
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
