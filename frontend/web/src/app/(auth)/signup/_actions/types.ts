export type SignupState = {
  success: boolean;
  message: string;
  payload?: FormData;
  fieldErrors?: {
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
};
