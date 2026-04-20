// src/services/ai/ragService.js
// RAG retrieval layer. Graceful-degrades: if no vector DB is configured,
// returns empty block and the agent falls back to its own knowledge.
//
// When you provision Pinecone/Qdrant, set:
//   VECTOR_DB_URL, VECTOR_DB_API_KEY, VECTOR_DB_PROVIDER (pinecone|qdrant)
// and implement the provider-specific search inside `vectorSearch()`.
//
// MVP routes queries to the agent's namespace + zenova_core.
import axios from 'axios';
import openai, { resolveModel } from './openaiClient';
import logger from '~/config/logger';

const TOP_K = parseInt(process.env.RAG_TOP_K || '4', 10);
const MAX_TOKENS_BLOCK = 1500;

const isRagEnabled = () =>
	!!process.env.VECTOR_DB_URL && !!process.env.VECTOR_DB_API_KEY && !!process.env.VECTOR_DB_PROVIDER;

const NAMESPACES = {
	calia: ['calia_kb', 'zenova_core'],
	noura: ['noura_kb', 'zenova_core'],
	aeron: ['aeron_kb', 'zenova_core'],
};

// Lightweight classifier: decide if RAG is worth firing for this message.
// Skip RAG for small talk / emotional check-ins to save cost and latency.
const shouldUseRag = async (message, recentTurns = []) => {
	if (!isRagEnabled()) return false;
	try {
		const convo = recentTurns
			.slice(-3)
			.map((t) => `${t.role}: ${t.content}`)
			.join('\n');
		const { content } = await openai.chatComplete({
			model: resolveModel('mini'),
			messages: [
				{
					role: 'system',
					content:
						'You decide if a wellness-app user message benefits from retrieving knowledge-base articles (recipes, workouts, meditations, sleep guides, etc.). Reply with exactly "yes" or "no". Reply "no" for greetings, small talk, emotional venting, or personal questions that only need the user\'s own data.',
				},
				{ role: 'user', content: `Recent:\n${convo}\n\nLatest: ${message}` },
			],
			temperature: 0,
			maxTokens: 3,
		});
		return /^yes/i.test(content.trim());
	} catch (err) {
		logger.warn(`ragService: classifier failed, defaulting to false: ${err.message}`);
		return false;
	}
};

// Rewrite to a standalone query given recent turns.
const rewriteQuery = async (message, recentTurns = []) => {
	try {
		const convo = recentTurns
			.slice(-3)
			.map((t) => `${t.role}: ${t.content}`)
			.join('\n');
		const { content } = await openai.chatComplete({
			model: resolveModel('mini'),
			messages: [
				{
					role: 'system',
					content:
						'Rewrite the latest user message into a self-contained search query suitable for vector search. Keep it under 20 words. Return only the query, no quotes.',
				},
				{ role: 'user', content: `Recent:\n${convo}\n\nLatest: ${message}` },
			],
			temperature: 0,
			maxTokens: 40,
		});
		return content.trim();
	} catch {
		return message;
	}
};

// Embed text with OpenAI's text-embedding-3-small (compatible with OpenRouter too).
const embed = async (text) => {
	const openaiKey = process.env.OPENAI_API_KEY;
	const openrouterKey = process.env.OPENROUTER_API_KEY;
	const key = openaiKey || openrouterKey;
	const baseURL =
		process.env.OPENAI_BASE_URL ||
		(openaiKey ? 'https://api.openai.com/v1' : 'https://openrouter.ai/api/v1');
	const res = await axios.post(
		`${baseURL}/embeddings`,
		{ model: process.env.AI_EMBED_MODEL || 'text-embedding-3-small', input: text },
		{
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
			timeout: 30_000,
		}
	);
	return res.data?.data?.[0]?.embedding || null;
};

// --- Chroma HTTP client ---
const chromaSearch = async ({ embedding, namespace, topK }) => {
	const baseURL = process.env.VECTOR_DB_URL.replace(/\/$/, '');
	const apiKey = process.env.VECTOR_DB_API_KEY;
	const headers = { 'Content-Type': 'application/json' };
	if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

	try {
		const res = await axios.post(
			`${baseURL}/api/v1/collections/${namespace}/query`,
			{ query_embeddings: [embedding], n_results: topK, include: ['documents', 'metadatas', 'distances'] },
			{ headers, timeout: 10_000 }
		);
		const ids = res.data?.ids?.[0] || [];
		const docs = res.data?.documents?.[0] || [];
		const metas = res.data?.metadatas?.[0] || [];
		const dists = res.data?.distances?.[0] || [];
		return ids.map((_, i) => ({
			text: docs[i] || '',
			score: 1 - (dists[i] || 0),
			metadata: metas[i] || {},
		}));
	} catch (err) {
		// Collection may not exist yet — treat as empty
		logger.warn(`ragService: chroma query failed for namespace=${namespace}: ${err.message}`);
		return [];
	}
};

// Provider-agnostic vector search.
// Return: [{ text, score, metadata: { source_title, ... } }, ...]
const vectorSearch = async ({ embedding, namespaces, topK }) => {
	const provider = (process.env.VECTOR_DB_PROVIDER || '').toLowerCase();
	if (!provider) return [];

	if (provider === 'chroma' || provider === 'chromadb') {
		// Query each namespace (collection) and merge, deduplicated by text
		const results = await Promise.all(
			namespaces.map((ns) => chromaSearch({ embedding, namespace: ns, topK }))
		);
		const seen = new Set();
		return results
			.flat()
			.filter((h) => {
				if (!h.text || seen.has(h.text)) return false;
				seen.add(h.text);
				return true;
			})
			.sort((a, b) => b.score - a.score)
			.slice(0, topK);
	}

	logger.warn(`ragService: unknown VECTOR_DB_PROVIDER="${provider}". Supported: chroma.`);
	return [];
};

const packBlock = (hits) => {
	if (!hits?.length) return '';
	const lines = [];
	let tokensApprox = 0;
	for (const h of hits) {
		const chunk = h.text || h.metadata?.text || '';
		if (!chunk) continue;
		const size = Math.ceil(chunk.length / 4); // rough token estimate
		if (tokensApprox + size > MAX_TOKENS_BLOCK) break;
		tokensApprox += size;
		const title = h.metadata?.source_title || h.metadata?.source || 'Zenova';
		lines.push(`• (${title}) ${chunk.trim()}`);
	}
	return lines.join('\n\n');
};

/**
 * Main entry point: returns a RAG block string (possibly empty).
 */
export const retrieveContext = async ({ agent, message, recentTurns = [], profile = null }) => {
	if (!isRagEnabled()) return '';

	const useRag = await shouldUseRag(message, recentTurns);
	if (!useRag) return '';

	try {
		const query = await rewriteQuery(message, recentTurns);
		const embedding = await embed(query);
		if (!embedding) return '';

		const namespaces = NAMESPACES[agent] || ['zenova_core'];
		const hits = await vectorSearch({ embedding, namespaces, topK: TOP_K });

		// Optional: soft-filter on dietary tags when caller is Calia.
		let filtered = hits;
		if (agent === 'calia' && profile?.dietaryTags?.length) {
			filtered = hits.filter((h) => {
				const tags = h.metadata?.dietary_tags || [];
				if (!tags.length) return true;
				return profile.dietaryTags.some((t) => tags.includes(t));
			});
		}

		return packBlock(filtered.slice(0, TOP_K));
	} catch (err) {
		logger.warn(`ragService: retrieveContext failed, skipping: ${err.message}`);
		return '';
	}
};

export default { retrieveContext };
