export type LoginState = {
  success: boolean;
  message: string;
  payload?: FormData;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};
