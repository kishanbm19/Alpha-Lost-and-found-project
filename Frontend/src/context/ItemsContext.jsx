import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../api/client.js";

const ItemsContext = createContext(null);

export function ItemsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.items.list({ limit: 50 });
      setItems(data.items || []);
    } catch (err) {
      console.warn("Failed to fetch items from backend:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  const addItem = async (formData) => {
    const newItem = await api.items.create(formData);
    setItems((prev) => [newItem, ...prev]);
    return newItem;
  };

  const getItem = async (id) => {
    // Check local cache first or fetch fresh
    const cached = items.find((i) => i.id === id);
    if (cached) return cached;
    return await api.items.get(id);
  };

  return (
    <ItemsContext.Provider
      value={{
        items,
        loading,
        error,
        refreshItems,
        addItem,
        getItem,
      }}
    >
      {children}
    </ItemsContext.Provider>
  );
}

export const useItems = () => useContext(ItemsContext);
