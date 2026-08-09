import { StyleSheet, View } from 'react-native'
import { TvHomeScreen } from './screens/TvHomeScreen'
import { UserActionsProvider } from './hooks/useUserActions'
import { colors } from './theme/colors'

export const App = () => (
  <UserActionsProvider>
    <View style={styles.root}>
      <TvHomeScreen />
    </View>
  </UserActionsProvider>
)

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
})
