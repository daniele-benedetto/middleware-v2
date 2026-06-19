const CMS_ROOT_PATH = "/cms";
const CMS_HOME_PATH = "/cms/issues";
const CMS_LOGIN_PATH = "/cms/login";

export const CMS_NEXT_PATH_HEADER = "x-cms-next-path";

export function getSafeCmsNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return CMS_HOME_PATH;
  }

  let url: URL;

  try {
    url = new URL(value, "http://cms.local");
  } catch {
    return CMS_HOME_PATH;
  }

  const isCmsPath = url.pathname === CMS_ROOT_PATH || url.pathname.startsWith(`${CMS_ROOT_PATH}/`);
  const isLoginPath =
    url.pathname === CMS_LOGIN_PATH || url.pathname.startsWith(`${CMS_LOGIN_PATH}/`);

  if (!isCmsPath || isLoginPath) {
    return CMS_HOME_PATH;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
