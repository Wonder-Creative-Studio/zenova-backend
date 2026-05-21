import { EventEmitter } from 'events';

const auraEventBus = new EventEmitter();
auraEventBus.setMaxListeners(500);

export const emitAuraUpdate = (userId) => {
  if (!userId) return;
  auraEventBus.emit(`aura:${userId.toString()}`);
};

export default auraEventBus;

