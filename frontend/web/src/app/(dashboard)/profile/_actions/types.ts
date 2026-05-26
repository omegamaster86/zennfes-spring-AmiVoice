export type UpdateEmailState = {
  success: boolean;
  message: string;
  payload?: FormData;
  fieldErrors?: {
    email?: string[];
  };
};

export type UpdatePasswordState = {
  success: boolean;
  message: string;
  fieldErrors?: {
    password?: string[];
    confirmPassword?: string[];
  };
};
