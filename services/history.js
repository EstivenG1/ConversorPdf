const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'history.json');

function loadHistory() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading history:', err.message);
  }
  return [];
}

function saveHistory(list) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving history:', err.message);
  }
}

function addHistoryItem(item) {
  const list = loadHistory();
  const record = {
    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    timestamp: new Date().toISOString(),
    name: item.name || 'Archivo',
    operation: item.operation || 'Conversión',
    originalSize: item.originalSize || 0,
    resultSize: item.resultSize || 0,
    resultFileName: item.resultFileName || '',
    downloadUrl: item.downloadUrl || '',
    previewUrl: item.previewUrl || '',
    format: item.format || 'pdf',
    success: item.success !== false,
    notes: item.notes || ''
  };
  list.unshift(record);
  // Keep last 100 entries
  if (list.length > 100) list.pop();
  saveHistory(list);
  return record;
}

function deleteHistoryItem(id) {
  let list = loadHistory();
  const target = list.find(x => x.id === id);
  if (target && target.resultFileName) {
    const filePath = path.join(__dirname, '..', 'converted', target.resultFileName);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) {}
  }
  list = list.filter(x => x.id !== id);
  saveHistory(list);
  return true;
}

function clearAllHistory() {
  const list = loadHistory();
  for (const item of list) {
    if (item.resultFileName) {
      const filePath = path.join(__dirname, '..', 'converted', item.resultFileName);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (_) {}
    }
  }
  saveHistory([]);
  return true;
}

module.exports = {
  loadHistory,
  addHistoryItem,
  deleteHistoryItem,
  clearAllHistory
};
