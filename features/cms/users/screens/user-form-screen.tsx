"use client";

import { useState } from "react";

import { CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsFormField,
  CmsPageHeader,
  CmsSelect,
  CmsTextInput,
  cmsToast,
} from "@/components/cms/primitives";
import { mapCrudDomainError, useCmsFormNavigation } from "@/features/cms/shared/forms";
import {
  useUserById,
  useUserCreate,
  useUserUpdate,
} from "@/features/cms/users/hooks/use-user-crud";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

type UserFormScreenProps = {
  mode: "create" | "edit";
  userId?: string;
};

export function CmsUserFormScreen({ mode, userId }: UserFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/users");
  const text = i18n.cms;
  const userQuery = useUserById(mode === "edit" ? userId : undefined);
  const createMutation = useUserCreate();
  const updateMutation = useUserUpdate();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EDITOR">("EDITOR");

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

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    if (mode === "create" && !email.trim()) {
      cmsToast.error("Email obbligatoria.", text.trpcErrors.badRequestTitle);
      return;
    }

    const resolvedName = name || userQuery.data?.name || "";
    const resolvedImage = image || undefined;

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          email,
          name: resolvedName || undefined,
          role,
        });
        await invalidateAfterCmsMutation(trpcUtils, "users.create");
        success("Utente creato.");
        return;
      }

      await updateMutation.mutateAsync({
        id: userId!,
        data: {
          name: resolvedName || undefined,
          image: resolvedImage,
        },
      });
      await invalidateAfterCmsMutation(trpcUtils, "users.update", { id: userId });
      success("Utente aggiornato.");
    } catch (error) {
      const mapped = mapCrudDomainError(error, "users");
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title={mode === "create" ? "Nuovo Utente" : "Modifica Utente"}
        subtitle="Preparazione CRUD route-based: form pronta per route dedicate."
      />

      <div className="space-y-4 border border-foreground p-4">
        {mode === "create" ? (
          <>
            <CmsFormField label="Email" htmlFor="user-email" required>
              <CmsTextInput
                id="user-email"
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
        ) : null}

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
            {mode === "create" ? "Crea" : "Salva"}
          </CmsActionButton>
        </div>
      </div>
    </div>
  );
}
