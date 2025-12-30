import { useCallback, useMemo, useRef, useState } from "react";

type EntityType = "work_item" | "approved_content" | "saved_section" | "company";

interface UseContentGenerationOptions {
  onContentApplied?: () => void;
}

type OpenModalConfig = {
  gap?: any;
  entityType?: EntityType;
  entityId?: string;
  existingContent?: string;
  mode?: "gap-detection" | "tag-suggestion";
  content?: string;
  contentType?: 'company' | 'role' | 'saved_section';
  onApplyTags?: (tags: string[]) => void;
  onApplyContent?: (value: string) => void;
  onGenerateTags?: () => Promise<void>;
};

type OpenModalArgs =
  | [OpenModalConfig]
  | [any, EntityType?, string?, string?];

export function useContentGeneration(options: UseContentGenerationOptions = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<OpenModalConfig>({});
  const didApplyRef = useRef(false);

  const openModal = useCallback((...args: OpenModalArgs) => {
    setModalConfig((prev) => {
      if (args.length === 1 && args[0] && typeof args[0] === "object" && ("gap" in args[0] || "mode" in args[0])) {
        return {
          ...prev,
          ...args[0],
        };
      }

      const [gap, entityType, entityId, existingContent] = args as [any, EntityType?, string?, string?];
      return {
        ...prev,
        gap,
        entityType,
        entityId,
        existingContent,
      };
    });

    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    if (didApplyRef.current) {
      didApplyRef.current = false;
      options.onContentApplied?.();
    }
  }, [options]);

  const markContentApplied = useCallback(() => {
    didApplyRef.current = true;
  }, []);

  const openGapModal = useCallback(
    (gap: any, entityType?: EntityType, entityId?: string, existingContent?: string) => {
      openModal(gap, entityType, entityId, existingContent);
    },
    [openModal]
  );

  const modalProps = useMemo(() => modalConfig, [modalConfig]);

  return {
    isModalOpen,
    modalProps,
    isLoadingContext: false,
    openModal,
    closeModal,
    markContentApplied,
    openGapModal,
  };
}
