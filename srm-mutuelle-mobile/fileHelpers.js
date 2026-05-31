import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL, getSession, parseJsonOrThrow, apiFetch } from './api';

/** Télécharge un fichier authentifié et ouvre le partage système (PDF, DOCX…). */
export async function downloadAndShare(path, filename) {
  const auth = await getSession();
  const url = `${API_BASE_URL.replace(/\/$/, '')}${path}`;
  const safeName = filename.replace(/[^\w.\-() ]+/g, '_');
  const dest = `${FileSystem.cacheDirectory}${safeName}`;
  const result = await FileSystem.downloadAsync(url, dest, {
    headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
  });
  if (result.status !== 200) {
    throw new Error(`Téléchargement impossible (HTTP ${result.status})`);
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: guessMime(safeName), dialogTitle: safeName });
  }
  return result.uri;
}

function guessMime(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

/** Sélectionne un PDF pour upload multipart. */
export async function pickPdfFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name || 'document.pdf',
    type: asset.mimeType || 'application/pdf',
  };
}

/** Envoie un FormData avec fichier RN (uri/name/type). */
export async function uploadMultipart(path, fields, file) {
  const body = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v != null && v !== '') body.append(k, String(v));
  });
  if (file) {
    body.append('file', { uri: file.uri, name: file.name, type: file.type });
  }
  const res = await apiFetch(path, { method: 'POST', body });
  return parseJsonOrThrow(res);
}
