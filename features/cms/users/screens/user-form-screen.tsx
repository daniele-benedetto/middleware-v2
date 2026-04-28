"use client";

import { useState } from "react";

import { CmsErrorState, CmsLoadingState } from "@/components/cms/common";
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
  useUserCreate,
  useUserUpdate,
  useUserUpdateRole,
  type UserDetail,
} from "@/features/cms/users/hooks/use-user-crud";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { createUserInputSchema, updateUserInputSchema } from "@/lib/server/modules/users/schema";
import { trpc } from "@/lib/trpc/react";

const userFieldLabels = {
  email: "Email",
  name: "Nome",
  role: "Ruolo",
  image: "Immagine",
};

type UserFormScreenProps = {
  mode: "create" | "edit";
  userId?: string;
  initialData?: UserDetail;
};

type UserFormContentProps = {
  mode: "create" | "edit";
  userId?: string;
  user?: UserDetail;
  isMutating: boolean;
  onCancel: () => void;
  onCreate: (payload: { email: string; name?: string; role: "ADMIN" | "EDITOR" }) => Promise<void>;
  onUpdate: (payload: {
    id: string;
    data: { name?: string | null; image?: string | null };
    nextRole?: "ADMIN" | "EDITOR";
  }) => Promise<void>;
  onMutationError: (error: unknown) => void;
  onValidationError: (message: string) => void;
};

export function CmsUserFormScreen({ mode, userId, initialData }: UserFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/users");
  const text = i18n.cms;
  const userQuery = useUserById(mode === "edit" ? userId : undefined, { initialData });
  const createMutation = useUserCreate();
  const updateMutation = useUserUpdate();
  const updateRoleMutation = useUserUpdateRole();

  useSetCmsBreadcrumbLabel(
    mode === "edit" ? (userQuery.data?.name ?? userQuery.data?.email ?? null) : null,
  );

  if (mode === "edit" && !userId) {
    return <CmsErrorState title="Utente non valido" description="ID mancante per la modifica." />;
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
      isMutating={
        createMutation.isPending || updateMutation.isPending || updateRoleMutation.isPending
      }
      onCancel={cancel}
      onCreate={async (payload) => {
        await createMutation.mutateAsync(payload);
        await invalidateAfterCmsMutation(trpcUtils, "users.create");
        success("Utente creato.");
      }}
      onUpdate={async ({ id, data, nextRole }) => {
        await updateMutation.mutateAsync({ id, data });

        if (nextRole && userQuery.data?.role && nextRole !== userQuery.data.role) {
          await updateRoleMutation.mutateAsync({
            id,
            data: { role: nextRole },
          });
        }

        await invalidateAfterCmsMutation(trpcUtils, "users.update", { id });
        success("Utente aggiornato.");
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
  isMutating,
  onCancel,
  onCreate,
  onUpdate,
  onMutationError,
  onValidationError,
}: UserFormContentProps) {
  const text = i18n.cms;
  const [email, setEmail] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [image, setImage] = useState(user?.image ?? "");
  const [role, setRole] = useState<"ADMIN" | "EDITOR">("EDITOR");
  const [roleEdit, setRoleEdit] = useState<"ADMIN" | "EDITOR">(user?.role ?? "EDITOR");

  const handleSubmit = async () => {
    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createUserInputSchema,
          {
            email,
            name: name || undefined,
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
          image: image ? image : null,
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
        nextRole: roleEdit,
      });
    } catch (error) {
      onMutationError(error);
    }
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader title={mode === "create" ? "Nuovo Utente" : "Modifica Utente"} />

      <div className="space-y-4 border border-foreground p-4">
        {mode === "create" ? (
          <>
            <CmsFormField label="Email" htmlFor="user-email" required>
              <CmsTextInput
                id="user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </CmsFormField>

            <CmsFormField label="Ruolo" htmlFor="user-role" required>
              <CmsSelect
                value={role}
                onValueChange={(value) => setRole(value as "ADMIN" | "EDITOR")}
                options={[
                  { value: "EDITOR", label: "EDITOR" },
                  { value: "ADMIN", label: "ADMIN" },
                ]}
              />
            </CmsFormField>
          </>
        ) : (
          <>
            <CmsFormField label="Email" htmlFor="user-email">
              <CmsTextInput id="user-email" type="email" value={user?.email ?? ""} disabled />
            </CmsFormField>

            <CmsFormField label="Ruolo" htmlFor="user-role" required>
              <CmsSelect
                value={roleEdit}
                onValueChange={(value) => setRoleEdit(value as "ADMIN" | "EDITOR")}
                options={[
                  { value: "EDITOR", label: "EDITOR" },
                  { value: "ADMIN", label: "ADMIN" },
                ]}
              />
            </CmsFormField>
          </>
        )}

        <CmsFormField label="Nome" htmlFor="user-name">
          <CmsTextInput
            id="user-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </CmsFormField>

        {mode === "edit" ? (
          <CmsFormField label="Immagine (URL)" htmlFor="user-image">
            <CmsTextInput
              id="user-image"
              value={image}
              onChange={(event) => setImage(event.target.value)}
            />
          </CmsFormField>
        ) : null}

        <div className="flex items-center gap-2">
          <CmsActionButton variant="outline" onClick={onCancel} disabled={isMutating}>
            {text.common.cancel}
          </CmsActionButton>
          <CmsActionButton onClick={() => void handleSubmit()} isLoading={isMutating}>
            {mode === "create" ? text.forms.create : text.forms.save}
          </CmsActionButton>
        </div>
      </div>
    </div>
  );
}
