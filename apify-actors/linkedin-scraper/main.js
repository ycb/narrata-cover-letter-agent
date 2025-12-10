import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';

await Actor.init();

const input = await Actor.getInput();
const { profileUrls = [] } = input;

if (!profileUrls.length) {
    throw new Error('No profile URLs provided');
}

const crawler = new PlaywrightCrawler({
    requestHandler: async ({ page, request }) => {
        console.log(`Scraping: ${request.url}`);
        
        // Wait for profile to load
        await page.waitForSelector('h1', { timeout: 15000 });
        await page.waitForTimeout(3000); // Wait for content to load
        
        // Scroll to load lazy-loaded sections
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight / 2);
        });
        await page.waitForTimeout(1000);
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(2000);
        
        // Extract profile data by parsing raw text
        const profile = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
            
            // Helper to find section
            const findSection = (header) => {
                const idx = lines.findIndex(l => l === header);
                if (idx === -1) return [];
                const sectionHeaders = ['Experience', 'Education', 'Licenses', 'Volunteer', 'Publications', 'Projects', 'Languages', 'Recommendations', 'Other similar profiles', 'About'];
                const nextHeaderIdx = lines.slice(idx + 1).findIndex(l => sectionHeaders.includes(l));
                const endIdx = nextHeaderIdx === -1 ? lines.length : idx + 1 + nextHeaderIdx;
                return lines.slice(idx + 1, endIdx);
            };
            
            // Extract name
            const name = document.querySelector('h1')?.textContent?.trim() || '';
            const nameParts = name.split(' ');
            
            // Extract location and headline
            const locationLine = lines.find(l => l.includes('followers') || l.includes('connections'));
            const locationIdx = locationLine ? lines.indexOf(locationLine) : -1;
            const location = locationIdx > 0 ? lines[locationIdx - 1] : '';
            const headline = locationIdx > 0 && locationIdx < lines.length - 1 ? lines[locationIdx + 1] : '';
            
            // Extract follower/connection counts
            const followerMatch = locationLine?.match(/(\d[\d,]*)\s+followers?/);
            const connectionMatch = locationLine?.match(/(\d[\d,]*)\+?\s+connections?/);
            
            // Extract about
            const aboutLines = findSection('About');
            const about = aboutLines.join('\n').replace(/…?\s*see more$/i, '').trim();
            
            // Parse experience - look in full bodyText since LinkedIn combines sections
            const experience = [];
            const textBlocks = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
            
            // Find where experience content starts (before volunteer/licenses/etc)
            const expStartIdx = textBlocks.findIndex(l => l === 'Experience' || l.includes('Experience & Education'));
            const expEndIdx = textBlocks.findIndex((l, idx) => idx > expStartIdx && (l === 'Education' || l === 'Volunteer Experience' || l === 'Licenses' || l === 'Projects'));
            
            if (expStartIdx !== -1) {
                const expLines = expEndIdx !== -1 ? textBlocks.slice(expStartIdx + 1, expEndIdx) : textBlocks.slice(expStartIdx + 1);
                
                // Pattern: Title, Company, [Location], Duration, [Description]
                let i = 0;
                while (i < expLines.length && experience.length < 10) {
                    const line = expLines[i];
                    
                    // Skip navigation/UI elements
                    if (line.includes('see more') || line.includes('Show more') || 
                        line.includes('View') || line.includes('Sign in') ||
                        line.match(/^\*+$/)) {
                        i++;
                        continue;
                    }
                    
                    // Look for duration patterns (indicates we found a job entry)
                    const durationMatch = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*[-·]\s*(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|Present)/i);
                    
                    if (durationMatch) {
                        // Work backwards to find title and company
                        const duration = line;
                        let title = i >= 2 ? expLines[i - 2] : '';
                        let company = i >= 1 ? expLines[i - 1] : '';
                        
                        // Sometimes location is between company and duration
                        if (i >= 3 && expLines[i - 1].match(/,\s*(CA|NY|United States|California)/)) {
                            title = expLines[i - 3];
                            company = expLines[i - 2];
                        }
                        
                        // Collect description (lines after duration until next job title pattern)
                        const descLines = [];
                        let j = i + 1;
                        while (j < expLines.length && j < i + 8) {
                            const nextLine = expLines[j];
                            // Stop at next job entry indicators
                            if (nextLine.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i) ||
                                nextLine.match(/^\w+\s+(Manager|Lead|Director|VP|Engineer|Designer|Product|Head)/i)) {
                                break;
                            }
                            if (nextLine && !nextLine.includes('*')) {
                                descLines.push(nextLine);
                            }
                            j++;
                        }
                        
                        // Parse dates
                        const startMatch = duration.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
                        const endMatch = duration.match(/[-·]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
                        const is_current = duration.includes('Present');
                        
                        if (title && company && !title.includes('*')) {
                            experience.push({
                                title: title.trim(),
                                company: company.trim(),
                                description: descLines.join('\n').trim(),
                                duration: duration.trim(),
                                start_date: startMatch ? { month: startMatch[1], year: parseInt(startMatch[2]) } : null,
                                end_date: endMatch ? { month: endMatch[1], year: parseInt(endMatch[2]) } : null,
                                is_current
                            });
                        }
                        
                        i = j;
                    } else {
                        i++;
                    }
                }
            }
            
            // Parse education section
            const educationLines = findSection('Education');
            const education = [];
            i = 0;
            while (i < educationLines.length) {
                const line = educationLines[i];
                if (line.match(/University|College|School|Institute/i)) {
                    const school = line;
                    const degree = educationLines[i + 1] || '';
                    const duration = educationLines[i + 2] || '';
                    
                    // Parse dates
                    const yearMatch = duration.match(/(\d{4})\s*-\s*(\d{4})/);
                    const start_date = yearMatch ? { year: parseInt(yearMatch[1]) } : null;
                    const end_date = yearMatch ? { year: parseInt(yearMatch[2]) } : null;
                    
                    // Parse degree and field
                    const degreeMatch = degree.match(/^([^,]+),?\s*(.*)$/);
                    const degree_name = degreeMatch ? degreeMatch[1].trim() : degree;
                    const field_of_study = degreeMatch && degreeMatch[2] ? degreeMatch[2].trim() : '';
                    
                    education.push({
                        school,
                        degree,
                        degree_name,
                        field_of_study,
                        duration,
                        start_date,
                        end_date
                    });
                    
                    i += 3;
                } else {
                    i++;
                }
            }
            
            // Parse languages
            const languageLines = findSection('Languages');
            const languages = [];
            i = 0;
            while (i < languageLines.length) {
                if (languageLines[i] && languageLines[i + 1]?.includes('proficiency')) {
                    languages.push({
                        language: languageLines[i],
                        proficiency: languageLines[i + 1]
                    });
                    i += 2;
                } else {
                    i++;
                }
            }
            
            // Parse certifications
            const certLines = findSection('Licenses');
            const certifications = [];
            i = 0;
            while (i < certLines.length) {
                if (certLines[i] && certLines[i + 1]) {
                    certifications.push({
                        name: certLines[i],
                        issuer: certLines[i + 1],
                        issued_date: certLines[i + 2] || ''
                    });
                    i += 3;
                } else {
                    i++;
                }
            }
            
            return {
                basic_info: {
                    fullname: name,
                    first_name: nameParts[0] || '',
                    last_name: nameParts[nameParts.length - 1] || '',
                    headline: headline,
                    public_identifier: window.location.pathname.split('/in/')[1]?.replace('/', '') || '',
                    profile_url: window.location.href,
                    about: about,
                    location: {
                        full: location,
                        city: location.split(',')[0]?.trim() || location
                    },
                    follower_count: followerMatch ? parseInt(followerMatch[1].replace(/,/g, '')) : null,
                    connection_count: connectionMatch ? parseInt(connectionMatch[1].replace(/,/g, '')) : null,
                    current_company: experience[0]?.is_current ? experience[0].company : null
                },
                experience: experience.slice(0, 10), // Limit to 10 most recent
                education: education.slice(0, 5),
                languages: languages,
                certifications: certifications
            };
        });
        
        // Save to dataset
        await Actor.pushData(profile);
        
        console.log(`✅ Scraped profile: ${profile.name}`);
        console.log(`Body text length: ${profile.rawText?.length || 0}`);
    },
    
    // Use Apify's residential proxies to bypass bot detection
    proxyConfiguration: await Actor.createProxyConfiguration({
        groups: ['RESIDENTIAL']
    }),
    
    // Use headless browser
    launchContext: {
        useChrome: true,
        launchOptions: {
            headless: true
        }
    },
    
    maxRequestsPerCrawl: 10,
    maxConcurrency: 2
});

// Add profile URLs to the queue
await crawler.addRequests(profileUrls.map(url => ({ url })));

// Run the crawler
await crawler.run();

await Actor.exit();
