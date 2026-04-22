"use client";

import { usePathname } from "next/navigation";

import { cmsEyebrowClassName } from "@/components/cms/primitives/typography";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { i18n } from "@/lib/i18n";

const formatSegment = (segment: string) => {
  const routeLabels = i18n.cms.routeLabels as Record<string, string>;

  if (routeLabels[segment]) {
    return routeLabels[segment];
  }

  return segment.charAt(0).toUpperCase() + segment.slice(1);
};

export function CmsBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname
    .replace(/^\/cms/, "")
    .split("/")
    .filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/cms" className={cmsEyebrowClassName}>
            {i18n.cms.breadcrumbs.root}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment, index) => {
          const href = `/cms/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;

          return (
            <div key={href} className="flex items-center">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className={cmsEyebrowClassName}>
                    {formatSegment(segment)}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href} className={cmsEyebrowClassName}>
                    {formatSegment(segment)}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
