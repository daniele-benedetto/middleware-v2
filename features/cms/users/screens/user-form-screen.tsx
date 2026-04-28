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

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EDITOR">("EDITOR");
  const [roleEdit, setRoleEdit] = useState<"" | "ADMIN" | "EDITOR">("");

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

  const isPending =
    createMutation.isPending || updateMutation.isPending || updateRoleMutation.isPending;

  const handleSubmit = async () => {
    const resolvedName = name || userQuery.data?.name || "";
    const resolvedImage = image || undefined;

    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createUserInputSchema,
          {
            email,
            name: resolvedName || undefined,
            role,
          },
          userFieldLabels,
        );

        if (!validation.ok) {
          cmsToast.error(validation.message, text.trpcErrors.badRequestTitle);
          return;
        }

        await createMutation.mutateAsync(validation.value);
        await invalidateAfterCmsMutation(trpcUtils, "users.create");
        success("Utente creato.");
        return;
      }

      const validation = validateFormInput(
        updateUserInputSchema,
        {
          name: resolvedName || undefined,
          image: resolvedImage,
        },
        userFieldLabels,
      );

      if (!validation.ok) {
        cmsToast.error(validation.message, text.trpcErrors.badRequestTitle);
        return;
      }

      await updateMutation.mutateAsync({
        id: userId!,
        data: validation.value,
      });

      const currentRole = userQuery.data?.role;
      const nextRole = roleEdit || currentRole;

      if (nextRole && currentRole && nextRole !== currentRole) {
        await updateRoleMutation.mutateAsync({
          id: userId!,
          data: { role: nextRole },
        });
      }

      await invalidateAfterCmsMutation(trpcUtils, "users.update", { id: userId });
      success("Utente aggiornato.");
    } catch (error) {
      const mapped = mapCrudDomainError(error, "users");
      cmsToast.error(mapped.description, mapped.title);
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
              <CmsTextInput
                id="user-email"
                type="email"
                value={userQuery.data?.email ?? ""}
                disabled
              />
            </CmsFormField>

            <CmsFormField label="Ruolo" htmlFor="user-role" required>
              <CmsSelect
                value={roleEdit || userQuery.data?.role || "EDITOR"}
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
            value={name || userQuery.data?.name || ""}
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
          <CmsActionButton variant="outline" onClick={cancel} disabled={isPending}>
            {text.common.cancel}
          </CmsActionButton>
          <CmsActionButton onClick={() => void handleSubmit()} isLoading={isPending}>
            {mode === "create" ? text.forms.create : text.forms.save}
          </CmsActionButton>
        </div>
      </div>
    </div>
  );
}
