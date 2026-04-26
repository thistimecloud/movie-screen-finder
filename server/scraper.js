import * as cheerio from 'cheerio';

const BASE_URL = 'https://eiga.com';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fetch a page with proper headers
 */
async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return await res.text();
}

/**
 * Search for movies by name on eiga.com
 * Returns array of { id, title, url }
 */
export async function searchMovies(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `${BASE_URL}/search/${encodedQuery}/`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const results = [];
  const seen = new Set();

  // eiga.com search results contain links to /movie/XXXXX/
  $('a[href*="/movie/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const movieIdMatch = href.match(/\/movie\/(\d+)\//);
    if (!movieIdMatch) return;

    const id = movieIdMatch[1];
    if (seen.has(id)) return;

    const title = $(el).text().trim();
    if (!title || title.length < 2) return;

    // Skip navigation/utility links
    const skipTexts = ['映画館を探す', '作品情報を見る', 'コピー', '印刷',
      'すべてのスケジュールを見る', '映画.com', 'ランキング', '注目作品',
      '劇場公開日', '国内映画'];
    if (skipTexts.some(s => title.includes(s))) return;

    seen.add(id);
    results.push({ id, title, url: `${BASE_URL}/movie/${id}/` });
  });

  return results;
}

/**
 * Get the schedule of a specific movie at a specific theater from eiga.com
 * 
 * The HTML structure is:
 *   <section id="m{movieId}" data-title="...">
 *     <table class="weekly-schedule">
 *       <tr>
 *         <td data-date="20260426">
 *           <p class="date">4/26<span>（日）</span></p>
 *           <a class="btn ticket..." title="16:50 ...">16:50</a>
 *           <a ...>20:00<small>～22:47</small></a>
 *           <span class="btn off">8:20</span>  ← past times
 *           <span>10:20</span>  ← future dates without tickets yet
 *         </td>
 *       </tr>
 *     </table>
 *   </section>
 */
export async function getTheaterSchedule(theaterPath, movieId) {
  const url = `${BASE_URL}/theater/${theaterPath}/`;
  let html;
  try {
    html = await fetchPage(url);
  } catch (err) {
    console.error(`  Failed to fetch ${theaterPath}: ${err.message}`);
    return [];
  }

  const $ = cheerio.load(html);

  // Find the movie section by ID
  const $section = $(`#m${movieId}`);
  if (!$section.length) {
    return [];
  }

  const schedules = [];
  const currentYear = new Date().getFullYear();
  const days = ['日', '月', '火', '水', '木', '金', '土'];

  // Find all schedule tables within this section
  $section.find('table.weekly-schedule').each((_, table) => {
    $(table).find('td[data-date]').each((_, td) => {
      const $td = $(td);
      const dateStr = $td.attr('data-date'); // e.g., "20260426"
      if (!dateStr || dateStr.length !== 8) return;

      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6));
      const day = parseInt(dateStr.substring(6, 8));
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = days[dateObj.getDay()];

      const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const displayDate = `${month}/${day}（${dayOfWeek}）`;

      const times = [];

      // Extract times from <a> tags (bookable) and <span> tags (not yet bookable or past)
      $td.children('a, span').each((_, timeEl) => {
        const $timeEl = $(timeEl);

        // Skip date labels
        if ($timeEl.is('p.date') || $timeEl.hasClass('date')) return;

        const text = $timeEl.clone().children('small').remove().end().text().trim();
        const timeMatch = text.match(/^(\d{1,2}:\d{2})$/);
        if (!timeMatch) return;

        const startTime = timeMatch[1];

        // Check for end time in <small> tag
        const $small = $timeEl.find('small');
        let endTime = null;
        if ($small.length) {
          const endMatch = $small.text().trim().match(/[～~]?\s*(\d{1,2}:\d{2})/);
          if (endMatch) endTime = endMatch[1];
        }

        const isPast = $timeEl.hasClass('off');

        times.push({ start: startTime, end: endTime, past: isPast });
      });

      if (times.length > 0) {
        schedules.push({ date: formattedDate, displayDate, times });
      }
    });
  });

  return schedules;
}

/**
 * Get schedules for a movie across all specified theaters
 */
export async function getMovieSchedules(theaters, movieId) {
  const results = [];

  // Process theaters in batches of 5
  const batchSize = 5;
  for (let i = 0; i < theaters.length; i += batchSize) {
    const batch = theaters.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async (theater, idx) => {
        await sleep(idx * 80); // Stagger requests within batch
        const schedule = await getTheaterSchedule(theater.eigaPath, movieId);
        if (schedule.length === 0) return null;

        return {
          theater: {
            name: theater.name,
            area: theater.area,
            maxSeats: theater.maxSeats,
            screens: theater.screens,
          },
          schedule,
        };
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      } else if (result.status === 'rejected') {
        console.error('  Batch error:', result.reason?.message);
      }
    }
  }

  // Sort by max screen size (descending)
  results.sort((a, b) => b.theater.maxSeats - a.theater.maxSeats);

  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
