import {
    LinkedInDomEntry,
    isElementPost,
    isElementNews,
    isElementAMatch,
    queryAllElements,
    queryAllEntries
} from '../src/linkedin_dom_entry';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'linkedin_fixtures');

// Iterate through all HTML files in the "tests/linkedin_fixtures" directory of this repo
// Parse them using jsdom, get the root HTMLElement, and create an object with `new LinkedInDomEntry(element)`.
// For each one, call the relevant getter methods, except for getHTMLElement(), and store the results in a JSON object.
// Store snapshots of the results, named after the filename of the fixture.

describe('LinkedInDomEntry', () => {
    // Get all HTML files from the fixtures directory
    const fixtureFiles = fs.existsSync(FIXTURES_DIR) 
        ? fs.readdirSync(FIXTURES_DIR).filter(file => file.endsWith('.html'))
        : [];

    if (fixtureFiles.length === 0) {
        test('no fixtures found', () => {
            console.warn(`No HTML fixtures found in ${FIXTURES_DIR}`);
            expect(true).toBe(true);
        });
    }

    fixtureFiles.forEach(filename => {
        describe(filename, () => {
            let dom: JSDOM;
            let entries: LinkedInDomEntry[];

            beforeAll(() => {
                const filepath = path.join(FIXTURES_DIR, filename);
                const html = fs.readFileSync(filepath, 'utf-8');
                dom = new JSDOM(html);
                const root = dom.window.document.documentElement as unknown as HTMLElement;
                entries = queryAllEntries(root);
            });

            test('should parse and snapshot all entries', () => {
                const results = entries.map((entry, index) => ({
                    text: entry.getText(),
                    postedByName: entry.getPostedByName(),
                    updateReason: entry.getUpdateReason(),
                    reactedByName: entry.getReactedByName(),
                    isSuggested: entry.isSuggested(),
                    containsContentCredentials: entry.containsContentCredentials(),
                }));

                expect(results).toMatchSnapshot();
            });

            test('should find correct number of elements', () => {
                const root = dom.window.document.documentElement as unknown as HTMLElement;
                const elements = queryAllElements(root);
                expect(entries.length).toBe(elements.length);
            });
        });
    });
});
