export type UserVisibleTodo = {
  name: string;
  status: "pending" | "in_progress" | "completed";
};

export type UserVisibleAgentEvent =
  | { type: "message"; text: string }
  | { type: "todos"; todos: UserVisibleTodo[] };

/**
 * Last-resort protection for model text crossing the user-visible boundary.
 * Prompting remains responsible for making the message useful; this function
 * only removes implementation details that should never appear in the chat.
 */
export function sanitizeUserVisibleText(text: string) {
  return text
    .replace(/```[\s\S]*?```/gu, "")
    .replace(/`(?:[^`]*[\\/][^`]*)`/gu, "相关内容")
    .replace(
      /(?:[A-Za-z]:\\|\/(?:workspace|Users|home|tmp|private|var|opt)\/)[^\s，。！？；：,!?;:)\]}]+/gu,
      "相关内容",
    )
    .replace(/(?:\.{0,2}[\\/])?(?:[\w.-]+[\\/])+[\w.-]+/gu, "相关内容")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

export function sanitizeUserVisibleTodos(todos: UserVisibleTodo[]) {
  return todos.map((todo) => ({
    ...todo,
    name: sanitizeUserVisibleText(todo.name),
  }));
}
