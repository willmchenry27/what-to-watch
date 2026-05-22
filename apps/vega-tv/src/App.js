import { StyleSheet, View } from 'react-native'
import { TvHomeScreen } from './screens/TvHomeScreen'
import { colors } from './theme/colors'

export const App = () => (
  <View style={styles.root}>
    <TvHomeScreen />
  </View>
)

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
})
