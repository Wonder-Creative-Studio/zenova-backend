import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import FormData from 'form-data';
import s3StorageService from '~/services/s3StorageService';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/webm', 'audio/ogg', 'video/webm'];
const TEXT_TYPES = ['text/plain', 'text/markdown', 'text/csv', 'application/csv'];
const PDF_TYPES = ['application/pdf'];
const DOCX_TYPES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const MAX_EXTRACTED_TEXT = 12000;

const safeName = (name = 'file') => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);

const getKind = (file, explicitKind = null) => {
  if (explicitKind === 'audio' || AUDIO_TYPES.includes(file.mimetype)) return 'audio';
  if (IMAGE_TYPES.includes(file.mimetype)) return 'image';
  if ([...TEXT_TYPES, ...PDF_TYPES, ...DOCX_TYPES].includes(file.mimetype)) return 'document';
  return null;
};

const uploadFile = async ({ userId, threadId, file, kind }) => {
  const key = `chat/${userId}/${threadId}/${Date.now()}-${uuidv4()}-${safeName(file.originalname)}`;
  await s3StorageService.uploadBuffer({
    key,
    buffer: file.buffer,
    contentType: file.mimetype,
  });
  const signed = await s3StorageService.getSignedReadUrl(key);
  return {
    kind,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    s3Key: key,
    url: signed.url,
    urlExpiresAt: signed.expiresAt,
  };
};

const extractText = async (file) => {
  if (TEXT_TYPES.includes(file.mimetype) || /\.(txt|md|csv)$/i.test(file.originalname)) {
    return file.buffer.toString('utf8').slice(0, MAX_EXTRACTED_TEXT);
  }

  if (PDF_TYPES.includes(file.mimetype) || /\.pdf$/i.test(file.originalname)) {
    try {
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(file.buffer);
      return (result.text || '').slice(0, MAX_EXTRACTED_TEXT);
    } catch (err) {
      return '';
    }
  }

  if (DOCX_TYPES.includes(file.mimetype) || /\.docx$/i.test(file.originalname)) {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return (result.value || '').slice(0, MAX_EXTRACTED_TEXT);
    } catch (err) {
      return '';
    }
  }

  return '';
};

const transcribeAudio = async (file) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Audio transcription requires OPENAI_API_KEY.');
  }
  const formData = new FormData();
  formData.append('file', file.buffer, {
    filename: file.originalname || 'audio.webm',
    contentType: file.mimetype,
  });
  formData.append('model', process.env.AI_TRANSCRIPTION_MODEL || 'whisper-1');
  formData.append('response_format', 'json');

  const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      ...formData.getHeaders(),
    },
    timeout: 60_000,
    maxBodyLength: Infinity,
  });
  return (response.data?.text || '').trim();
};

export const processChatFiles = async ({ userId, threadId, files = {} }) => {
  const attachmentFiles = files.attachments || [];
  const audioFile = (files.audio || [])[0] || null;
  if (attachmentFiles.length > MAX_ATTACHMENTS) {
    throw new Error(`Maximum ${MAX_ATTACHMENTS} attachments are allowed.`);
  }

  const processed = [];
  let transcript = '';

  if (audioFile) {
    const kind = getKind(audioFile, 'audio');
    if (!kind || audioFile.size > MAX_AUDIO_SIZE) {
      throw new Error('Unsupported or oversized audio file.');
    }
    const uploaded = await uploadFile({ userId, threadId, file: audioFile, kind });
    transcript = await transcribeAudio(audioFile);
    processed.push({
      ...uploaded,
      transcript,
      providerMeta: { transcriptionModel: process.env.AI_TRANSCRIPTION_MODEL || 'whisper-1' },
    });
  }

  for (const file of attachmentFiles) {
    const kind = getKind(file);
    if (!kind) throw new Error(`Unsupported file type: ${file.originalname || file.mimetype}`);
    if (file.size > MAX_ATTACHMENT_SIZE) throw new Error(`File is too large: ${file.originalname}`);
    const uploaded = await uploadFile({ userId, threadId, file, kind });
    const extractedText = kind === 'document' ? await extractText(file) : '';
    processed.push({
      ...uploaded,
      extractedText,
      hasExtractedText: Boolean(extractedText),
      extension: path.extname(file.originalname || '').toLowerCase(),
    });
  }

  const extractedText = processed
    .filter(item => item.extractedText)
    .map(item => `Document ${item.originalName}:\n${item.extractedText}`)
    .join('\n\n')
    .slice(0, MAX_EXTRACTED_TEXT);
  const imageAttachments = processed.filter(item => item.kind === 'image');

  return {
    attachments: processed,
    transcript,
    extractedText,
    imageAttachments,
  };
};

export const signAttachmentsForClient = async (attachments = []) => Promise.all(attachments.map(async (attachment) => {
  const signed = attachment.s3Key ? await s3StorageService.getSignedReadUrl(attachment.s3Key) : {};
  return {
    kind: attachment.kind,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    url: signed.url || attachment.url,
    urlExpiresAt: signed.expiresAt || attachment.urlExpiresAt,
    transcript: attachment.transcript || '',
    hasExtractedText: Boolean(attachment.extractedText || attachment.hasExtractedText),
  };
}));

export default {
  processChatFiles,
  signAttachmentsForClient,
};
