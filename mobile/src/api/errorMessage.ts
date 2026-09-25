type ApiError = {
  response?: {
    data?: {
      error?: unknown;
    } | string;
  };
  request?: unknown;
};

export function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  const responseData = apiError.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    typeof responseData.error === "string" &&
    responseData.error.trim()
  ) {
    return responseData.error;
  }

  if (apiError.request && !apiError.response) {
    return "Não foi possível conectar ao servidor. Verifique se o backend está ligado.";
  }

  return fallback;
}