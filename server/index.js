import express from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';
import { searchMovies, getMovieSchedules } from './scraper.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3456;

// Cache: 5 minutes for search, 10 minutes for schedules
const searchCache = new NodeCache({ stdTTL: 300 });
const scheduleCache = new NodeCache({ stdTTL: 600 });

// Load theater data
const theatersData = JSON.parse(
  readFileSync(join(__dirname, 'theaters.json'), 'utf-8')
);

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', theaters: theatersData.theaters.length });
});

// Search movies
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: '検索キーワードを入力してください' });
    }

    const cacheKey = `search:${query}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const results = await searchMovies(query.trim());
    searchCache.set(cacheKey, results);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: '検索中にエラーが発生しました' });
  }
});

// Get movie schedule across all theaters
app.get('/api/schedule/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;
    if (!movieId || !/^\d+$/.test(movieId)) {
      return res.status(400).json({ error: '無効な映画IDです' });
    }

    const cacheKey = `schedule:${movieId}`;
    const cached = scheduleCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    console.log(`Fetching schedules for movie ${movieId} across ${theatersData.theaters.length} theaters...`);
    const startTime = Date.now();

    const results = await getMovieSchedules(theatersData.theaters, movieId);

    const elapsed = Date.now() - startTime;
    console.log(`Fetched ${results.length} theater schedules in ${elapsed}ms`);

    scheduleCache.set(cacheKey, results);
    res.json(results);
  } catch (error) {
    console.error('Schedule error:', error);
    res.status(500).json({ error: 'スケジュール取得中にエラーが発生しました' });
  }
});

// Get list of theaters (for display purposes)
app.get('/api/theaters', (req, res) => {
  const summary = theatersData.theaters.map(t => ({
    name: t.name,
    area: t.area,
    maxSeats: t.maxSeats,
    screenCount: t.screens.length,
  }));
  summary.sort((a, b) => b.maxSeats - a.maxSeats);
  res.json(summary);
});

app.listen(PORT, () => {
  console.log(`🎬 Movie Screen Finder API running on http://localhost:${PORT}`);
  console.log(`📍 Tracking ${theatersData.theaters.length} Tokyo theaters`);
});
