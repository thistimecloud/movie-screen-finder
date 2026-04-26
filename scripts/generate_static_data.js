import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import { getMovieSchedules } from './scraper.js';

const THEATERS_FILE = path.join(process.cwd(), 'scripts', 'theaters.json');
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'data.json');
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchTopMovies() {
  console.log('Fetching top movies from eiga.com ranking...');
  const res = await fetch('https://eiga.com/ranking/', { headers: { 'User-Agent': USER_AGENT } });
  const html = await res.text();
  const $ = cheerio.load(html);
  const movies = [];
  
  const skipTitles = ['映画.com', 'ランキング', '映画館を探す', '注目作品', '作品情報を見る', '作品情報'];

  // Try parsing ranking list
  $('.ranking-list .title a').each((_, el) => {
    const title = $(el).text().trim();
    const href = $(el).attr('href');
    const match = href?.match(/\/movie\/(\d+)\//);
    if (match && title && !skipTitles.includes(title) && movies.length < 20) {
      movies.push({ id: match[1], title });
    }
  });

  // Fallback
  if (movies.length === 0) {
    $('a[href*="/movie/"]').each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr('href');
      const match = href?.match(/\/movie\/(\d+)\//);
      if (match && title && title.length > 2 && !skipTitles.includes(title) && movies.length < 20) {
        if (!movies.find(m => m.id === match[1])) {
          movies.push({ id: match[1], title });
        }
      }
    });
  }

  return movies;
}

async function main() {
  try {
    const theatersData = await fs.readFile(THEATERS_FILE, 'utf-8');
    const theaters = JSON.parse(theatersData).theaters;
    console.log(`Loaded ${theaters.length} theaters.`);

    const topMovies = await fetchTopMovies();
    console.log(`Found ${topMovies.length} top movies.`);

    const finalData = [];

    for (let i = 0; i < topMovies.length; i++) {
      const movie = topMovies[i];
      console.log(`[${i+1}/${topMovies.length}] Fetching schedules for: ${movie.title} (ID: ${movie.id})`);
      
      const schedules = await getMovieSchedules(theaters, movie.id);
      
      if (schedules.length > 0) {
        finalData.push({
          movie: {
            id: movie.id,
            title: movie.title
          },
          schedules
        });
      } else {
        console.log(`  -> No schedules found for ${movie.title}`);
      }
      
      // Delay to avoid hammering the server too fast
      await new Promise(r => setTimeout(r, 2000));
    }

    // Ensure public directory exists
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    
    // Write the output file
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
    console.log(`\nSuccessfully saved data for ${finalData.length} movies to ${OUTPUT_FILE}`);
    
  } catch (err) {
    console.error('Error generating static data:', err);
    process.exit(1);
  }
}

main();
