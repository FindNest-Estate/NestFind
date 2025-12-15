import { Slot } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

export default function AgentLayout() {
    return (
        <View style={styles.container}>
            <Slot />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
});
