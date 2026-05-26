export type ResetPasswordState = {
  success: boolean;
  message: string;
  fieldErrors?: {
    password?: string[];
    confirmPassword?: string[];
  };
};
