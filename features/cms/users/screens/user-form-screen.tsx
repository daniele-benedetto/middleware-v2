"use client";

import { useState } from "react";

import { CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import { CmsArticleListPanel } from "@/components/cms/common/article-list-panel";
import { useSetCmsBreadcrumbLabel } from "@/components/cms/layout";
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
import {
  useUserById,
  type CreateUserInput,
  type UpdateUserInput,
  useUserCreate,
  useUserUpdate,
  useUserUpdateRole,
  type UserDetail,
} from "@/features/cms/users/hooks/use-user-crud";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { createUserInputSchema, updateUserInputSchema } from "@/lib/server/modules/users/schema";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

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
  onMutationError: (error: unknown) => void;
  onValidationError: (message: string) => void;
};

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

  useSetCmsBreadcrumbLabel(
    mode === "edit" ? (userQuery.data?.name ?? userQuery.data?.email ?? null) : null,
  );

  if (mode === "edit" && !userId) {
    return (
      <CmsErrorState
        title={userFormText.invalidTitle}
        description={formText.invalidEditIdDescription}
      />
    );
  }

  if (mode === "edit" && userQuery.isPending) {
    return <CmsLoadingState />;
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
        createMutation.isPending || updateMutation.isPending || updateRoleMutation.isPending
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
  const associatedArticles = (user?.articles ?? []).map((article) => ({
    id: article.id,
    title: article.title,
    isFeatured: article.isFeatured,
  }));

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
            <CmsActionButton variant="outline" onClick={onCancel} disabled={isMutating}>
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton type="submit" isLoading={isMutating}>
              {mode === "create" ? text.forms.create : text.forms.save}
            </CmsActionButton>
          </div>
        }
      />

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-0 overflow-hidden",
          mode === "edit" && "lg:grid-cols-[minmax(0,1fr)_360px]",
        )}
      >
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
            />
          </CmsFormField>
        </div>

        {mode === "edit" ? (
          <div className="cms-scroll flex min-h-0 min-w-0 flex-col overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
            <CmsArticleListPanel
              title={text.navigation.articles}
              emptyText={userFormText.articlesPanelEmpty}
              featuredAriaLabel={i18n.cms.lists.issues.articlesPanelFeaturedAria}
              articles={associatedArticles}
              className="min-h-0 flex-1"
            />
          </div>
        ) : null}
      </div>
    </form>
  );
}
