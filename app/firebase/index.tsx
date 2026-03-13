import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { auth, db } from "../../firebase/firebaseConfig";

export default function FirebaseIndex() {
  useEffect(() => {
    const loadTodos = async () => {
      const todosCol = collection(db, "todos");
      const snapshot = await getDocs(todosCol);

      snapshot.forEach((doc) => {
        console.log(doc.id, doc.data());
      });
    };

    loadTodos();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is signed in.");
      } else {
        console.log("No user.");
      }
    });

    return unsubscribe;
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-base">Firebase ready</Text>
    </View>
  );
}
