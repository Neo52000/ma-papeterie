import { useMemo } from "react";
import { usePrinterBrands, type PrinterBrand } from "./usePrinterBrands";
import { usePrinterModels, type PrinterModel } from "./usePrinterModels";

interface RouteInitResult {
  brand: PrinterBrand | null;
  model: PrinterModel | null;
  isLoading: boolean;
  notFound: boolean;
}

export function useConsumableRouteInit(
  brandSlug: string | undefined,
  modelSlug: string | undefined
): RouteInitResult {
  const { data: brands = [], isLoading: brandsLoading } = usePrinterBrands();

  const brand = useMemo(() => {
    if (!brandSlug || brands.length === 0) return null;
    return brands.find((b) => b.slug === brandSlug) ?? null;
  }, [brands, brandSlug]);

  const { data: models = [], isLoading: modelsLoading } = usePrinterModels(
    brand?.id ?? null
  );

  const model = useMemo(() => {
    if (!modelSlug || models.length === 0) return null;
    return models.find((m) => m.slug === modelSlug) ?? null;
  }, [models, modelSlug]);

  const isLoading = brandsLoading || (!!brandSlug && !!brand && modelsLoading);

  const notFound =
    (!isLoading && !!brandSlug && brands.length > 0 && !brand) ||
    (!isLoading && !!modelSlug && models.length > 0 && !model);

  return { brand, model, isLoading, notFound };
}
