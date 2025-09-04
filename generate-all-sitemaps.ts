import fs from 'fs';
import path from 'path';

// Generate sitemap XML for majors based on actual HTML files
function generateMajorsSitemap() {
  const baseUrl = 'https://bruinplan.com';
  const lastmod = new Date().toISOString().split('T')[0];
  const buildMajorsDir = 'build/majors';
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  if (fs.existsSync(buildMajorsDir)) {
    const majorHtmlFiles = fs.readdirSync(buildMajorsDir).filter(file => 
      file.endsWith('.html') && file !== 'index.html'
    );

    majorHtmlFiles.forEach((file: string) => {
      const majorId = path.basename(file, '.html');
      xml += `
  <url>
    <loc>${baseUrl}/majors/${encodeURIComponent(majorId)}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.8</priority>
  </url>`;
    });

    console.log(`Found ${majorHtmlFiles.length} major HTML files`);
  } else {
    console.warn('build/majors directory not found - no major pages in sitemap');
  }

  xml += `
</urlset>`;
  return xml;
}

// Generate sitemap XML for courses based on actual HTML files
function generateCoursesSitemap() {
  const baseUrl = 'https://bruinplan.com';
  const lastmod = new Date().toISOString().split('T')[0];
  const buildCoursesDir = 'build/courses';
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  if (fs.existsSync(buildCoursesDir)) {
    const courseHtmlFiles = fs.readdirSync(buildCoursesDir).filter(file => 
      file.endsWith('.html') && file !== 'index.html'
    );

    courseHtmlFiles.forEach((file: string) => {
      const courseId = path.basename(file, '.html');
      xml += `
  <url>
    <loc>${baseUrl}/courses/${encodeURIComponent(courseId)}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.6</priority>
  </url>`;
    });

    console.log(`Found ${courseHtmlFiles.length} course HTML files`);
  } else {
    console.warn('build/courses directory not found - no course pages in sitemap');
  }

  xml += `
</urlset>`;
  return xml;
}

// Write both sitemaps
const majorsSitemap = generateMajorsSitemap();
const coursesSitemap = generateCoursesSitemap();

// Create build directory if it doesn't exist
if (!fs.existsSync('build')) {
  fs.mkdirSync('build', { recursive: true });
}

fs.writeFileSync('build/sitemap-majors.xml', majorsSitemap);
fs.writeFileSync('build/sitemap-courses.xml', coursesSitemap);

// Count actual files for reporting
const majorCount = fs.existsSync('build/majors') ? 
  fs.readdirSync('build/majors').filter(f => f.endsWith('.html') && f !== 'index.html').length : 0;
const courseCount = fs.existsSync('build/courses') ? 
  fs.readdirSync('build/courses').filter(f => f.endsWith('.html') && f !== 'index.html').length : 0;

// Update the main sitemap index with current date
const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://bruinplan.com/sitemap-main.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://bruinplan.com/sitemap-majors.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://bruinplan.com/sitemap-courses.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
</sitemapindex>`;

fs.writeFileSync('build/sitemap.xml', sitemapIndex);

console.log(`Generated sitemaps:
- sitemap-majors.xml with ${majorCount} major pages
- sitemap-courses.xml with ${courseCount} course pages
- Updated sitemap.xml index`);

// Update the main sitemap with current date (keep the same structure as before)
const mainSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bruinplan.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bruinplan.com/about</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://bruinplan.com/majors</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://bruinplan.com/courses</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://bruinplan.com/help</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://bruinplan.com/report-bug</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://bruinplan.com/known-bugs</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.5</priority>
  </url>
</urlset>`;

fs.writeFileSync('build/sitemap-main.xml', mainSitemap);

console.log('Updated sitemap-main.xml with current dates');
