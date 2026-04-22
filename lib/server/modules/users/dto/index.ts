export type UserListItemDto = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "EDITOR";
  createdAt: string;
};

export type UserDetailDto = UserListItemDto;
