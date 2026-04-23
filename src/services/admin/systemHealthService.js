// src/services/admin/systemHealthService.js
import mongoose from 'mongoose';
import os from 'os';
import redis from '~/utils/redisClient';

const bytesToMB = (b) => Math.round((b / 1024 / 1024) * 100) / 100;

export const health = async () => {
	const mongoState = mongoose.connection?.readyState;
	const mongoMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

	let redisOk = false;
	let redisLatencyMs = null;
	try {
		const t0 = Date.now();
		await redis.client.ping();
		redisLatencyMs = Date.now() - t0;
		redisOk = true;
	} catch {
		redisOk = false;
	}

	const mem = process.memoryUsage();

	return {
		node_env: process.env.NODE_ENV || 'unknown',
		uptime_seconds: Math.round(process.uptime()),
		memory: {
			rss_mb: bytesToMB(mem.rss),
			heap_used_mb: bytesToMB(mem.heapUsed),
			heap_total_mb: bytesToMB(mem.heapTotal),
			external_mb: bytesToMB(mem.external),
		},
		host: {
			platform: process.platform,
			node: process.version,
			load_avg: os.loadavg(),
			cpu_cores: os.cpus().length,
			total_mem_mb: bytesToMB(os.totalmem()),
			free_mem_mb: bytesToMB(os.freemem()),
		},
		mongo: {
			state: mongoMap[mongoState] || String(mongoState),
			db: mongoose.connection?.name || null,
		},
		redis: {
			ok: redisOk,
			latency_ms: redisLatencyMs,
		},
		ai: {
			provider: process.env.OPENAI_API_KEY
				? 'openai'
				: process.env.OPENROUTER_API_KEY
				? 'openrouter'
				: 'not_configured',
			main_model: process.env.AI_MODEL_MAIN || 'gpt-4o',
			mini_model: process.env.AI_MODEL_MINI || 'gpt-4o-mini',
			vector_db: process.env.VECTOR_DB_PROVIDER || 'disabled',
		},
		timestamp: new Date().toISOString(),
	};
};

export default { health };
