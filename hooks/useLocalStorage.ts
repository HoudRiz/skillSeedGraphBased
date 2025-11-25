import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item != null) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.warn('Failed to read from storage', error);
      } finally {
        setHydrated(true);
      }
    };

    load();
  }, [key]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((current) => {
        const valueToStore = value instanceof Function ? value(current) : value;
        AsyncStorage.setItem(key, JSON.stringify(valueToStore)).catch((error) =>
          console.warn('Failed to persist to storage', error)
        );
        return valueToStore;
      });
    },
    [key]
  );

  return [storedValue, setValue, hydrated];
}

export default useLocalStorage;
