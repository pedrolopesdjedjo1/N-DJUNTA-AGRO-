import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://n-djunta-agro.onrender.com';

export type CreateReportParams = {
  productId: string | number;
  reportedUserId?: string | number;
  reason: string;
  description?: string;
};

export async function createProductReport(params: CreateReportParams) {
  const token = await AsyncStorage.getItem('@nodjuntaagro:token');

  const response = await fetch(`${API_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      targetType: 'PRODUCT',
      targetId: params.productId,
      productId: params.productId,
      reportedUserId: params.reportedUserId,
      reason: params.reason,
      description: params.description || '',
    }),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Erro ${response.status} ao enviar denúncia`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }

  return data;
}
