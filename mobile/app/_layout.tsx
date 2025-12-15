import { Slot } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function Layout() {
    return (
        <SafeAreaProvider>
            <Slot />
        </SafeAreaProvider>
    );
}
