export type CreateUserInput = {
  email: string;
  name?: string;
  role: "ADMIN" | "EDITOR";
};

export type UpdateUserInput = {
  name?: string;
  image?: string;
};

export type UpdateUserRoleInput = {
  role: "ADMIN" | "EDITOR";
};
