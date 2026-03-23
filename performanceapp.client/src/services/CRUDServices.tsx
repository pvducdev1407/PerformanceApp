import axiosClient from './axiosClient';
export interface ResultResponse<T = unknown> {
  success: boolean;
  result?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export default class CRUDServices {
  static async getData<T>(
  url: string,
  params: Record<string, unknown> = {}
): Promise<ResultResponse<T>> {
  return (await axiosClient.get<ResultResponse<T>>(url, { params })).data;
}

 static async postData<T, D = unknown>(
  url: string,
  data: D
): Promise<ResultResponse<T>> {
  const response = await axiosClient.post<ResultResponse<T>>(url, data);
  return response.data; // ✅ Đúng kiểu ResultResponse<T>
}
}
