import { useWindowDimensions } from 'react-native';

interface WindowSize {
  width: number;
  height: number;
}

function useWindowSize(): WindowSize {
  const { width, height } = useWindowDimensions();
  return { width, height };
}

export default useWindowSize;
