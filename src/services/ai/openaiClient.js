// src/services/ai/openaiClient.js
// Thin wrapper around OpenAI-compatible Chat Completions API.
// Works with OpenAI directly OR via OpenRouter (same schema).
// Env:
//   OPENAI_API_KEY  -> direct OpenAI (preferred when available)
//   OPENROUTER_API_KEY -> OpenRouter fallback (already used by the codebase)
//   OPENAI_BASE_URL -> override (defaults to OpenAI; else OpenRouter if OPENROUTER_API_KEY set)
import axios from 'axios';
import logger from '~/config/logger';

const resolveConfig = () => {
	const openaiKey = process.env.OPENAI_API_KEY;
	const openrouterKey = process.env.OPENROUTER_API_KEY;
	const key = openaiKey || openrouterKey;
	if (!key) {
		throw new Error('No LLM API key configured. Set OPENAI_API_KEY or OPENROUTER_API_KEY.');
	}
	const baseURL =
		process.env.OPENAI_BASE_URL ||
		(openaiKey ? 'https://api.openai.com/v1' : 'https://openrouter.ai/api/v1');
	return { key, baseURL, usingOpenRouter: !openaiKey && !!openrouterKey };
};

// Resolve a model id. When talking to OpenRouter, route through `openai/*` slugs.
export const resolveModel = (alias) => {
	const direct = {
		main: process.env.AI_MODEL_MAIN || 'gpt-4o',
		mini: process.env.AI_MODEL_MINI || 'gpt-4o-mini',
	};
	const { usingOpenRouter } = resolveConfig();
	const m = direct[alias] || alias;
	if (usingOpenRouter && !m.includes('/')) return `openai/${m}`;
	return m;
};

/**
 * Non-streaming chat completion.
 * @returns {Promise<{ content: string, usage?: object, model?: string }>}
 */
export const chatComplete = async ({ model, messages, temperature = 0.6, maxTokens = 600, responseFormat = null }) => {
	const { key, baseURL } = resolveConfig();
	const body = {
		model,
		messages,
		temperature,
		max_tokens: maxTokens,
	};
	if (responseFormat) body.response_format = responseFormat;

	const res = await axios.post(`${baseURL}/chat/completions`, body, {
		headers: {
			Authorization: `Bearer ${key}`,
			'Content-Type': 'application/json',
		},
		timeout: 60_000,
	});
	const choice = res.data?.choices?.[0];
	return {
		content: choice?.message?.content?.trim() || '',
		usage: res.data?.usage,
		model: res.data?.model,
	};
};

/**
 * Streaming chat completion. Yields { delta: string } chunks.
 * Consumer is expected to write SSE events to the HTTP response.
 */
export const chatStream = async function* ({ model, messages, temperature = 0.6, maxTokens = 800 }) {
	const { key, baseURL } = resolveConfig();

	const res = await axios.post(
		`${baseURL}/chat/completions`,
		{
			model,
			messages,
			temperature,
			max_tokens: maxTokens,
			stream: true,
		},
		{
			headers: {
				Authorization: `Bearer ${key}`,
				'Content-Type': 'application/json',
				Accept: 'text/event-stream',
			},
			responseType: 'stream',
			timeout: 120_000,
		}
	);

	let buffer = '';
	for await (const chunk of res.data) {
		buffer += chunk.toString('utf-8');
		let newlineIdx;
		// eslint-disable-next-line no-cond-assign
		while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
			const line = buffer.slice(0, newlineIdx).trim();
			buffer = buffer.slice(newlineIdx + 1);
			if (!line.startsWith('data:')) continue;
			const payload = line.slice(5).trim();
			if (payload === '[DONE]') return;
			try {
				const json = JSON.parse(payload);
				const delta = json?.choices?.[0]?.delta?.content;
				if (delta) yield { delta };
			} catch (err) {
				logger.warn(`openaiClient: malformed stream chunk: ${payload.slice(0, 120)}`);
			}
		}
	}
};

export default { chatComplete, chatStream, resolveModel };
