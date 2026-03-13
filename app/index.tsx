import { Text, View } from 'react-native';
import { passData } from '../src/passData';
export default function Index() {
  const calories = passData((state) => state.calories);

  return (
    <View>
      <Text>Hello, Petrica. You ate: {calories} calories</Text>
    </View>
  );
}
