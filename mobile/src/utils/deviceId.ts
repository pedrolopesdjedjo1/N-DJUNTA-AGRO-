import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "nodjunta_device_id";
let memory: string | null = null;

function randomId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "d";
  for (let i = 0; i < 24; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Um identificador que fica neste telemóvel, para a conta saber que aparelhos a usam
export async function getDeviceId(): Promise<string | null> {
  if (memory) return memory;

  try {
    let id = await AsyncStorage.getItem(KEY);
    if (!id) {
      id = randomId();
      await AsyncStorage.setItem(KEY, id);
    }
    memory = id;
    return id;
  } catch (error) {
    return null;
  }
}
