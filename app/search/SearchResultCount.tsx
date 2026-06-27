"use client";
import { useLanguage } from "@/app/components/LanguageContext";

export function SearchResultCount({ total }: { total: number }) {
  const { t } = useLanguage();
  if (total === 0) return <>{t("search_no_results")}</>;
  return <>{total} {total === 1 ? t("search_result_one") : t("search_results_many")}</>;
}
