import api from './client';

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const getNotifications = async (): Promise<Notification[]> => {
  const response = await api.get('/api/notifications');
  return response.data;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await api.patch(`/api/notifications/${id}/read`);
};
