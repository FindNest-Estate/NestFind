import { Slot } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function Layout() {
    return (
        <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
                <Slot />
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
