"use client";

import { Plus, Save, Trash2, WandSparkles, X } from "lucide-react";
import { useState } from "react";

import { CmsConfirmDialog, CmsErrorState } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsFormField,
  CmsPageHeader,
  CmsSelect,
  CmsTextInput,
  cmsToast,
} from "@/components/cms/primitives";
import {
  mapCrudDomainError,
  useCmsFormNavigation,
  validateFormInput,
} from "@/features/cms/shared/forms";
import { CmsUserFormLoading } from "@/features/cms/users/components/user-form-loading";
import {
  useUserById,
  useUserCreate,
  useUserUpdate,
  useUserUpdateRole,
  type CreateUserInput,
  type UpdateUserInput,
  type UserDetail,
} from "@/features/cms/users/hooks/use-user-crud";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { createUserInputSchema, updateUserInputSchema } from "@/lib/server/modules/users/schema";
import { trpc } from "@/lib/trpc/react";

type UserFormScreenProps = {
  mode: "create" | "edit";
  userId?: string;
  initialData?: UserDetail;
  currentUserId?: string;
};

type UserFormContentProps = {
  mode: "create" | "edit";
  userId?: string;
  user?: UserDetail;
  currentUserId?: string;
  isMutating: boolean;
  onCancel: () => void;
  onCreate: (payload: CreateUserInput) => Promise<void>;
  onUpdate: (payload: {
    id: string;
    data: UpdateUserInput;
    nextRole?: "ADMIN" | "EDITOR";
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMutationError: (error: unknown) => void;
  onValidationError: (message: string) => void;
};

const PASSWORD_LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const PASSWORD_UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PASSWORD_NUMBERS = "0123456789";
const PASSWORD_SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";

function randomIndex(length: number) {
  const value = new Uint32Array(1);
  globalThis.crypto.getRandomValues(value);
  return value[0] % length;
}

function generateStrongPassword() {
  const groups = [PASSWORD_LOWERCASE, PASSWORD_UPPERCASE, PASSWORD_NUMBERS, PASSWORD_SYMBOLS];
  const allCharacters = groups.join("");
  const characters = groups.map((group) => group[randomIndex(group.length)]);

  while (characters.length < 16) {
    characters.push(allCharacters[randomIndex(allCharacters.length)]);
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join("");
}

export function CmsUserFormScreen({
  mode,
  userId,
  initialData,
  currentUserId,
}: UserFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/users");
  const text = i18n.cms;
  const formText = text.forms;
  const userFormText = formText.resources.users;
  const userQuery = useUserById(mode === "edit" ? userId : undefined, { initialData });
  const createMutation = useUserCreate();
  const updateMutation = useUserUpdate();
  const updateRoleMutation = useUserUpdateRole();
  const deleteMutation = trpc.users.delete.useMutation();

  if (mode === "edit" && !userId) {
    return (
      <CmsErrorState
        title={userFormText.invalidTitle}
        description={formText.invalidEditIdDescription}
      />
    );
  }

  if (mode === "edit" && userQuery.isPending) {
    return <CmsUserFormLoading mode="edit" />;
  }

  if (mode === "edit" && userQuery.isError) {
    const mapped = mapCrudDomainError(userQuery.error, "users");
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  return (
    <UserFormContent
      key={mode === "edit" ? (userQuery.data?.id ?? userId) : "create"}
      mode={mode}
      userId={userId}
      user={userQuery.data}
      currentUserId={currentUserId}
      isMutating={
        createMutation.isPending ||
        updateMutation.isPending ||
        updateRoleMutation.isPending ||
        deleteMutation.isPending
      }
      onCancel={cancel}
      onCreate={async (payload) => {
        await createMutation.mutateAsync(payload);
        await invalidateAfterCmsMutation(trpcUtils, "users.create");
        success(userFormText.created);
      }}
      onUpdate={async ({ id, data, nextRole }) => {
        await updateMutation.mutateAsync({ id, data });

        if (nextRole && userQuery.data?.role && nextRole !== userQuery.data.role) {
          try {
            await updateRoleMutation.mutateAsync({
              id,
              data: { role: nextRole },
            });
          } catch (error) {
            const mapped = mapCrudDomainError(error, "users");
            await invalidateAfterCmsMutation(trpcUtils, "users.update", { id });
            cmsToast.error(userFormText.updateRoleFailed(mapped.description), mapped.title);
            cancel();
            return;
          }
        }

        await invalidateAfterCmsMutation(trpcUtils, "users.update", { id });
        success(userFormText.updated);
      }}
      onDelete={async (id) => {
        await deleteMutation.mutateAsync({ id });
        await invalidateAfterCmsMutation(trpcUtils, "users.delete", { id });
        success();
      }}
      onMutationError={(error) => {
        const mapped = mapCrudDomainError(error, "users");
        cmsToast.error(mapped.description, mapped.title);
      }}
      onValidationError={(message) => {
        cmsToast.error(message, text.trpcErrors.badRequestTitle);
      }}
    />
  );
}

function UserFormContent({
  mode,
  userId,
  user,
  currentUserId,
  isMutating,
  onCancel,
  onCreate,
  onUpdate,
  onDelete,
  onMutationError,
  onValidationError,
}: UserFormContentProps) {
  const text = i18n.cms;
  const formText = text.forms;
  const userFormText = formText.resources.users;
  const fieldText = formText.fields;
  const userFieldLabels = {
    email: fieldText.email,
    name: fieldText.name,
    password: fieldText.password,
    role: fieldText.role,
  };
  const [email, setEmail] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EDITOR">("EDITOR");
  const [roleEdit, setRoleEdit] = useState<"ADMIN" | "EDITOR">(user?.role ?? "EDITOR");
  const isCurrentUser = mode === "edit" && user?.id === currentUserId;

  const handleSubmit = async () => {
    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createUserInputSchema,
          {
            email,
            name: name || undefined,
            password,
            role,
          },
          userFieldLabels,
        );

        if (!validation.ok) {
          onValidationError(validation.message);
          return;
        }

        await onCreate(validation.value);
        return;
      }

      const validation = validateFormInput(
        updateUserInputSchema,
        {
          name: name ? name : null,
          password: password || undefined,
        },
        userFieldLabels,
      );

      if (!validation.ok) {
        onValidationError(validation.message);
        return;
      }

      await onUpdate({
        id: userId!,
        data: validation.value,
        nextRole: isCurrentUser ? undefined : roleEdit,
      });
    } catch (error) {
      onMutationError(error);
    }
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <CmsPageHeader
        title={mode === "create" ? userFormText.createTitle : userFormText.editTitle}
        actions={
          <div className="flex items-center gap-2">
            {mode === "edit" && userId && !isCurrentUser ? (
              <CmsConfirmDialog
                triggerLabel={text.quickActions.delete}
                triggerIcon={<Trash2 aria-hidden />}
                triggerDisabled={isMutating}
                title={text.quickActions.confirmDeleteTitle}
                description={text.quickActions.confirmDeleteSingleUser}
                tone="danger"
                onConfirm={() => onDelete(userId)}
              />
            ) : null}
            <CmsActionButton variant="outline" onClick={onCancel} disabled={isMutating}>
              <X aria-hidden />
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton type="submit" isLoading={isMutating}>
              {mode === "create" ? <Plus aria-hidden /> : <Save aria-hidden />}
              {mode === "create" ? text.forms.create : text.forms.save}
            </CmsActionButton>
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="cms-scroll min-h-0 min-w-0 space-y-5 overflow-y-auto pb-6 lg:pr-6">
          {mode === "create" ? (
            <>
              <CmsFormField label={fieldText.email} htmlFor="user-email" required>
                <CmsTextInput
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </CmsFormField>

              <CmsFormField label={fieldText.role} htmlFor="user-role" required>
                <CmsSelect
                  value={role}
                  onValueChange={(value) => setRole(value as "ADMIN" | "EDITOR")}
                  options={[
                    { value: "EDITOR", label: userFormText.roleEditorLabel },
                    { value: "ADMIN", label: userFormText.roleAdminLabel },
                  ]}
                />
              </CmsFormField>
            </>
          ) : (
            <>
              <CmsFormField label={fieldText.email} htmlFor="user-email">
                <CmsTextInput id="user-email" type="email" value={user?.email ?? ""} disabled />
              </CmsFormField>

              <CmsFormField
                label={fieldText.role}
                htmlFor="user-role"
                required
                hint={isCurrentUser ? userFormText.selfRoleHint : undefined}
              >
                <CmsSelect
                  value={roleEdit}
                  disabled={isCurrentUser}
                  onValueChange={(value) => setRoleEdit(value as "ADMIN" | "EDITOR")}
                  options={[
                    { value: "EDITOR", label: userFormText.roleEditorLabel },
                    { value: "ADMIN", label: userFormText.roleAdminLabel },
                  ]}
                />
              </CmsFormField>
            </>
          )}

          <CmsFormField label={fieldText.name} htmlFor="user-name">
            <CmsTextInput
              id="user-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </CmsFormField>

          <CmsFormField
            label={fieldText.password}
            htmlFor="user-password"
            required={mode === "create"}
            hint={
              mode === "create" ? userFormText.passwordCreateHint : userFormText.passwordEditHint
            }
          >
            <CmsTextInput
              id="user-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              showPasswordToggle
              endAction={
                <button
                  type="button"
                  className="inline-flex size-7 items-center justify-center rounded-(--radius-control) text-muted-foreground hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:pointer-events-none disabled:text-border"
                  onClick={() => setPassword(generateStrongPassword())}
                  disabled={isMutating}
                  aria-label={formText.generatePassword}
                >
                  <WandSparkles className="size-4" aria-hidden />
                </button>
              }
            />
          </CmsFormField>
        </div>
      </div>
    </form>
  );
}
