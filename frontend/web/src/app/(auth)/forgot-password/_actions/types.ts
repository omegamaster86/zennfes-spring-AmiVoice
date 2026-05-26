export type ForgotPasswordState = {
  success: boolean;
  message: string;
  payload?: FormData;
  fieldErrors?: {
    email?: string[];
  };
};
