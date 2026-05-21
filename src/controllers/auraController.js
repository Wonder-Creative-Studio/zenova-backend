import auraService from '~/services/auraService';
import auraEventBus from '~/services/auraEventBus';
import { DEFAULT_TIMEZONE } from '~/utils/timezone';

const writeEvent = (res, event, data) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

export const getTodayAura = async (req, res) => {
  try {
    const timezone = req.query.timezone || req.get('X-Timezone') || DEFAULT_TIMEZONE;
    const aura = await auraService.calculateAura(req.user.id, { timezone });
    return res.json({
      success: true,
      data: aura,
      message: 'Aura score fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch aura score',
    });
  }
};

export const streamAura = async (req, res) => {
  const userId = req.user.id;
  const timezone = req.query.timezone || req.get('X-Timezone') || DEFAULT_TIMEZONE;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  let lastPayload = null;
  const sendAura = async () => {
    try {
      const aura = await auraService.calculateAura(userId, { timezone });
      const serialized = JSON.stringify(aura);
      if (serialized !== lastPayload) {
        lastPayload = serialized;
        writeEvent(res, 'aura', aura);
      }
    } catch (err) {
      writeEvent(res, 'error', { message: err.message || 'Failed to calculate aura score' });
    }
  };

  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {}
  }, 15_000);
  const refresh = setInterval(sendAura, 60_000);
  const eventName = `aura:${userId.toString()}`;

  auraEventBus.on(eventName, sendAura);
  req.on('close', () => {
    clearInterval(keepAlive);
    clearInterval(refresh);
    auraEventBus.off(eventName, sendAura);
  });

  await sendAura();
};

export default {
  getTodayAura,
  streamAura,
};

