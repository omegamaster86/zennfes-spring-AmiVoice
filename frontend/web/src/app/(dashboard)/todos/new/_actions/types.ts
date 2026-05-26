/**
 * ToDo作成アクションの状態型
 */
export type CreateTodoState = {
  success: boolean;
  message: string;
  payload?: FormData;
  fieldErrors?: {
    title?: string[];
    description?: string[];
    priority?: string[];
  };
};
