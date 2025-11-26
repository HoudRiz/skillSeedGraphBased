
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

function useAsyncStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void, boolean] {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        async function loadStoredValue() {
            try {
                const item = await AsyncStorage.getItem(key);
                if (item) {
                    setStoredValue(JSON.parse(item));
                }
            } catch (error) {
                console.error('Error loading from AsyncStorage:', error);
            } finally {
                setIsLoaded(true);
            }
        }

        loadStoredValue();
    }, [key]);

    const setValue = useCallback(async (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            await AsyncStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error('Error saving to AsyncStorage:', error);
        }
    }, [key, storedValue]);

    return [storedValue, setValue, isLoaded];
}

export default useAsyncStorage;
