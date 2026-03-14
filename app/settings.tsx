import { sendPasswordResetEmail, updateEmail } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { auth, db } from "../firebase/firebaseConfig";

interface UserData {
  age: string;
  weight: string;
  height: string;
  sex: string;
  targetWeight: string;
  activityLevel: string;
  goal: string;
  plan?: any;
  progress?: { date: string; weight: number; protein: number }[];
}

const EMPTY_USER_DATA: UserData = {
  age: "",
  weight: "",
  height: "",
  sex: "",
  targetWeight: "",
  activityLevel: "",
  goal: "",
  progress: [],
};

export default function Settings() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    loadUserData();
    setNewEmail(auth.currentUser?.email || "");
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setUserData(EMPTY_USER_DATA);
        return;
      }

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserData({ ...EMPTY_USER_DATA, ...(docSnap.data() as UserData) });
      } else {
        await setDoc(docRef, EMPTY_USER_DATA, { merge: true });
        setUserData(EMPTY_USER_DATA);
      }
    } catch (error) {
      console.log("Error loading settings profile:", error);
      setUserData(EMPTY_USER_DATA);
    }
  };

  const saveData = async () => {
    const user = auth.currentUser;
    if (!user || !userData) return;

    try {
      await setDoc(doc(db, "users", user.uid), userData as any, {
        merge: true,
      });
      setEditing(false);
      Alert.alert("Salvat!", "Datele personale au fost actualizate.");
    } catch (error) {
      Alert.alert("Eroare", "Nu am putut salva datele personale.");
    }
  };

  const onChangeEmail = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!newEmail.trim()) {
      Alert.alert("Eroare", "Introdu un email valid.");
      return;
    }

    try {
      await updateEmail(user, newEmail.trim());
      Alert.alert("Succes", "Email-ul a fost actualizat.");
    } catch (error: any) {
      if (error?.code === "auth/requires-recent-login") {
        Alert.alert(
          "Reautentificare necesară",
          "Pentru schimbarea email-ului, fă logout și login din nou.",
        );
      } else {
        Alert.alert("Eroare", "Nu am putut actualiza email-ul.");
      }
    }
  };

  const onResetPassword = async () => {
    const email = auth.currentUser?.email;
    if (!email) {
      Alert.alert("Eroare", "Nu există email asociat contului.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Email trimis",
        "Verifică inbox-ul pentru resetarea parolei.",
      );
    } catch (error) {
      Alert.alert("Eroare", "Nu am putut trimite email-ul de resetare.");
    }
  };

  if (!userData) return <Text>Loading...</Text>;

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="pt-12 pb-4 px-4 border-b border-gray-200">
        <Text className="text-xl font-bold">Settings</Text>
      </View>

      <View className="px-4 py-4">
        <Text className="text-lg font-bold mb-4">Detalii personale</Text>
        {editing ? (
          <>
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Vârstă"
              value={userData.age}
              onChangeText={(v) => setUserData({ ...userData, age: v })}
            />
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Greutate"
              value={userData.weight}
              onChangeText={(v) => setUserData({ ...userData, weight: v })}
            />
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Înălțime"
              value={userData.height}
              onChangeText={(v) => setUserData({ ...userData, height: v })}
            />
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Sex"
              value={userData.sex}
              onChangeText={(v) => setUserData({ ...userData, sex: v })}
            />
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Greutate țintă"
              value={userData.targetWeight}
              onChangeText={(v) =>
                setUserData({ ...userData, targetWeight: v })
              }
            />
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Nivel activitate"
              value={userData.activityLevel}
              onChangeText={(v) =>
                setUserData({ ...userData, activityLevel: v })
              }
            />
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-4"
              placeholder="Obiectiv"
              value={userData.goal}
              onChangeText={(v) => setUserData({ ...userData, goal: v })}
            />
            <View className="flex-row gap-2">
              <Pressable
                onPress={saveData}
                className="bg-blue-500 px-4 py-2 rounded"
              >
                <Text className="text-white">Salvează</Text>
              </Pressable>
              <Pressable
                onPress={() => setEditing(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                <Text>Anulează</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text>Vârstă: {userData.age}</Text>
            <Text>Greutate: {userData.weight}kg</Text>
            <Text>Înălțime: {userData.height}cm</Text>
            <Text>Sex: {userData.sex}</Text>
            <Text>Greutate țintă: {userData.targetWeight}kg</Text>
            <Text>Nivel activitate: {userData.activityLevel}</Text>
            <Text>Obiectiv: {userData.goal}</Text>
            <Pressable
              onPress={() => setEditing(true)}
              className="bg-blue-500 px-4 py-2 rounded mt-4"
            >
              <Text className="text-white">Editează</Text>
            </Pressable>
          </>
        )}

        <Text className="text-lg font-bold mt-8 mb-4">Cont</Text>

        <Text className="text-sm text-gray-600 mb-2">Schimbă email</Text>
        <TextInput
          className="border border-gray-300 rounded px-3 py-2 mb-2"
          placeholder="Email nou"
          value={newEmail}
          onChangeText={setNewEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Pressable
          onPress={onChangeEmail}
          className="bg-indigo-500 px-4 py-2 rounded mb-4"
        >
          <Text className="text-white">Actualizează email</Text>
        </Pressable>

        <Pressable
          onPress={onResetPassword}
          className="bg-orange-500 px-4 py-2 rounded mb-4"
        >
          <Text className="text-white">Resetează parola</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            Alert.alert("Confirmare", "Sigur vrei să te deloghezi?", [
              { text: "Nu", style: "cancel" },
              {
                text: "Da",
                style: "destructive",
                onPress: () => auth.signOut(),
              },
            ])
          }
          className="bg-red-500 px-4 py-2 rounded mb-10"
        >
          <Text className="text-white">Logout</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
