"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createLogger } from "@/services/logger";
import {
  addMockTodo,
  getNextTodoIdAndIncrement,
  removeMockTodo,
  resetTodoStore,
  updateMockTodo,
} from "@/services/mock-store/stores/todo";
import type { ActionResponse, MockTodo } from "@/types/demo-types";
import { CreateTodoFormSchema, UpdateTodoSchema } from "./schema";
import type { CreateTodoState } from "./types";

export type { CreateTodoState } from "./types";

export async function createTodoMock(
  _prevState: CreateTodoState,
  formData: FormData,
): Promise<CreateTodoState> {
  const logger = createLogger("createTodoMock");
  logger.start({
    title: formData.get("title"),
    priority: formData.get("priority"),
  });

  try {
    const rawFormData = {
      title: formData.get("title"),
      description: formData.get("description") || null,
      priority: formData.get("priority"),
    };

    const validationResult = CreateTodoFormSchema.safeParse(rawFormData);

    if (!validationResult.success) {
      const fieldErrors: {
        title?: string[];
        description?: string[];
        priority?: string[];
      } = {};

      for (const issue of validationResult.error.issues) {
        const path = issue.path[0] as string;
        if (!fieldErrors[path as keyof typeof fieldErrors]) {
          fieldErrors[path as keyof typeof fieldErrors] = [];
        }
        fieldErrors[path as keyof typeof fieldErrors]?.push(issue.message);
      }

      logger.warn("validation_failed", { fieldErrors });
      logger.end({ success: false, errorMessage: "入力内容が不正です" });

      return {
        success: false,
        message: "入力内容が不正です",
        payload: formData,
        fieldErrors,
      };
    }

    const validatedData = validationResult.data;

    const newTodo: MockTodo = {
      id: getNextTodoIdAndIncrement(),
      title: validatedData.title.trim(),
      description: validatedData.description?.trim() || null,
      priority: validatedData.priority,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    addMockTodo(newTodo);

    logger.info("todo_created", { todoId: newTodo.id });
    logger.end({ success: true });
  } catch (error) {
    logger.error(error, { context: "createTodoMock" });
    logger.end({
      success: false,
      errorMessage: "予期しないエラーが発生しました",
    });
    return {
      success: false,
      message: "予期しないエラーが発生しました",
      payload: formData,
    };
  }

  revalidatePath("/demo/todos");
  redirect("/demo/todos");
}

export async function updateTodoMock(
  id: number,
  updates: Partial<Omit<MockTodo, "id" | "createdAt">>,
): Promise<ActionResponse<MockTodo>> {
  const logger = createLogger("updateTodoMock");
  logger.start({ todoId: id, updates });

  try {
    const validationResult = UpdateTodoSchema.safeParse(updates);
    if (!validationResult.success) {
      logger.warn("validation_failed", {
        error: validationResult.error,
      });
      logger.end({ success: false, errorMessage: "更新内容が不正です" });
      return {
        success: false,
        message: "更新内容が不正です",
        error: "VALIDATION_ERROR",
      };
    }

    const updatedTodo = updateMockTodo(id, validationResult.data);

    if (!updatedTodo) {
      logger.warn("todo_not_found", { todoId: id });
      logger.end({ success: false, errorMessage: "ToDoが見つかりません" });
      return {
        success: false,
        message: "ToDoが見つかりません",
        error: "NOT_FOUND",
      };
    }

    logger.info("todo_updated", { todoId: id });
    logger.end({ success: true });

    return {
      success: true,
      message: "ToDoを更新しました",
      data: updatedTodo,
    };
  } catch (error) {
    logger.error(error, { context: "updateTodoMock" });
    logger.end({
      success: false,
      errorMessage: "予期しないエラーが発生しました",
    });
    return {
      success: false,
      message: "予期しないエラーが発生しました",
      error: "UNEXPECTED_ERROR",
    };
  }
}

export async function deleteTodoMock(
  id: number,
): Promise<ActionResponse<void>> {
  const logger = createLogger("deleteTodoMock");
  logger.start({ todoId: id });

  try {
    const deletedTodo = removeMockTodo(id);

    if (!deletedTodo) {
      logger.warn("todo_not_found", { todoId: id });
      logger.end({ success: false, errorMessage: "ToDoが見つかりません" });
      return {
        success: false,
        message: "ToDoが見つかりません",
        error: "NOT_FOUND",
      };
    }

    logger.info("todo_deleted", { todoId: id });
    logger.end({ success: true });

    return {
      success: true,
      message: "ToDoを削除しました",
    };
  } catch (error) {
    logger.error(error, { context: "deleteTodoMock" });
    logger.end({
      success: false,
      errorMessage: "予期しないエラーが発生しました",
    });
    return {
      success: false,
      message: "予期しないエラーが発生しました",
      error: "UNEXPECTED_ERROR",
    };
  }
}

export async function resetMockTodos(): Promise<ActionResponse<void>> {
  const logger = createLogger("resetMockTodos");
  logger.start();

  try {
    resetTodoStore();

    logger.info("data_reset_completed");
    logger.end({ success: true });

    return {
      success: true,
      message: "データをリセットしました",
    };
  } catch (error) {
    logger.error(error, { context: "resetMockTodos" });
    logger.end({ success: false, errorMessage: "リセットに失敗しました" });
    return {
      success: false,
      message: "リセットに失敗しました",
      error: "UNEXPECTED_ERROR",
    };
  }
}
