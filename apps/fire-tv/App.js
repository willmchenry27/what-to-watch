import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View } from 'react-native'
import { TvHomeScreen } from './src/screens/TvHomeScreen'
import { UserActionsProvider } from './src/hooks/useUserActions'
import { colors } from './src/theme/colors'

export default function App() {
  return (
    <UserActionsProvider>
      <View style={styles.root}>
        <StatusBar style="light" hidden />
        <TvHomeScreen />
      </View>
    </UserActionsProvider>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
})
