import { SavedItem } from "../types";

const STORAGE_KEY = "bge_saved_items";
const USER_ID_KEY = "bge_client_user_id";

// Get or initialize persistent client user ID
export function getOrCreateUserId(): string {
  try {
    let uid = localStorage.getItem(USER_ID_KEY);
    if (!uid) {
      uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(USER_ID_KEY, uid);
    }
    return uid;
  } catch {
    return "guest-user";
  }
}

// Load items from local storage (or ready for Firestore collection fetch)
export function loadSavedItems(): SavedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items: SavedItem[] = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.warn("Could not read saved items from storage:", err);
    return [];
  }
}

// Save or insert a new item
export function saveReportItem(
  itemData: Omit<SavedItem, "id" | "createdAt">,
  customId?: string
): SavedItem {
  const userId = getOrCreateUserId();
  const now = new Date().toISOString();
  const newItem: SavedItem = {
    ...itemData,
    id: customId || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const current = loadSavedItems();
    const updated = [newItem, ...current.filter((i) => i.id !== newItem.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Storage write error:", err);
  }

  return newItem;
}

// Update an existing item
export function updateReportItem(
  id: string,
  patch: Partial<Omit<SavedItem, "id" | "createdAt">>
): SavedItem | null {
  try {
    const current = loadSavedItems();
    const index = current.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const updatedItem: SavedItem = {
      ...current[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    current[index] = updatedItem;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return updatedItem;
  } catch (err) {
    console.error("Storage update error:", err);
    return null;
  }
}

// Delete item
export function deleteReportItem(id: string): boolean {
  try {
    const current = loadSavedItems();
    const filtered = current.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error("Storage delete error:", err);
    return false;
  }
}
